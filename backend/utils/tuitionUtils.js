/**
 * Safe tuition fee parsing and normalization utility
 * Phase 8.1-D Tuition Integrity
 */

/**
 * Safely parse and validate a course tuition fee string.
 * Must be deterministic and reject ambiguous, multiple, or unparseable amounts.
 * Returns positive number or null if unknown/ambiguous.
 */
function parseCourseTuitionFee(feeString) {
  if (!feeString || typeof feeString !== 'string') return null;
  const trimmed = feeString.trim();
  if (!trimmed) return null;

  // Check if string contains multiple numbers / range (e.g. "$10,000 - $15,000" or "$10,000 / $20,000")
  const matches = trimmed.match(/\d+(?:,\d{3})*(?:\.\d{1,2})?/g);
  if (!matches || matches.length !== 1) {
    return null; // Ambiguous or multiple amounts -> unknown
  }

  // Parse numeric component
  const cleanNumberStr = matches[0].replace(/,/g, '');
  const numericVal = parseFloat(cleanNumberStr);
  if (isNaN(numericVal) || numericVal <= 0 || !isFinite(numericVal)) {
    return null;
  }

  return numericVal;
}

/**
 * Validates whether an application has an authoritative, positive tuition fee.
 */
function hasAuthoritativeTuition(application) {
  if (!application) return false;
  const fee = application.tuitionFee;
  if (fee === null || fee === undefined || fee === '') return false;
  const parsed = parseFloat(fee);
  return !isNaN(parsed) && parsed > 0 && isFinite(parsed);
}

module.exports = {
  parseCourseTuitionFee,
  hasAuthoritativeTuition
};
