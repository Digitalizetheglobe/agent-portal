const visaPipelineService = require('../services/visaPipelineService');

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

// @desc    Move an application to the next (or previous) visa pipeline stage
// @route   PATCH /api/applications/:id/pipeline
// @access  Private (Head of Admission, super admin)
exports.updateStage = handle('Update pipeline stage', async (req, res) => {
  const application = await visaPipelineService.updateStage(req.params.id, req.body, req.user);
  res.status(200).json(application);
});

// @desc    Agent uploads proof of fee payment (at Visa 100%)
// @route   POST /api/applications/:id/fee-proof
// @access  Private (Agent)
exports.submitFeeProof = handle('Submit fee proof', async (req, res) => {
  const application = await visaPipelineService.submitFeeProof(req.params.id, req.file, req.body.note, req.user);
  res.status(200).json(application);
});

// @desc    Head of Admission accepts or rejects the proof of fee payment
// @route   PATCH /api/applications/:id/fee-proof/review
// @access  Private (Head of Admission, super admin)
exports.reviewFeeProof = handle('Review fee proof', async (req, res) => {
  const application = await visaPipelineService.reviewFeeProof(req.params.id, req.body, req.user);
  res.status(200).json(application);
});

// @desc    Download the proof of fee payment
// @route   GET /api/applications/:id/fee-proof/file
// @access  Private (the agent who owns it, staff)
exports.downloadFeeProof = handle('Download fee proof', async (req, res) => {
  const { data, contentType, fileName } = await visaPipelineService.getFeeProofFile(req.params.id, req.user);
  res.setHeader('Content-Type', contentType);
  const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
  res.send(Buffer.from(data));
});

// @desc    Upload the flight ticket / arrival confirmation
// @route   POST /api/applications/:id/arrival-ticket
// @access  Private (the agent who owns it, Head of Admission, super admin)
exports.submitArrivalTicket = handle('Submit arrival ticket', async (req, res) => {
  const application = await visaPipelineService.submitArrivalTicket(req.params.id, req.file, req.user);
  res.status(200).json(application);
});

// @desc    Download the flight ticket / arrival confirmation
// @route   GET /api/applications/:id/arrival-ticket/file
// @access  Private (the agent who owns it, staff)
exports.downloadArrivalTicket = handle('Download arrival ticket', async (req, res) => {
  const { data, contentType, fileName } = await visaPipelineService.getArrivalTicketFile(req.params.id, req.user);
  res.setHeader('Content-Type', contentType);
  const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
  res.send(Buffer.from(data));
});
