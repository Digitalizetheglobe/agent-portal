const { randomUUID: uuidv4 } = require('crypto');
const { Application, Student, University, User } = require('../models');
const { putObject, getObject, generateStoragePath } = require('../utils/storage');
const { assertCanAccessAgent } = require('../utils/agentScope');
const {
  STAGES,
  STAGE_LABELS,
  INACTIVE_APPLICATION_STATUSES
} = require('../utils/visaPipeline');
const admissionTrackingService = require('./admissionTrackingService');
const { createNotification } = require('../controllers/notificationController');

// The Head of Admission (and super admin) moves a student through the visa pipeline and checks the
// proof of fee payment. Agents upload the proof and watch the progress.
//
//   Application -> Visa 15% -> Visa 35% -> Visa 70% -> Arrival -> Registration -> Visa 100%
//   at Visa 100%: agent uploads proof -> Head of Admission accepts (Fees paid) or rejects
//   Visa 100% + fees accepted = the agent can raise the commission invoice

const fail = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const requireHeadOfAdmission = (user) => {
  const allowed = user.role === 'admin' && (!user.staffRole || user.staffRole === 'head_admission');
  if (!allowed) throw fail(403, 'Only the Head of Admission can do this.');
};

const standardIncludes = [
  { model: Student, as: 'student', attributes: ['id', 'name', 'email', 'verificationStatus'] },
  { model: University, as: 'university', attributes: ['id', 'name', 'code'] },
  { model: User, as: 'agent', attributes: ['id', 'name', 'email', 'agencyName'] }
];

const labelFor = (application) =>
  `${application.applicationNumber}${application.student?.name ? ` (${application.student.name})` : ''}`;

const addHistory = (application, entry) => {
  const history = Array.isArray(application.history) ? [...application.history] : [];
  history.push({ ...entry, changedAt: new Date().toISOString() });
  application.history = history;
};

class VisaPipelineService {
  async _load(id, currentUser) {
    const application = await Application.findByPk(id, { include: standardIncludes });
    if (!application) throw fail(404, 'Application not found');
    if (currentUser.role === 'agent' && application.agentId.toString() !== currentUser.id.toString()) {
      throw fail(403, 'Access denied. You do not own this application.');
    }
    await assertCanAccessAgent(currentUser, application.agentId);
    return application;
  }

  async _reload(id) {
    const application = await Application.findByPk(id, { include: standardIncludes });
    return application.toJSON();
  }

  async _notifyAgent(application, title, message, type = 'info') {
    await createNotification({
      recipient: application.agentId,
      title,
      message,
      type,
      relatedId: application.id,
      relatedModel: 'Application'
    });
  }

  /**
   * Move an application one stage forward, or one stage back (with a reason).
   */
  async updateStage(id, { stage, remarks, arrivalPerson, arrivalDate } = {}, currentUser) {
    requireHeadOfAdmission(currentUser);

    if (!STAGES.includes(stage)) {
      throw fail(400, `Invalid stage. Allowed values: ${STAGES.join(', ')}`);
    }

    const application = await this._load(id, currentUser);

    if (INACTIVE_APPLICATION_STATUSES.includes(application.status)) {
      throw fail(400, `An application that is ${application.status} cannot move through the visa pipeline.`);
    }
    if (application.isInvoiced) {
      throw fail(400, 'This application has already been invoiced, so its stage can no longer change.');
    }
    // The pipeline starts once QStudy has started reviewing the application
    if (application.status === 'Submitted' && application.pipelineStage === 'Application') {
      throw fail(400, 'Start the application review before moving the student to the visa pipeline.');
    }

    const from = application.pipelineStage;
    const fromIndex = STAGES.indexOf(from);
    const toIndex = STAGES.indexOf(stage);
    const note = typeof remarks === 'string' ? remarks.trim() : '';

    if (toIndex === fromIndex) throw fail(400, `The application is already at ${STAGE_LABELS[from]}.`);
    if (toIndex > fromIndex + 1) {
      throw fail(400, `Stages cannot be skipped. The next stage after ${STAGE_LABELS[from]} is ${STAGE_LABELS[STAGES[fromIndex + 1]]}.`);
    }
    if (toIndex < fromIndex - 1) {
      throw fail(400, `An application can only move back one stage at a time (to ${STAGE_LABELS[STAGES[fromIndex - 1]]}).`);
    }
    const movingBack = toIndex < fromIndex;
    if (movingBack && !note) throw fail(400, 'Please give a reason for moving the application back.');

    if (stage === 'Arrival' && !movingBack) {
      // Reuse the saved details when the student comes back to Arrival after a step back
      const person = (typeof arrivalPerson === 'string' && arrivalPerson.trim()) || application.arrivalPerson || '';
      if (!person) throw fail(400, 'Who is arriving is required for the Arrival stage.');
      const date = arrivalDate
        ? new Date(arrivalDate)
        : (application.arrivalDate ? new Date(application.arrivalDate) : null);
      if (!date || isNaN(date.getTime())) throw fail(400, 'A valid arrival date is required for the Arrival stage.');
      application.arrivalPerson = person;
      application.arrivalDate = date.toISOString().slice(0, 10);
    }

    application.pipelineStage = stage;
    application.pipelineUpdatedAt = new Date();
    addHistory(application, {
      action: 'PIPELINE_STAGE_CHANGED',
      from,
      to: stage,
      notes: note || `Moved from ${STAGE_LABELS[from]} to ${STAGE_LABELS[stage]}`,
      changedBy: currentUser.id
    });

    // Leaving or reaching Visa 100% changes whether the agent can invoice
    await admissionTrackingService.deriveInvoiceEligibility(application);
    await application.save();

    const atVisa100 = stage === 'Visa100';
    await this._notifyAgent(
      application,
      `Student moved to ${STAGE_LABELS[stage]}`,
      atVisa100
        ? `${labelFor(application)} reached Visa 100%. Please upload the proof of fee payment so you can raise your commission invoice.`
        : `${labelFor(application)} is now at ${STAGE_LABELS[stage]}.${movingBack && note ? ` Reason: ${note}` : ''}`,
      movingBack ? 'warning' : 'info'
    );

    return await this._reload(application.id);
  }

  /**
   * The agent uploads proof that the student's fees were paid (only once Visa 100% is reached).
   */
  async submitFeeProof(id, file, note, currentUser) {
    if (currentUser.role !== 'agent') throw fail(403, 'Only the agent can upload the proof of fee payment.');
    if (!file) throw fail(400, 'Please upload the proof of payment.');

    const application = await this._load(id, currentUser);

    if (application.pipelineStage !== 'Visa100') {
      throw fail(400, 'Proof of fee payment can be uploaded once the student reaches Visa 100%.');
    }
    if (application.feeStatus === 'Accepted') throw fail(400, 'The fee payment has already been accepted.');
    if (application.isInvoiced) throw fail(400, 'This application has already been invoiced.');

    const path = generateStoragePath(`applications/${application.id}/fee-proof`, file.originalname);
    const result = await putObject(path, file.buffer, file.mimetype);

    application.feeProof = {
      id: uuidv4(),
      fileUrl: result.path,
      fileName: file.originalname,
      contentType: file.mimetype,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.id,
      note: typeof note === 'string' && note.trim() ? note.trim() : null
    };
    application.feeStatus = 'ProofSubmitted';
    application.feeReviewedBy = null;
    application.feeReviewedAt = null;
    application.feeRemarks = null;
    addHistory(application, {
      action: 'FEE_PROOF_SUBMITTED',
      notes: `Proof of fee payment uploaded: ${file.originalname}`,
      changedBy: currentUser.id
    });
    await application.save();

    const heads = await User.findAll({
      where: { role: 'admin', status: 'active', staffRole: 'head_admission' },
      attributes: ['id']
    });
    await Promise.all(heads.map(head => createNotification({
      recipient: head.id,
      title: 'Proof of fee payment received',
      message: `${currentUser.name} uploaded proof of fee payment for ${labelFor(application)}. Please check the payment and accept or reject it.`,
      type: 'info',
      relatedId: application.id,
      relatedModel: 'Application'
    })));

    return await this._reload(application.id);
  }

  /**
   * The Head of Admission checks the payment was received and accepts or rejects the proof.
   */
  async reviewFeeProof(id, { decision, remarks } = {}, currentUser) {
    requireHeadOfAdmission(currentUser);
    if (!['accept', 'reject'].includes(decision)) throw fail(400, "Decision must be 'accept' or 'reject'.");

    const application = await this._load(id, currentUser);
    if (application.feeStatus !== 'ProofSubmitted') {
      throw fail(400, 'There is no proof of payment waiting for review on this application.');
    }
    if (application.isInvoiced) throw fail(400, 'This application has already been invoiced.');

    const note = typeof remarks === 'string' ? remarks.trim() : '';
    if (decision === 'reject' && !note) throw fail(400, 'Please give a reason for rejecting the proof of payment.');

    application.feeStatus = decision === 'accept' ? 'Accepted' : 'Rejected';
    application.feeReviewedBy = currentUser.id;
    application.feeReviewedAt = new Date();
    application.feeRemarks = note || null;
    addHistory(application, {
      action: decision === 'accept' ? 'FEE_PAYMENT_ACCEPTED' : 'FEE_PAYMENT_REJECTED',
      notes: note || (decision === 'accept' ? 'Fee payment confirmed received' : ''),
      changedBy: currentUser.id
    });

    // Fees accepted at Visa 100% makes the application invoice-eligible
    await admissionTrackingService.deriveInvoiceEligibility(application);
    await application.save();

    if (decision === 'accept') {
      await this._notifyAgent(
        application,
        'Fees confirmed',
        `Fee payment for ${labelFor(application)} is confirmed. You can now raise your commission invoice.`,
        'success'
      );
    } else {
      await this._notifyAgent(
        application,
        'Proof of payment rejected',
        `The proof of fee payment for ${labelFor(application)} was rejected: ${note} Please upload a new proof.`,
        'warning'
      );
    }

    return await this._reload(application.id);
  }

  /**
   * File of the proof of payment, for the agent who owns the application and for staff.
   */
  async getFeeProofFile(id, currentUser) {
    const application = await this._load(id, currentUser);
    const proof = application.feeProof;
    if (!proof || !proof.fileUrl) throw fail(404, 'No proof of payment has been uploaded.');
    const { data, contentType } = await getObject(proof.fileUrl);
    return { data, contentType: contentType || proof.contentType, fileName: proof.fileName };
  }
}

module.exports = new VisaPipelineService();
