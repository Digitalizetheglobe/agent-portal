const importService = require('../services/importService');

// @desc    Import universities from a spreadsheet (a batch of rows; dryRun only checks)
// @route   POST /api/imports/universities
// @access  Private (Super Admin, Head of Admission)
exports.importUniversities = async (req, res) => {
  try {
    const { rows, dryRun } = req.body || {};
    res.status(200).json(await importService.importUniversities(rows, { dryRun: dryRun === true }));
  } catch (error) {
    console.error('Import universities error:', error);
    res.status(error.statusCode || 500).json({ success: false, detail: error.message || 'Server error' });
  }
};

// @desc    Import programs (courses) from a spreadsheet
// @route   POST /api/imports/programs
// @access  Private (Super Admin, Head of Admission)
exports.importPrograms = async (req, res) => {
  try {
    const { rows, dryRun } = req.body || {};
    res.status(200).json(await importService.importPrograms(rows, { dryRun: dryRun === true }));
  } catch (error) {
    console.error('Import programs error:', error);
    res.status(error.statusCode || 500).json({ success: false, detail: error.message || 'Server error' });
  }
};
