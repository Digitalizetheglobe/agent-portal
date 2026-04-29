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

    // For agents, check if they're assigned to the event before showing all students
    if (req.user.role === 'agent' && eventId) {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          detail: 'Event not found'
        });
      }
      
      // Check if agent is assigned to this event
      const hasAccess = event.assignedAgents.some(
        id => id.toString() === req.user._id.toString()
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          detail: 'Not assigned to this event'
        });
      }
      
      // Agent can see all students for this event (shared capacity)
      // Don't filter by agentId when eventId is provided and agent has access
    } else if (req.user.role === 'agent') {
      // If no eventId specified, agents can only see their own students
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
    const { eventId, agentId, customFields, name, email, phone, country, education, courseInterested, notes } = req.body;

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

    // Check if event has capacity limit
    if (event.seatCapacity && event.seatCapacity > 0) {
      // Count current students for this event (all agents combined)
      const currentStudentCount = await Student.countDocuments({ eventId });
      
      if (currentStudentCount >= event.seatCapacity) {
        return res.status(400).json({
          success: false,
          detail: `Event capacity is full. Maximum ${event.seatCapacity} students allowed.`
        });
      }
    }

    // Determine the agent ID
    let assignedAgentId = agentId;
    if (!assignedAgentId) {
      // If no agentId provided (e.g., admin creating student), assign to first assigned agent or current user if agent
      if (req.user.role === 'agent') {
        assignedAgentId = req.user._id;
      } else if (event.assignedAgents && event.assignedAgents.length > 0) {
        assignedAgentId = event.assignedAgents[0];
      } else {
        return res.status(400).json({
          success: false,
          detail: 'No agent available for this event'
        });
      }
    }

    // Prepare student data with flexible structure
    const studentData = {
      eventId,
      agentId: assignedAgentId,
      customFields: new Map(),
      documents: []
    };

    // Add custom fields if they exist
    if (customFields && typeof customFields === 'object') {
      Object.entries(customFields).forEach(([key, value]) => {
        studentData.customFields.set(key, value);
      });
    }

    // Add any legacy fields for backward compatibility
    if (name) studentData.name = name;
    if (email) studentData.email = email.toLowerCase();
    if (phone) studentData.phone = phone;
    if (country) studentData.country = country;
    if (education) studentData.education = education;
    if (courseInterested) studentData.courseInterested = courseInterested;
    if (notes) studentData.notes = notes;

    const student = await Student.create(studentData);

    // Send confirmation email to student (if email field exists)
    const studentEmail = customFields?.email || email;
    const studentName = customFields?.name || name;
    if (studentEmail && studentName) {
      const emailTemplate = templates.studentRegistration(studentName, event.title);
      await sendEmail(studentEmail, emailTemplate.subject, emailTemplate.html);
    }

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

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
exports.updateStudent = async (req, res) => {
  try {
    const { eventId, agentId, customFields, name, email, phone, country, education, courseInterested, notes } = req.body;

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'agent' && student.agentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    // Verify event exists if eventId is being updated
    if (eventId && eventId !== student.eventId) {
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
    }

    // Update fields
    if (eventId !== undefined) student.eventId = eventId;
    if (agentId !== undefined) {
      // Only admins can change agentId
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          detail: 'Only admins can change agent assignment'
        });
      }
      student.agentId = agentId;
    }

    // Update custom fields
    if (customFields && typeof customFields === 'object') {
      // Clear existing custom fields and set new ones
      student.customFields = new Map();
      Object.entries(customFields).forEach(([key, value]) => {
        student.customFields.set(key, value);
      });
    }

    // Update legacy fields for backward compatibility
    if (name !== undefined) student.name = name;
    if (email !== undefined) student.email = email.toLowerCase();
    if (phone !== undefined) student.phone = phone;
    if (country !== undefined) student.country = country;
    if (education !== undefined) student.education = education;
    if (courseInterested !== undefined) student.courseInterested = courseInterested;
    if (notes !== undefined) student.notes = notes;

    await student.save();

    res.status(200).json(student.toJSON());
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin only)
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    // Only admins can delete students
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        detail: 'Access denied. Only admins can delete students.'
      });
    }

    // Delete associated documents from storage
    if (student.documents && student.documents.length > 0) {
      const { deleteObject } = require('../utils/storage');
      for (const doc of student.documents) {
        try {
          await deleteObject(doc.storagePath);
        } catch (error) {
          console.error(`Failed to delete document ${doc.id}:`, error);
        }
      }
    }

    await Student.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
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
