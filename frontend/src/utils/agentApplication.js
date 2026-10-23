// Agent application form: field spec shared by the registration form, the agent's
// own settings and the read-only views. Keep in sync with backend/utils/agentApplication.js.
//
// required: 'always' | 'company' | 'individual' | false

export const APPLICATION_GROUPS = [
  {
    id: 'applicant',
    title: 'Applicant details',
    fields: [
      { key: 'agentType', label: 'Agent type', type: 'agentType', required: 'always', wide: true },
      { key: 'agencyName', label: 'Company name', required: 'company', placeholder: 'ABC Education Consultancy' },
      { key: 'businessRegistrationNumber', label: 'Company registration number', required: 'company' },
      { key: 'idNumber', label: 'NRIC / Passport number', required: 'individual' },
      { key: 'natureOfBusiness', label: 'Nature of business', required: 'always', type: 'textarea', wide: true, placeholder: 'e.g. Overseas education consultancy' },
      { key: 'fullAddress', label: 'Address', required: 'always', type: 'textarea', wide: true },
      { key: 'country', label: 'Country', type: 'country', required: 'always' },
      { key: 'region', label: 'Region', required: 'always' },
      { key: 'website', label: 'Website address', required: false, placeholder: 'www.example.com' },
      { key: 'fax', label: 'Fax no', required: false },
    ],
  },
  {
    id: 'contacts',
    title: 'Contact & authorized signatory',
    fields: [
      { key: 'contactPerson', label: 'Contact person', required: 'company' },
      { key: 'contactDesignation', label: 'Contact person designation', required: 'company' },
      { key: 'signatoryName', label: 'Authorized person to sign agreement', required: 'company' },
      { key: 'signatoryDesignation', label: 'Authorized signatory designation', required: 'company' },
    ],
  },
  {
    id: 'relative',
    title: 'Relationship with QStudy',
    fields: [
      { key: 'isRelativeOfEmployee', label: 'Family member, relative or friend of a QStudy employee?', type: 'yesNo', required: false, wide: true },
      { key: 'relativeName', label: 'Name of the employee', required: false, showIf: (v) => v.isRelativeOfEmployee === true },
    ],
  },
  {
    id: 'bank',
    title: 'Bank details (for commission payouts)',
    fields: [
      { key: 'bankBeneficiaryName', label: 'Beneficiary name', required: 'always' },
      { key: 'bankName', label: 'Bank name', required: 'always' },
      { key: 'bankAccountNumber', label: 'Account number', required: 'always' },
      { key: 'bankSwiftCode', label: 'SWIFT code', required: 'always', placeholder: '8 or 11 characters' },
      { key: 'bankAddress', label: 'Bank address', required: 'always', type: 'textarea', wide: true },
    ],
  },
];

export const ALL_FIELDS = APPLICATION_GROUPS.flatMap((g) => g.fields);
export const APPLICATION_KEYS = ALL_FIELDS.map((f) => f.key);

export const isFieldRequired = (field, agentType) =>
  field.required === 'always' || (!!field.required && field.required === agentType);

// Build an editable state object from a user record
export const applicationStateFromUser = (user = {}) =>
  Object.fromEntries(
    APPLICATION_KEYS.map((k) => [k, k === 'isRelativeOfEmployee' ? !!user[k] : (user[k] ?? '')])
  );

export const AGENT_TYPE_LABELS = { company: 'Company', individual: 'Individual' };

// Display value for read-only views
export const displayValue = (field, value) => {
  if (field.type === 'yesNo') return value ? 'Yes' : 'No';
  if (field.type === 'agentType') return AGENT_TYPE_LABELS[value] || null;
  return value || null;
};
