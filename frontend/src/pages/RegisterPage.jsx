import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { onboardingAPI, agentAPI, authAPI, formatApiError } from '../utils/api';
import { Button } from '../components/ui/button';
import { COUNTRIES } from '../utils/countries';
import { cn } from '../lib/utils';

const inputClass =
  'w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0C447C] focus:border-transparent outline-none transition disabled:bg-slate-50 disabled:text-slate-400';

const labelClass = 'block text-xs font-semibold text-slate-700 mb-2';

const Field = ({ label, id, required = false, hint, children, className = '' }) => (
  <div className={className}>
    <label htmlFor={id} className={labelClass}>
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
  </div>
);

const DOC_TYPES = [
  'Company Profile',
  'Business Registration Certificate',
  'Director Passport',
  'Passport',
  'Other'
];

// The login is created first (step 0); everything after it is saved to the signed-in account
const STEPS = ['Login', 'Agency', 'Contact', 'Bank', 'Documents'];

const RegisterPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { startSession } = useAuth();

  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1 and 2: agency, contact and login details
  const [formStep1, setFormStep1] = useState({
    agentType: 'company',
    agencyName: '',
    businessRegistrationNumber: '',
    natureOfBusiness: '',
    country: '',
    region: '',
    fullAddress: '',
    contactPerson: '',
    contactDesignation: 'Director / Manager',
    signatoryName: '',
    signatoryDesignation: 'Director',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    website: '',
  });

  // Step 3: bank details and declaration
  const [formStep2, setFormStep2] = useState({
    isRelativeOfEmployee: false,
    relativeName: '',
    bankBeneficiaryName: '',
    bankName: '',
    bankAccountNumber: '',
    bankSwiftCode: '',
    bankIban: '',
    bankAddress: '',
    declarationName: '',
    declarationIdNumber: '',
    declarationAccepted: false,
  });

  // The last ID copied into the declaration, so a value the agent typed themselves is never overwritten
  const autoDeclarationId = useRef('');

  // Step 4: document upload
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('Company Profile');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onboardingAPI.getInvite(token)
      .then(res => {
        if (cancelled) return;
        setInvite(res.data);
        setFormStep1(f => ({
          ...f,
          agencyName: res.data.name || '',
          contactPerson: res.data.name || '',
          signatoryName: res.data.name || '',
          email: res.data.email || '',
        }));
        setFormStep2(f => ({
          ...f,
          declarationName: res.data.name || '',
        }));
      })
      .catch(err => !cancelled && setInviteError(formatApiError(err)))
      .finally(() => !cancelled && setChecking(false));
    return () => { cancelled = true; };
  }, [token]);

  const setS1 = (key) => (e) => setFormStep1({ ...formStep1, [key]: e.target.value });
  const setS2 = (key) => (e) => setFormStep2({ ...formStep2, [key]: e.target.value });

  const goTo = (step) => {
    setError('');
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 0: create the login. The rest of the application is saved to this account afterwards.
  const handleCreateLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!formStep1.phone.trim() || !/^\+?[0-9]{10,}$/.test(formStep1.phone.replace(/[\s-]/g, ''))) {
      setError('A valid phone number with at least 10 digits is required.');
      return;
    }
    if (!formStep1.email.trim() || !/\S+@\S+\.\S+/.test(formStep1.email)) {
      setError('A valid official email address is required.');
      return;
    }
    if (formStep1.password.length < 10 || !/[A-Za-z]/.test(formStep1.password) || !/\d/.test(formStep1.password)) {
      setError('Password must be at least 10 characters and include at least one letter and one number.');
      return;
    }
    if (formStep1.password !== formStep1.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await onboardingAPI.register(token, {
        name: formStep1.contactPerson.trim(),
        email: formStep1.email,
        phone: formStep1.phone,
        password: formStep1.password,
      });
      startSession(res.data);
      toast.success('Login created', { description: 'Now complete your agency profile.' });
      goTo(1);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1 -> 2: the browser checks the required fields, so only cross-field rules live here
  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (formStep1.agentType === 'company' && !formStep1.agencyName.trim()) {
      setError('Company / Agency Name is required.');
      return;
    }
    if (!formStep1.country) {
      setError('Please select your country.');
      return;
    }
    goTo(2);
  };

  // Step 2 -> 3
  const handleNextStep2 = (e) => {
    e.preventDefault();
    setError('');

    if (!formStep1.contactPerson.trim()) {
      setError('Contact person name is required.');
      return;
    }
    // Prefill the bank beneficiary name if empty
    if (!formStep2.bankBeneficiaryName) {
      setFormStep2(f => ({
        ...f,
        bankBeneficiaryName: formStep1.agencyName || formStep1.contactPerson,
      }));
    }
    // An individual agent's ID / passport number is also the declaration's ID number
    if (formStep1.agentType !== 'company') {
      const id = formStep1.businessRegistrationNumber.trim();
      setFormStep2(f => (
        !f.declarationIdNumber || f.declarationIdNumber === autoDeclarationId.current
          ? { ...f, declarationIdNumber: id }
          : f
      ));
      autoDeclarationId.current = id;
    }
    goTo(3);
  };

  // Step 3: save the application to the account
  const handleSubmitStep3 = async (e) => {
    e.preventDefault();
    setError('');

    if (!formStep2.bankName.trim() || !formStep2.bankAccountNumber.trim()) {
      setError('Please complete the bank details (Bank Name and Account Number). SWIFT code and IBAN are optional.');
      return;
    }
    if (formStep2.isRelativeOfEmployee && !formStep2.relativeName.trim()) {
      setError('Please provide the name of the QStudy employee you are related to.');
      return;
    }
    if (!formStep2.declarationAccepted) {
      setError('You must accept the declaration to continue.');
      return;
    }
    if (!formStep2.declarationName.trim() || !formStep2.declarationIdNumber.trim()) {
      setError('Please provide your full name and ID / Passport number for the declaration.');
      return;
    }

    setSubmitting(true);
    try {
      // Saved to the signed-in account: the application fields, then the declaration
      const { password, confirmPassword, email, phone, contactPerson, ...applicationData } = formStep1;
      const payload = { ...applicationData, contactPerson, ...formStep2 };
      // The shared input holds the company reg. number or, for individuals, the NRIC / passport number
      if (!isCompany) {
        payload.idNumber = formStep1.businessRegistrationNumber;
        payload.businessRegistrationNumber = '';
      }
      await authAPI.updateProfile(payload);
      await agentAPI.acceptDeclaration({
        declarationName: formStep2.declarationName,
        declarationIdNumber: formStep2.declarationIdNumber,
        declarationAccepted: true,
      });
      toast.success('Details saved', {
        description: 'Now upload a verification document to finish.',
      });
      goTo(4);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 4: upload one document
  const handleUploadDocument = async () => {
    if (!selectedFile) {
      toast.error('Please choose a file to upload.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB limit.');
      return;
    }

    setUploadingDoc(true);
    try {
      const res = await agentAPI.uploadVerificationDocument(selectedFile, selectedDocType);
      setUploadedDocs(res.data?.verificationDocuments || []);
      setSelectedFile(null);
      toast.success('Document uploaded', {
        description: `${selectedDocType} uploaded. You can now submit your application.`,
      });
    } catch (err) {
      toast.error('Upload failed', { description: formatApiError(err) });
    } finally {
      setUploadingDoc(false);
    }
  };

  // Step 4: submit for review
  const handleFinalSubmit = async () => {
    setSubmittingReview(true);
    try {
      await agentAPI.submitOnboarding();
      toast.success('Application submitted', {
        description: 'Our team will review it and issue your partnership contract.',
      });
      navigate('/agent/dashboard', { replace: true });
    } catch (err) {
      toast.error('Submission failed', { description: formatApiError(err) });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C447C]" />
          <p className="text-xs text-slate-500 font-medium">Validating your registration link...</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold font-['Outfit'] text-slate-900">Registration Link Unavailable</h1>
          <p className="text-sm text-slate-600">{inviteError || 'This registration link has expired, was revoked, or has already been used.'}</p>
          <p className="text-xs text-slate-400">Please contact your assigned QStudy Account Manager for a new link.</p>
          <div className="pt-2">
            <Link to="/login" className="inline-block px-4 py-2 text-xs font-semibold bg-[#0C447C] text-white rounded-lg hover:bg-[#083058] transition-colors">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCompany = formStep1.agentType === 'company';
  const primaryBtn = 'bg-[#0C447C] hover:bg-[#083058] text-white px-6';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-10 px-4 sm:px-6 font-['Inter']">
      <div className="w-full max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 font-['Outfit'] tracking-tight">
            Agent Application
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {invite.accountManagerName
              ? `Invited by ${invite.accountManagerName}`
              : 'Register your agency with QStudy'}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6 space-y-2">
          <p className="text-sm text-slate-500">
            Step {currentStep + 1} of {STEPS.length} <span className="text-slate-300 mx-1">/</span>
            <span className="font-semibold text-slate-900">{STEPS[currentStep]}</span>
          </p>
          <div className="flex gap-1.5">
            {STEPS.map((name, i) => (
              <div key={name} className={cn('h-1.5 flex-1 rounded-full', i <= currentStep ? 'bg-[#0C447C]' : 'bg-slate-200')} />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* STEP 0: CREATE THE LOGIN */}
        {currentStep === 0 && (
          <form onSubmit={handleCreateLogin} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
            <section className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Create your login</h2>
                <p className="text-xs text-slate-500 mt-1">You will then complete your agency profile and upload your documents.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Your full name" id="contactPerson" required className="sm:col-span-2">
                  <input
                    id="contactPerson"
                    required
                    className={inputClass}
                    value={formStep1.contactPerson}
                    onChange={setS1('contactPerson')}
                    placeholder="Full name"
                  />
                </Field>
                <Field label="Email" id="email" required>
                  <input
                    id="email"
                    type="email"
                    required
                    className={inputClass}
                    value={formStep1.email}
                    onChange={setS1('email')}
                    disabled={!!invite.email}
                  />
                </Field>
                <Field label="Phone" id="phone" required>
                  <input
                    id="phone"
                    required
                    className={inputClass}
                    value={formStep1.phone}
                    onChange={setS1('phone')}
                    placeholder="+60 12-345 6789"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-5">
              <h2 className="text-sm font-semibold text-slate-900">Create your password</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Password" id="password" required hint="At least 10 characters, with a letter and a number">
                  <div className="relative">
                    <input
                      id="password"
                      required
                      type={showPassword ? 'text' : 'password'}
                      className={inputClass}
                      value={formStep1.password}
                      onChange={setS1('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm password" id="confirmPassword" required>
                  <input
                    id="confirmPassword"
                    required
                    type={showPassword ? 'text' : 'password'}
                    className={inputClass}
                    value={formStep1.confirmPassword}
                    onChange={setS1('confirmPassword')}
                  />
                </Field>
              </div>
            </section>

            <div className="pt-2 flex justify-end">
              <Button type="submit" className={primaryBtn} disabled={submitting}>
                {submitting ? 'Creating login...' : 'Create login'} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </form>
        )}

        {/* STEP 1: AGENCY */}
        {currentStep === 1 && (
          <form onSubmit={handleNextStep1} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <label className={labelClass}>Applying as</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'company', title: 'Company' },
                  { id: 'individual', title: 'Individual' }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormStep1({ ...formStep1, agentType: type.id })}
                    className={cn(
                      'px-4 py-3 rounded-lg border text-sm font-medium transition-colors',
                      formStep1.agentType === type.id
                        ? 'border-[#0C447C] bg-[#E6F1FB] text-[#0C447C]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {type.title}
                  </button>
                ))}
              </div>
            </div>

            <Field label={isCompany ? 'Company name' : 'Full legal name'} id="agencyName" required>
              <input
                id="agencyName"
                required
                className={inputClass}
                value={formStep1.agencyName}
                onChange={setS1('agencyName')}
                placeholder="e.g. Global Education Agency Ltd"
              />
            </Field>

            <Field
              label={isCompany ? 'Company registration number' : 'ID / Passport number'}
              id="businessRegistrationNumber"
              required
            >
              <input
                id="businessRegistrationNumber"
                required
                className={inputClass}
                value={formStep1.businessRegistrationNumber}
                onChange={setS1('businessRegistrationNumber')}
              />
            </Field>

            <Field label="Nature of business" id="natureOfBusiness" required>
              <input
                id="natureOfBusiness"
                required
                className={inputClass}
                value={formStep1.natureOfBusiness}
                onChange={setS1('natureOfBusiness')}
                placeholder="e.g. Overseas education consultancy"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Country" id="country" required>
                <select
                  id="country"
                  required
                  className={inputClass}
                  value={formStep1.country}
                  onChange={setS1('country')}
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.name}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </Field>

              <Field label="Region / State" id="region" required>
                <input
                  id="region"
                  required
                  className={inputClass}
                  value={formStep1.region}
                  onChange={setS1('region')}
                  placeholder="e.g. Selangor"
                />
              </Field>
            </div>

            <Field label="Address" id="fullAddress" required>
              <textarea
                id="fullAddress"
                required
                rows={2}
                className={cn(inputClass, 'resize-none')}
                value={formStep1.fullAddress}
                onChange={setS1('fullAddress')}
                placeholder="Street, city and postal code"
              />
            </Field>

            {showMore || formStep1.website ? (
              <Field label="Website (optional)" id="website">
                <input
                  id="website"
                  className={inputClass}
                  value={formStep1.website}
                  onChange={setS1('website')}
                  placeholder="www.example.com"
                />
              </Field>
            ) : (
              <button type="button" onClick={() => setShowMore(true)} className="text-xs font-medium text-[#0C447C] hover:underline">
                + Add website (optional)
              </button>
            )}

            <div className="pt-2 flex justify-end">
              <Button type="submit" className={primaryBtn}>
                Next <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </form>
        )}

        {/* STEP 2: CONTACT */}
        {currentStep === 2 && (
          <form onSubmit={handleNextStep2} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
            <section className="space-y-5">
              <h2 className="text-sm font-semibold text-slate-900">Who should we contact?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Contact person" id="contactPerson" required>
                  <input
                    id="contactPerson"
                    required
                    className={inputClass}
                    value={formStep1.contactPerson}
                    onChange={setS1('contactPerson')}
                    placeholder="Full name"
                  />
                </Field>
                {isCompany && (
                  <Field label="Designation" id="contactDesignation" required>
                    <input
                      id="contactDesignation"
                      required
                      className={inputClass}
                      value={formStep1.contactDesignation}
                      onChange={setS1('contactDesignation')}
                      placeholder="e.g. Manager"
                    />
                  </Field>
                )}
              </div>
            </section>

            {isCompany && (
              <section className="space-y-5">
                <h2 className="text-sm font-semibold text-slate-900">Who signs the agreement?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Authorized person" id="signatoryName" required>
                    <input
                      id="signatoryName"
                      required
                      className={inputClass}
                      value={formStep1.signatoryName}
                      onChange={setS1('signatoryName')}
                      placeholder="Director or legal representative"
                    />
                  </Field>
                  <Field label="Designation" id="signatoryDesignation" required>
                    <input
                      id="signatoryDesignation"
                      required
                      className={inputClass}
                      value={formStep1.signatoryDesignation}
                      onChange={setS1('signatoryDesignation')}
                      placeholder="e.g. Director"
                    />
                  </Field>
                </div>
              </section>
            )}

            <div className="pt-2 flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => goTo(1)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button type="submit" className={primaryBtn}>
                Next <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: BANK AND DECLARATION */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmitStep3} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
            <section className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Bank details</h2>
                <p className="text-xs text-slate-500 mt-1">Commissions are paid by bank transfer. Details must match your bank record.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Account holder name" id="bankBeneficiaryName" required>
                  <input
                    id="bankBeneficiaryName"
                    required
                    className={inputClass}
                    value={formStep2.bankBeneficiaryName}
                    onChange={setS2('bankBeneficiaryName')}
                  />
                </Field>
                <Field label="Bank name" id="bankName" required>
                  <input
                    id="bankName"
                    required
                    className={inputClass}
                    value={formStep2.bankName}
                    onChange={setS2('bankName')}
                    placeholder="e.g. Maybank"
                  />
                </Field>
                <Field label="Account number" id="bankAccountNumber" required>
                  <input
                    id="bankAccountNumber"
                    required
                    className={inputClass}
                    value={formStep2.bankAccountNumber}
                    onChange={setS2('bankAccountNumber')}
                  />
                </Field>
                <Field label="SWIFT code (optional)" id="bankSwiftCode" hint="8 or 11 characters">
                  <input
                    id="bankSwiftCode"
                    className={inputClass}
                    value={formStep2.bankSwiftCode}
                    onChange={setS2('bankSwiftCode')}
                    placeholder="e.g. MBBEMYKL"
                  />
                </Field>
                <Field label="IBAN (optional)" id="bankIban">
                  <input
                    id="bankIban"
                    className={inputClass}
                    value={formStep2.bankIban}
                    onChange={setS2('bankIban')}
                    placeholder="If your bank has one"
                  />
                </Field>
                <Field label="Bank branch address" id="bankAddress" className="sm:col-span-2" required>
                  <input
                    id="bankAddress"
                    required
                    className={inputClass}
                    value={formStep2.bankAddress}
                    onChange={setS2('bankAddress')}
                    placeholder="Branch, city and country"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Are you related to, or friends with, a QStudy employee?
              </h2>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="isRelativeOfEmployee"
                    checked={!formStep2.isRelativeOfEmployee}
                    onChange={() => setFormStep2({ ...formStep2, isRelativeOfEmployee: false, relativeName: '' })}
                  />
                  No
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="isRelativeOfEmployee"
                    checked={formStep2.isRelativeOfEmployee}
                    onChange={() => setFormStep2({ ...formStep2, isRelativeOfEmployee: true })}
                  />
                  Yes
                </label>
              </div>
              {formStep2.isRelativeOfEmployee && (
                <Field label="Employee name and relationship" id="relativeName" required>
                  <input
                    id="relativeName"
                    required
                    className={inputClass}
                    value={formStep2.relativeName}
                    onChange={setS2('relativeName')}
                    placeholder="e.g. John Doe (cousin)"
                  />
                </Field>
              )}
            </section>

            <section className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Declaration</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  I declare that all information provided is true and valid, and I agree to QStudy's sub-agent terms and code of ethics.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Full legal name (signature)" id="declarationName" required>
                  <input
                    id="declarationName"
                    required
                    className={inputClass}
                    value={formStep2.declarationName}
                    onChange={setS2('declarationName')}
                  />
                </Field>
                <Field label="ID / Passport number" id="declarationIdNumber" required>
                  <input
                    id="declarationIdNumber"
                    required
                    className={inputClass}
                    value={formStep2.declarationIdNumber}
                    onChange={setS2('declarationIdNumber')}
                  />
                </Field>
              </div>
              <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-300 text-[#0C447C] focus:ring-[#0C447C]"
                  checked={formStep2.declarationAccepted}
                  onChange={(e) => setFormStep2({ ...formStep2, declarationAccepted: e.target.checked })}
                  required
                />
                <span>I am authorized to sign on behalf of the agency and accept this declaration.</span>
              </label>
            </section>

            <div className="pt-2 flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => goTo(2)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button type="submit" disabled={submitting} className={primaryBtn}>
                {submitting ? 'Creating account...' : <>Create account <ArrowRight className="w-4 h-4 ml-1.5" /></>}
              </Button>
            </div>
          </form>
        )}

        {/* STEP 4: DOCUMENTS */}
        {currentStep === 4 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Upload one verification document</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Any one is enough: a company profile, a business registration certificate, or a director's passport.
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Document type" id="docType">
                  <select
                    id="docType"
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    className={inputClass}
                  >
                    {DOC_TYPES.map(dt => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </select>
                </Field>

                <Field label="File" id="docFile" hint="PDF, JPG or PNG, up to 10MB">
                  <input
                    id="docFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0C447C] file:text-white hover:file:bg-[#083058] file:cursor-pointer"
                  />
                </Field>
              </div>

              <Button
                onClick={handleUploadDocument}
                disabled={uploadingDoc || !selectedFile}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {uploadingDoc ? (
                  <><Clock className="w-4 h-4 mr-1.5 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-1.5" /> Upload document</>
                )}
              </Button>
            </div>

            {uploadedDocs.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="truncate">
                        <p className="font-medium text-slate-900">{doc.docType}</p>
                        <p className="text-xs text-slate-400 truncate">{doc.fileName}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Uploaded
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate('/agent/dashboard', { replace: true })}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                I will finish later from my dashboard
              </button>
              <Button
                onClick={handleFinalSubmit}
                disabled={submittingReview || uploadedDocs.length === 0}
                className="w-full sm:w-auto bg-[#047857] hover:bg-[#03543d] text-white px-6"
              >
                {submittingReview ? 'Submitting...' : 'Submit application'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-slate-400 mt-10">
        &copy; {new Date().getFullYear()} QStudy Education Portal. All rights reserved.
      </footer>
    </div>
  );
};

export default RegisterPage;
