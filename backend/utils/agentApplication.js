const { isValidCountry } = require('./countries');

// Single source of truth for the agent application form:
// which fields exist, which are mandatory, and how they are validated.
//
// required: 'always' | 'company' | 'individual' | false
const FIELDS = {
  agentType: { label: 'Agent type', required: 'always' },
  agencyName: { label: 'Company name', required: 'company' },
  businessRegistrationNumber: { label: 'Company registration number', required: 'company' },
  idNumber: { label: 'NRIC / Passport number', required: 'individual' },
  fullAddress: { label: 'Address', required: 'always' },
  country: { label: 'Country', required: 'always' },
  region: { label: 'Region', required: 'always' },
  natureOfBusiness: { label: 'Nature of business', required: 'always' },
  contactPerson: { label: 'Contact person', required: 'company' },
  contactDesignation: { label: 'Contact person designation', required: 'company' },
  signatoryName: { label: 'Authorized signatory', required: 'company' },
  signatoryDesignation: { label: 'Authorized signatory designation', required: 'company' },
  website: { label: 'Website', required: false },
  fax: { label: 'Fax no', required: false },
  isRelativeOfEmployee: { label: 'Relative of a QStudy employee', required: false },
  relativeName: { label: 'Relative name', required: false },
  // Bank details: mandatory on the QStudy form
  bankBeneficiaryName: { label: 'Beneficiary name', required: 'always' },
  bankName: { label: 'Bank name', required: 'always' },
  bankAccountNumber: { label: 'Account number', required: 'always' },
  // SWIFT code and IBAN are optional: not every bank has them
  bankSwiftCode: { label: 'SWIFT code', required: false },
  bankIban: { label: 'IBAN', required: false },
  bankAddress: { label: 'Bank address', required: 'always' }
};

// Statuses where the application is with staff, so the agent cannot change it.
const IN_REVIEW_STATUSES = ['submitted', 'under_review', 'recommended', 'verified'];

// Declaration is captured at registration only and is not editable afterwards.
const DECLARATION_FIELDS = ['declarationName', 'declarationIdNumber'];

const APPLICATION_KEYS = Object.keys(FIELDS);
const MAX_LENGTH = 255;
const LONG_FIELDS = ['natureOfBusiness', 'bankAddress', 'fullAddress'];
const MAX_LONG_LENGTH = 1000;

const clean = (v) => (typeof v === 'string' ? v.trim() : v);
const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const isRequired = (field, agentType) => {
  const r = FIELDS[field].required;
  return r === 'always' || (r && r === agentType);
};

const FORMAT_RULES = {
  bankSwiftCode: [/^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/, 'SWIFT code must be 8 or 11 letters/digits'],
  bankIban: [/^[A-Za-z]{2}[0-9]{2}[A-Za-z0-9 ]{9,32}$/, 'IBAN must start with a 2-letter country code and 2 check digits'],
  bankAccountNumber: [/^[A-Za-z0-9][A-Za-z0-9 -]{3,33}$/, 'Account number must be 4-34 characters (letters, digits, spaces, hyphens)'],
  website: [/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i, 'Website must be a valid address']
};

/**
 * Pick, trim and coerce application fields from a request body.
 * Only keys present in the body are returned.
 */
const pickApplicationFields = (body = {}) => {
  const out = {};
  for (const key of APPLICATION_KEYS) {
    if (body[key] === undefined) continue;
    if (key === 'isRelativeOfEmployee') {
      out[key] = body[key] === true || body[key] === 'true';
    } else {
      const v = clean(body[key]);
      out[key] = v === '' ? null : v;
    }
  }
  return out;
};

/**
 * Validate application fields.
 * mode 'register': every mandatory field for the agent type must be present.
 * mode 'update': only fields present in `data` are checked (mandatory ones cannot be
 *   blanked); changing agentType requires that type's mandatory fields to be set in `existing`/`data`.
 * Returns an array of error messages (empty when valid).
 */
const validateApplication = (data, { mode = 'register', existing = {} } = {}) => {
  const errors = [];
  const merged = { ...existing, ...data };
  const agentType = merged.agentType;

  if (mode === 'update' && data.agentType !== undefined && !['company', 'individual'].includes(data.agentType)) {
    errors.push('Agent type must be company or individual');
    return errors;
  }
  if (mode === 'register' && !['company', 'individual'].includes(agentType)) {
    errors.push('Agent type must be company or individual');
    return errors;
  }

  const typeChanged = mode === 'update' && data.agentType !== undefined && data.agentType !== existing.agentType;
  const keysToCheck = mode === 'register' || typeChanged ? APPLICATION_KEYS : Object.keys(data).filter(k => FIELDS[k]);

  for (const key of keysToCheck) {
    const value = merged[key];
    if (isRequired(key, agentType) && isBlank(value)) {
      errors.push(`${FIELDS[key].label} is required`);
      continue;
    }
    if (isBlank(value) || typeof value !== 'string') continue;

    const max = LONG_FIELDS.includes(key) ? MAX_LONG_LENGTH : MAX_LENGTH;
    if (value.length > max) {
      errors.push(`${FIELDS[key].label} must be at most ${max} characters`);
      continue;
    }
    const rule = FORMAT_RULES[key];
    if (rule && !rule[0].test(value)) errors.push(rule[1]);
    if (key === 'country' && !isValidCountry(value)) {
      errors.push('Country is invalid');
    }
  }

  if (merged.isRelativeOfEmployee === true && isBlank(merged.relativeName) &&
      (mode === 'register' || data.isRelativeOfEmployee !== undefined || data.relativeName !== undefined)) {
    errors.push('Relative name is required when you are related to a QStudy employee');
  }

  return errors;
};

// Documents required with the application (by agent type). Legacy upload types count as aliases.
const REQUIRED_DOCS = {
  company: ['Company Profile', 'Business Registration Certificate', 'Director Passport'],
  individual: ['Passport']
};
const DOC_ALIASES = {
  'Business Registration Certificate': ['Business License'],
  'Director Passport': ['Identity'],
  Passport: ['Identity']
};

/**
 * Required document types the agent still has to provide.
 * Vijay mandate (transcript [12:23]): Uploading ANY ONE document out of
 * (Company Profile, Business Registration Certificate, or Director Passport) is sufficient.
 * With approvedOnly, a document only counts once staff approved it.
 */
const missingRequiredDocs = (agentType, documents = [], { approvedOnly = false } = {}) => {
  const docs = (Array.isArray(documents) ? documents : []).filter(d => d.status !== 'rejected' && (!approvedOnly || d.status === 'approved'));
  if (agentType === 'company') {
    const companyAccepted = [
      'Company Profile',
      'Business Registration Certificate',
      'Business License',
      'Director Passport',
      'Identity'
    ];
    const hasAnyCompanyDoc = docs.some(d => companyAccepted.includes(d.docType));
    return hasAnyCompanyDoc ? [] : ['Company Profile, Business Registration, or Director Passport'];
  }
  const individualAccepted = ['Passport', 'Identity'];
  const hasPassport = docs.some(d => individualAccepted.includes(d.docType));
  return hasPassport ? [] : ['Passport'];
};

// Bank details are hidden from staff who have no business with payouts.
const BANK_KEYS = ['bankBeneficiaryName', 'bankName', 'bankAccountNumber', 'bankSwiftCode', 'bankIban', 'bankAddress'];
const canSeeBankDetails = (viewer) => {
  if (!viewer) return false;
  if (viewer.role === 'agent') return true; // controllers already limit agents to their own record
  return viewer.role === 'admin' && (!viewer.staffRole || viewer.staffRole !== 'head_admission');
};

module.exports = {
  FIELDS,
  IN_REVIEW_STATUSES,
  APPLICATION_KEYS,
  DECLARATION_FIELDS,
  BANK_KEYS,
  pickApplicationFields,
  validateApplication,
  canSeeBankDetails,
  REQUIRED_DOCS,
  missingRequiredDocs
};
