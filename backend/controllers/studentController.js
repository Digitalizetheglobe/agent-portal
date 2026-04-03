const Student = require('../models/Student');
const Event = require('../models/Event');
const { sendEmail, templates } = require('../utils/email');
const { putObject, getObject, generateStoragePath } = require('../utils/storage');
const { v4: uuidv4 } = require('uuid');

// @desc    Get all students
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const { eventId, agentId } = req.query;
    let query = {};

    if (eventId) query.eventId = eventId;
    if (agentId) query.agentId = agentId;

    // Agents can only see their own students
    if (req.user.role === 'agent') {
      query.agentId = req.user._id;
    }

    const students = await Student.find(query).sort({ createdAt: -1 });
    res.status(200).json(students.map(student => student.toJSON()));
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    // Agents can only see their own students
    if (req.user.role === 'agent' && student.agentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    res.status(200).json(student.toJSON());
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Create student
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
  try {
    const { name, email, phone, country, education, courseInterested, notes, eventId, agentId } = req.body;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        detail: 'Event not found'
      });
    }

    // Check if agent has access to this event
    if (req.user.role === 'agent') {
      const hasAccess = event.assignedAgents.some(
        id => id.toString() === req.user._id.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          detail: 'Not assigned to this event'
        });
      }
    }

    const student = await Student.create({
      name,
      email: email.toLowerCase(),
      phone,
      country,
      education,
      courseInterested,
      notes: notes || '',
      eventId,
      agentId,
      documents: []
    });

    // Send confirmation email to student
    const emailTemplate = templates.studentRegistration(name, event.title);
    await sendEmail(email, emailTemplate.subject, emailTemplate.html);

    res.status(201).json(student.toJSON());
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Upload document for student
// @route   POST /api/students/:id/documents
// @access  Private
exports.uploadDocument = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    // Check access
    if (req.user.role === 'agent' && student.agentId.toString() !== req.user._id.toString()) {
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

    // Generate storage path
    const storagePath = generateStoragePath(`students/${req.params.id}`, req.file.originalname);

    // Upload to storage
    const result = await putObject(storagePath, req.file.buffer, req.file.mimetype);

    // Create document record
    const docRecord = {
      id: uuidv4(),
      storagePath: result.path,
      originalFilename: req.file.originalname,
      contentType: req.file.mimetype,
      size: result.size || req.file.size,
      uploadedAt: new Date()
    };

    // Add to student's documents
    student.documents.push(docRecord);
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

// @desc    Download document
// @route   GET /api/students/:id/documents/:docId
// @access  Private
exports.downloadDocument = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    // Check access
    if (req.user.role === 'agent' && student.agentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    // Find document
    const doc = student.documents.find(d => d.id === req.params.docId);

    if (!doc) {
      return res.status(404).json({
        success: false,
        detail: 'Document not found'
      });
    }

    // Download from storage
    const { data, contentType } = await getObject(doc.storagePath);

    res.setHeader('Content-Type', doc.contentType || contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalFilename}"`);
    res.send(Buffer.from(data));
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};
