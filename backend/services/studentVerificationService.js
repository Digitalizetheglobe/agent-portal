const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Student, User, Application, Event } = require('../models');

const VERIFICATION_STATUSES = ['Pending', 'UnderReview', 'Verified', 'Rejected'];
// No documents are mandatory unless an event's checklist marks them so
const DEFAULT_REQUIRED_CATEGORIES = [];
const ALLOWED_TRANSITIONS = {
  Pending:     ['UnderReview'],
  UnderReview: ['Verified', 'Rejected'],
  Verified:    [],
  Rejected:    ['Pending']
};

const verificationIncludes = [
  { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'agencyName', 'phone'] },
  { model: User, as: 'verifier', attributes: ['id', 'name', 'email'], required: false }
];

const buildHistoryEntry = (action, from, to, reason, adminId) => ({
  action, from, to,
  reason: reason || null,
  changedBy: adminId,
  changedAt: new Date().toISOString()
});

const enforceOwnership = (student, currentUser) => {
  if (currentUser.role === 'agent' && student.agentId.toString() !== currentUser.id.toString()) {
    const err = new Error('Access denied'); err.statusCode = 403; throw err;
  }
};

const requireAdmin = (currentUser) => {
  if (currentUser.role !== 'admin') {
    const err = new Error('Admin access required'); err.statusCode = 403; throw err;
  }
};

const formatVerification = (student) => {
  const s = student.toJSON ? student.toJSON() : { ...student };
  return {
    id: s.id, _id: s.id, name: s.name, email: s.email, phone: s.phone, country: s.country,
    agentId: s.agent || s.agentId,
    verificationStatus: s.verificationStatus,
    verifiedAt: s.verifiedAt,
    verifiedBy: s.verifier || s.verifiedBy,
    verificationRejectionReason: s.verificationRejectionReason,
    verificationHistory: Array.isArray(s.verificationHistory) ? s.verificationHistory : [],
    documents: Array.isArray(s.documents) ? s.documents : [],
    createdAt: s.createdAt, updatedAt: s.updatedAt
  };
};

// Option B (verification only after enrollment) is off by default. Set
// VERIFICATION_REQUIRES_ENROLLMENT=true in the backend env to enforce it.
const VERIFICATION_REQUIRES_ENROLLMENT = process.env.VERIFICATION_REQUIRES_ENROLLMENT === 'true';

/**
 * Student verification happens after enrollment. A student is ready when at least one of their
 * applications is Enrolled with a confirmed admission, an enrollment date and a verified deposit.
 */
const getEnrollmentReadiness = async (studentId, transaction = null) => {
  const enrolled = await Application.findAll({
    where: { studentId, status: 'Enrolled' },
    attributes: ['id', 'applicationNumber', 'courseName', 'status', 'admissionDate', 'enrollmentDate', 'depositStatus'],
    transaction
  });

  const checked = enrolled.map(app => {
    const missing = [];
    if (!app.admissionDate) missing.push('admission confirmation');
    if (!app.enrollmentDate) missing.push('enrollment date');
    if (app.depositStatus !== 'Verified') missing.push('verified deposit');
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      courseName: app.courseName,
      depositStatus: app.depositStatus,
      missing
    };
  });

  const ready = checked.some(a => a.missing.length === 0);
  const blockers = [];
  if (enrolled.length === 0) {
    blockers.push('The student has no enrolled application yet.');
  } else if (!ready) {
    checked.forEach(a => blockers.push(`Application ${a.applicationNumber} is missing: ${a.missing.join(', ')}.`));
  }

  return { ready, enforced: VERIFICATION_REQUIRES_ENROLLMENT, enrolledApplications: checked, blockers };
};

const assertReadyForVerification = async (studentId, transaction = null) => {
  const readiness = await getEnrollmentReadiness(studentId, transaction);
  if (VERIFICATION_REQUIRES_ENROLLMENT && !readiness.ready) {
    const err = new Error(
      `Student verification starts after enrollment. ${readiness.blockers.join(' ')} ` +
      'Enroll the student (with a verified deposit) first.'
    );
    err.statusCode = 400;
    throw err;
  }
  return readiness;
};

class StudentVerificationService {

  async getVerificationQueue(query, currentUser) {
    requireAdmin(currentUser);
    const { status, search, page = 1, limit = 20 } = query || {};
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (parsedPage - 1) * parsedLimit;
    const where = {};
    if (status) {
      if (!VERIFICATION_STATUSES.includes(status)) {
        const err = new Error('Invalid status. Allowed: ' + VERIFICATION_STATUSES.join(', '));
        err.statusCode = 400; throw err;
      }
      where.verificationStatus = status;
    }
    if (search && search.trim()) {
      const term = '%' + search.trim() + '%';
      where[Op.or] = [
        { name: { [Op.iLike]: term } }, { email: { [Op.iLike]: term } },
        { phone: { [Op.iLike]: term } }, { country: { [Op.iLike]: term } }
      ];
    }
    const { count, rows } = await Student.findAndCountAll({
      where, include: verificationIncludes,
      order: [['updatedAt', 'DESC']], limit: parsedLimit, offset, distinct: true
    });
    const readyApps = rows.length === 0 ? [] : await Application.findAll({
      where: {
        studentId: { [Op.in]: rows.map(r => r.id) },
        status: 'Enrolled',
        depositStatus: 'Verified',
        admissionDate: { [Op.ne]: null },
        enrollmentDate: { [Op.ne]: null }
      },
      attributes: ['studentId']
    });
    const readyIds = new Set(readyApps.map(a => String(a.studentId)));
    return { total: count, page: parsedPage, limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit) || 1,
      students: rows.map(r => ({
        ...formatVerification(r),
        readyForVerification: !VERIFICATION_REQUIRES_ENROLLMENT || readyIds.has(String(r.id))
      })) };
  }

  async getVerificationDetail(studentId, currentUser) {
    const student = await Student.findByPk(studentId, { include: verificationIncludes });
    if (!student) { const err = new Error('Student not found'); err.statusCode = 404; throw err; }
    enforceOwnership(student, currentUser);
    const readiness = await getEnrollmentReadiness(student.id);
    return { ...formatVerification(student), readiness };
  }

  async _transition(studentId, to, extra, historyEntry, currentUser, t) {
    const student = await Student.findByPk(studentId, {
      lock: t.LOCK.UPDATE,
      transaction: t
      // No includes here: FOR UPDATE is incompatible with nullable outer joins in PostgreSQL
    });
    if (!student) { const err = new Error('Student not found'); err.statusCode = 404; throw err; }
    const from = student.verificationStatus;
    if (!ALLOWED_TRANSITIONS[from] || !ALLOWED_TRANSITIONS[from].includes(to)) {
      const err = new Error(
        'Invalid transition: ' + from + ' -> ' + to + '. Allowed from ' + from + ': [' + ((ALLOWED_TRANSITIONS[from] || []).join(', ') || 'none') + ']'
      );
      err.statusCode = 400; throw err;
    }
    const history = Array.isArray(student.verificationHistory) ? [...student.verificationHistory] : [];
    history.push(historyEntry(from));
    await student.update({ verificationStatus: to, verificationHistory: history, ...extra }, { transaction: t });
  }

  async initiateVerification(studentId, currentUser) {
    requireAdmin(currentUser);
    await assertReadyForVerification(studentId);
    const t = await sequelize.transaction();
    try {
      await this._transition(studentId, 'UnderReview', {},
        (from) => buildHistoryEntry('VERIFICATION_STARTED', from, 'UnderReview', null, currentUser.id),
        currentUser, t);
      await t.commit();
      return await this.getVerificationDetail(studentId, currentUser);
    } catch (err) { try { await t.rollback(); } catch (_) {} throw err; }
  }

  async verifyStudent(studentId, currentUser) {
    requireAdmin(currentUser);
    const t = await sequelize.transaction();
    try {
      const student = await Student.findByPk(studentId, {
        lock: t.LOCK.UPDATE,
        transaction: t
      });
      if (!student) { const err = new Error('Student not found'); err.statusCode = 404; throw err; }

      // Verification is the final check after enrollment: admission, verified deposit and enrollment must hold
      await assertReadyForVerification(studentId, t);

      // ─── Phase 8.1-C: Authoritative Document Checklist & Approval Gate ───────
      const docs = Array.isArray(student.documents) ? student.documents : [];

      // 1. Determine authoritative required document checklist from Event if student is event-linked
      // Without an event checklist nothing is mandatory; the admin can still request documents from the agent
      let requiredCategories = DEFAULT_REQUIRED_CATEGORIES;
      if (student.eventId) {
        const event = await Event.findByPk(student.eventId, { transaction: t });
        if (event && Array.isArray(event.requiredDocuments) && event.requiredDocuments.length > 0) {
          requiredCategories = event.requiredDocuments
            .filter(d => d.mandatory !== false)
            .map(d => (d.value || d.category || d.name || d.label || '').trim())
            .filter(Boolean);
        }
      }

      // 2. Validate mandatory categories from authoritative checklist
      if (requiredCategories.length > 0) {
        for (const cat of requiredCategories) {
          const matchingDoc = docs.find(d => (d.category || '').toLowerCase() === cat.toLowerCase());
          if (!matchingDoc) {
            const err = new Error(`Cannot verify student: Required document '${cat}' is missing.`);
            err.statusCode = 400;
            throw err;
          }
          const status = (matchingDoc.status || '').toLowerCase();
          if (status !== 'approved') {
            const err = new Error(`Cannot verify student: Required document '${cat}' is in state '${matchingDoc.status || 'Submitted'}' (must be Approved).`);
            err.statusCode = 400;
            throw err;
          }
        }
      }

      // 3. Validate that ALL submitted documents on the student are approved
      const unapprovedDocs = docs.filter(d => (d.status || '').toLowerCase() !== 'approved');
      if (unapprovedDocs.length > 0) {
        const unapprovedDetails = unapprovedDocs.map(d => `${d.category || 'Document'} (${d.status || 'Submitted'})`).join(', ');
        const err = new Error(`Cannot verify student: All submitted documents must be approved before student verification (unapproved: ${unapprovedDetails}).`);
        err.statusCode = 400;
        throw err;
      }

      const from = student.verificationStatus;
      if (!ALLOWED_TRANSITIONS[from] || !ALLOWED_TRANSITIONS[from].includes('Verified')) {
        const err = new Error(
          'Invalid transition: ' + from + ' -> Verified. Allowed from ' + from + ': [' + ((ALLOWED_TRANSITIONS[from] || []).join(', ') || 'none') + ']'
        );
        err.statusCode = 400; throw err;
      }

      const now = new Date();
      const history = Array.isArray(student.verificationHistory) ? [...student.verificationHistory] : [];
      history.push(buildHistoryEntry('VERIFICATION_APPROVED', from, 'Verified', null, currentUser.id));

      await student.update({
        verificationStatus: 'Verified',
        verifiedAt: now,
        verifiedBy: currentUser.id,
        verificationRejectionReason: null,
        verificationHistory: history
      }, { transaction: t });

      // Evaluate invoice eligibility for any enrolled applications belonging to this verified student
      const eligibleApps = await Application.findAll({
        where: {
          studentId,
          status: 'Enrolled',
          depositStatus: 'Verified',
          admissionDate: { [Op.ne]: null }
        },
        transaction: t
      });
      for (const app of eligibleApps) {
        app.isInvoiceEligible = true;
        await app.save({ transaction: t });
      }

      await t.commit();
      return await this.getVerificationDetail(studentId, currentUser);
    } catch (err) { try { await t.rollback(); } catch (_) {} throw err; }
  }

  async rejectStudent(studentId, reason, currentUser) {
    requireAdmin(currentUser);
    if (!reason || !reason.trim()) {
      const err = new Error('Rejection reason is required and cannot be empty');
      err.statusCode = 400; throw err;
    }
    const trimmedReason = reason.trim();
    const t = await sequelize.transaction();
    try {
      await this._transition(studentId, 'Rejected',
        { verifiedAt: null, verifiedBy: null, verificationRejectionReason: trimmedReason },
        (from) => buildHistoryEntry('VERIFICATION_REJECTED', from, 'Rejected', trimmedReason, currentUser.id),
        currentUser, t);

      // Invalidate invoice eligibility on non-invoiced applications belonging to this rejected student
      const invalidApps = await Application.findAll({
        where: {
          studentId,
          isInvoiceEligible: true,
          isInvoiced: false
        },
        transaction: t
      });
      for (const app of invalidApps) {
        app.isInvoiceEligible = false;
        await app.save({ transaction: t });
      }

      await t.commit();
      return await this.getVerificationDetail(studentId, currentUser);
    } catch (err) { try { await t.rollback(); } catch (_) {} throw err; }
  }

  async getVerificationHistory(studentId, currentUser) {
    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'agentId', 'verificationHistory']
    });
    if (!student) { const err = new Error('Student not found'); err.statusCode = 404; throw err; }
    enforceOwnership(student, currentUser);
    const history = Array.isArray(student.verificationHistory) ? student.verificationHistory : [];
    return { studentId: student.id, history, total: history.length };
  }
}

module.exports = new StudentVerificationService();
