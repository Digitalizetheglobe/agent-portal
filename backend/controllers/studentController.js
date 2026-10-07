const { Op } = require('sequelize');
const { Student, Event, User } = require('../models');
const { sendEmail, templates } = require('../utils/email');
const { putObject, getObject, deleteObject, generateStoragePath } = require('../utils/storage');
const { v4: uuidv4 } = require('uuid');
const { createNotification } = require('./notificationController');
const studentService = require('../services/studentService');

// @desc    Get all students (with search, filter, pagination)
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const result = await studentService.getStudents(req.query, req.user);

    // Set pagination headers
    res.setHeader('X-Total-Count', result.total);
    res.setHeader('X-Page', result.page);
    res.setHeader('X-Total-Pages', result.totalPages);
    res.setHeader('X-Limit', result.limit);

    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }

    res.status(200).json(result.students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get single student by ID
// @route   GET /api/students/:id
// @access  Private
exports.getStudent = async (req, res) => {
  try {
    const student = await studentService.getStudentById(req.params.id, req.user);
    res.status(200).json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Create student
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
  try {
    const student = await studentService.createStudent(req.body, req.user);
    res.status(201).json(student);
  } catch (error) {
    console.error('Create student error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Upload or resubmit document for student
// @route   POST /api/students/:id/documents
// @route   POST /api/students/:id/documents/:docId/resubmit
// @access  Private
exports.uploadDocument = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    // Check access: Agents can only upload to their own student
    if (req.user.role === 'agent' && student.agentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        detail: 'No file uploaded'
      });
    }

    const category = req.body.category || 'Other';
    const targetDocId = req.params.docId || req.body.documentId;

    // Generate storage path
    const storagePath = generateStoragePath(`students/${req.params.id}`, req.file.originalname);

    // Upload to storage
    const result = await putObject(storagePath, req.file.buffer, req.file.mimetype);

    const docs = Array.isArray(student.documents) ? [...student.documents] : [];
    const nowIso = new Date().toISOString();

    // Check if updating/resubmitting an existing document
    let existingIndex = -1;
    if (targetDocId) {
      existingIndex = docs.findIndex(d => d.id === targetDocId || d._id === targetDocId);
    } else {
      existingIndex = docs.findIndex(d => (d.category || '').toLowerCase() === category.toLowerCase());
    }

    if (existingIndex !== -1) {
      const existingDoc = docs[existingIndex];
      const existingStatus = (existingDoc.status || '').toLowerCase();

      // Guard: An already Approved document cannot be replaced by an agent
      if (existingStatus === 'approved') {
        if (req.user.role === 'agent') {
          return res.status(400).json({
            success: false,
            detail: `Document for category '${existingDoc.category || category}' has already been approved and cannot be replaced.`
          });
        }
      }

      // Resubmission flow (CorrectionRequired -> Submitted, or replacing an unapproved submission)
      const prevStatus = existingDoc.status;
      const isResubmit = existingStatus === 'correctionrequired' || existingStatus === 'correction_required';
      const history = Array.isArray(existingDoc.history) ? [...existingDoc.history] : [];
      history.push({
        action: isResubmit ? 'Resubmitted' : 'FileReplaced',
        from: prevStatus,
        to: 'Submitted',
        remarks: isResubmit ? `Resubmitted by ${req.user.role}` : 'Updated document file',
        by: req.user.id,
        at: nowIso
      });

      docs[existingIndex] = {
        ...existingDoc,
        storagePath: result.path,
        originalFilename: req.file.originalname,
        contentType: req.file.mimetype,
        size: result.size || req.file.size,
        status: 'Submitted', // NEVER automatically approved
        uploadedAt: nowIso,
        uploadedBy: req.user.id,
        history
      };

      student.documents = docs;
      await student.save();

      return res.status(200).json(docs[existingIndex]);
    }

    // New document submission
    const docId = uuidv4();
    const docRecord = {
      id: docId,
      _id: docId,
      storagePath: result.path,
      originalFilename: req.file.originalname,
      contentType: req.file.mimetype,
      size: result.size || req.file.size,
      category: category,
      status: 'Submitted',
      uploadedAt: nowIso,
      uploadedBy: req.user.id,
      history: [{
        action: 'Submitted',
        from: null,
        to: 'Submitted',
        remarks: 'Initial upload',
        by: req.user.id,
        at: nowIso
      }]
    };

    docs.push(docRecord);
    student.documents = docs;
    await student.save();

    res.status(201).json(docRecord);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
exports.updateStudent = async (req, res) => {
  try {
    const student = await studentService.updateStudent(req.params.id, req.body, req.user);
    res.status(200).json(student);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private
exports.deleteStudent = async (req, res) => {
  try {
    const result = await studentService.deleteStudent(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Get applications for a student
// @route   GET /api/students/:id/applications
// @access  Private (Admin & Agent; Agent only sees own)
exports.getStudentApplications = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.params.id;
    const result = await studentService.getStudentApplications(studentId, req.query, req.user);

    // Set pagination headers
    res.setHeader('X-Total-Count', result.total);
    res.setHeader('X-Page', result.page);
    res.setHeader('X-Total-Pages', result.totalPages);
    res.setHeader('X-Limit', result.limit);

    if (req.query.envelope === 'true' || req.query.format === 'envelope') {
      return res.status(200).json(result);
    }

    res.status(200).json(result.applications);
  } catch (error) {
    console.error('Get student applications error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Download document
// @route   GET /api/students/:id/documents/:docId
// @access  Private
exports.downloadDocument = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    if (req.user.role === 'agent' && student.agentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    const docs = Array.isArray(student.documents) ? student.documents : [];
    const doc = docs.find(d => d.id === req.params.docId || d._id === req.params.docId);

    if (!doc) {
      return res.status(404).json({
        success: false,
        detail: 'Document not found'
      });
    }

    const { data, contentType } = await getObject(doc.storagePath);

    res.setHeader('Content-Type', doc.contentType || contentType);
    const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${doc.originalFilename}"`);
    res.send(Buffer.from(data));
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Update student status
// @route   PATCH /api/students/:id/status
// @access  Private
exports.updateStudentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Registered', 'Contacted', 'Confirmed', 'Attended', 'Converted'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        detail: 'Invalid status provided'
      });
    }

    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    if (req.user.role === 'agent' && student.agentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    student.status = status;
    await student.save();

    // Create notification for agent
    await createNotification({
      recipient: student.agentId,
      title: 'Student Status Updated',
      message: `The status of ${student.name || 'your student'} has been updated to ${status}.`,
      type: 'info',
      relatedId: student.id,
      relatedModel: 'Student'
    });

    res.status(200).json(student.toJSON());
  } catch (error) {
    console.error('Update student status error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Verify or review student document
// @route   PATCH /api/students/:id/documents/:docId/verify
// @route   PATCH /api/students/:id/documents/:docId/review
// @access  Private (Admin only)
exports.verifyStudentDocument = async (req, res) => {
  try {
    const { status, action, remarks } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        detail: 'Only admins can review or verify documents'
      });
    }

    // Normalize status / action to canonical lifecycle states
    const raw = (action || status || '').toString().trim().toLowerCase();
    let canonicalStatus = null;

    if (raw === 'approved' || raw === 'approve') {
      canonicalStatus = 'Approved';
    } else if (raw === 'under_review' || raw === 'underreview' || raw === 'review') {
      canonicalStatus = 'UnderReview';
    } else if (raw === 'correction_required' || raw === 'correctionrequired' || raw === 'correction') {
      canonicalStatus = 'CorrectionRequired';
    } else if (raw === 'rejected' || raw === 'reject') {
      canonicalStatus = 'Rejected';
    } else {
      return res.status(400).json({
        success: false,
        detail: 'Invalid document status/action. Allowed values: approve (Approved), under_review (UnderReview), correction_required (CorrectionRequired), reject (Rejected)'
      });
    }

    // Remarks required when requesting correction or rejecting
    if ((canonicalStatus === 'CorrectionRequired' || canonicalStatus === 'Rejected') && (!remarks || !remarks.trim())) {
      return res.status(400).json({
        success: false,
        detail: `Remarks are required when marking a document as ${canonicalStatus}`
      });
    }

    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    const docs = Array.isArray(student.documents) ? [...student.documents] : [];
    const docIndex = docs.findIndex(d => d.id === req.params.docId || d._id === req.params.docId);
    if (docIndex === -1) {
      return res.status(404).json({
        success: false,
        detail: 'Document not found'
      });
    }

    const prevDoc = docs[docIndex];
    const prevStatus = prevDoc.status;
    const nowIso = new Date().toISOString();

    const history = Array.isArray(prevDoc.history) ? [...prevDoc.history] : [];
    history.push({
      action: canonicalStatus,
      from: prevStatus,
      to: canonicalStatus,
      remarks: remarks ? remarks.trim() : null,
      by: req.user.id,
      at: nowIso
    });

    // Update document with canonical status, reviewer identity, timestamp, remarks, and history
    docs[docIndex] = {
      ...prevDoc,
      status: canonicalStatus,
      verifiedBy: req.user.id,
      reviewedBy: req.user.id,
      verifiedAt: nowIso,
      reviewedAt: nowIso,
      remarks: remarks !== undefined ? (remarks.trim ? remarks.trim() : remarks) : prevDoc.remarks,
      history
    };

    student.documents = docs;
    await student.save();

    // Notify agent
    const notifTitle = canonicalStatus === 'Approved' ? 'Document Approved' :
      canonicalStatus === 'CorrectionRequired' ? 'Document Correction Required' :
        canonicalStatus === 'Rejected' ? 'Document Rejected' : 'Document Under Review';
    const notifType = canonicalStatus === 'Approved' ? 'success' :
      canonicalStatus === 'UnderReview' ? 'info' : 'warning';

    await createNotification({
      recipient: student.agentId,
      title: notifTitle,
      message: `The ${docs[docIndex].category} document for ${student.name || 'your student'} has been marked as ${canonicalStatus}.${remarks ? ' Reason: ' + remarks.trim() : ''}`,
      type: notifType,
      relatedId: student.id,
      relatedModel: 'Student'
    });

    res.status(200).json(student.toJSON());
  } catch (error) {
    console.error('Verify student document error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};


// @desc    Request missing document
// @route   POST /api/students/:id/documents/request
// @access  Private (Admin only)
exports.requestDocument = async (req, res) => {
  try {
    const { category, label } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        detail: 'Only admins can request documents'
      });
    }

    if (!category || !String(category).trim()) {
      return res.status(400).json({
        success: false,
        detail: 'Document category is required'
      });
    }

    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    const event = student.eventId ? await Event.findByPk(student.eventId) : null;
    const course = student.courseInterested || student.customFields?.courseInterested || 'N/A';
    const categoryKey = String(category).trim();
    const displayName = (label && String(label).trim()) || categoryKey;

    // Remember the request so the admin can see what is outstanding and the agent sees it too
    const requests = (Array.isArray(student.documentRequests) ? student.documentRequests : [])
      .filter(r => (r.category || '').toLowerCase() !== categoryKey.toLowerCase());
    requests.push({
      category: categoryKey,
      label: displayName,
      requestedBy: req.user.id,
      requestedAt: new Date().toISOString()
    });
    student.documentRequests = requests;
    await student.save();

    // Create notification for agent
    await createNotification({
      recipient: student.agentId,
      title: 'Action Required: Missing Document',
      message: `Admin has requested the "${displayName}" document for student "${student.name || 'N/A'}"${event ? ` registered for "${event.title}"` : ''} (Course: ${course}).`,
      type: 'warning',
      relatedId: student.id,
      relatedModel: 'Student'
    });

    res.status(200).json({
      success: true,
      message: 'Document request notification sent to agent',
      documentRequests: student.documentRequests
    });
  } catch (error) {
    console.error('Request document error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};
