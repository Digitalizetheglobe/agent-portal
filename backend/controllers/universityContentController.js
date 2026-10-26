const universityContentService = require('../services/universityContentService');

const handle = (label, action) => async (req, res) => {
  try {
    await action(req, res);
  } catch (error) {
    console.error(`${label} error:`, error);
    res.status(error.statusCode || 500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Courses of a university with tuition and the agent's commission per course
// @route   GET /api/universities/:id/courses
// @access  Private (all)
exports.getCourses = handle('Get university courses', async (req, res) => {
  res.status(200).json(await universityContentService.getCourses(req.params.id, req.user));
});

// @desc    Upload a brochure
// @route   POST /api/universities/:id/brochures
// @access  Private (Head of Admission, super admin)
exports.addBrochure = handle('Add brochure', async (req, res) => {
  const university = await universityContentService.addBrochure(req.params.id, req.file, req.body.title, req.user);
  res.status(201).json(university);
});

// @desc    Delete a brochure
// @route   DELETE /api/universities/:id/brochures/:brochureId
// @access  Private (Head of Admission, super admin)
exports.removeBrochure = handle('Remove brochure', async (req, res) => {
  res.status(200).json(await universityContentService.removeBrochure(req.params.id, req.params.brochureId, req.user));
});

// @desc    Download or view a brochure
// @route   GET /api/universities/:id/brochures/:brochureId
// @access  Private (all)
exports.downloadBrochure = handle('Download brochure', async (req, res) => {
  const { data, contentType, fileName } = await universityContentService.getBrochureFile(req.params.id, req.params.brochureId, req.user);
  res.setHeader('Content-Type', contentType);
  const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
  res.send(Buffer.from(data));
});

// @desc    News and scholarship updates of a university
// @route   GET /api/universities/:id/updates
// @access  Private (all)
exports.listUpdates = handle('List university updates', async (req, res) => {
  res.status(200).json(await universityContentService.listUpdates(req.params.id, req.user));
});

// @desc    Publish an update (agents are notified unless notifyAgents is false)
// @route   POST /api/universities/:id/updates
// @access  Private (Head of Admission, super admin)
exports.createUpdate = handle('Create university update', async (req, res) => {
  res.status(201).json(await universityContentService.createUpdate(req.params.id, req.body, req.user));
});

// @desc    Edit an update
// @route   PUT /api/universities/:id/updates/:updateId
// @access  Private (Head of Admission, super admin)
exports.updateUpdate = handle('Update university update', async (req, res) => {
  res.status(200).json(await universityContentService.updateUpdate(req.params.id, req.params.updateId, req.body, req.user));
});

// @desc    Delete an update
// @route   DELETE /api/universities/:id/updates/:updateId
// @access  Private (Head of Admission, super admin)
exports.deleteUpdate = handle('Delete university update', async (req, res) => {
  res.status(200).json(await universityContentService.deleteUpdate(req.params.id, req.params.updateId, req.user));
});
