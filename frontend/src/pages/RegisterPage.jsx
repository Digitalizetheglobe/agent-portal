import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { onboardingAPI, formatApiError } from '../utils/api';
import { Button } from '../components/ui/button';
import ApplicationFormFields from '../components/agent/ApplicationFormFields';
import { applicationStateFromUser } from '../utils/agentApplication';

const inputClass =
  'w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition disabled:bg-muted disabled:text-muted-foreground';

const Field = ({ label, id, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-foreground mb-2">{label}</label>
    {children}
  </div>
);

const RegisterPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { startSession } = useAuth();

  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    declarationName: '', declarationIdNumber: '', declarationAccepted: false,
  });
  const [application, setApplication] = useState(applicationStateFromUser());

  useEffect(() => {
    let cancelled = false;
    onboardingAPI.getInvite(token)
      .then(res => {
        if (cancelled) return;
        setInvite(res.data);
        setForm(f => ({ ...f, name: res.data.name || '', email: res.data.email || '' }));
      })
      .catch(err => !cancelled && setInviteError(formatApiError(err)))
      .finally(() => !cancelled && setChecking(false));
    return () => { cancelled = true; };
  }, [token]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!application.agentType) return setError('Please choose whether you are applying as a company or an individual');
    if (form.password.length < 10 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) return setError('Password must be at least 10 characters and include a letter and a number');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');

    setSubmitting(true);
    try {
      const { confirmPassword, ...account } = form;
      const payload = { ...account, ...application };
      const res = await onboardingAPI.register(token, payload);
      startSession(res.data);
      toast.success('Application started', {
        description: 'Now upload your company or personal documents so we can verify you.',
      });
      navigate('/agent/dashboard', { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h1 className="text-2xl font-semibold font-['Outfit']">Link not available</h1>
          <p className="text-muted-foreground">{inviteError}</p>
          <p className="text-sm text-muted-foreground">Ask your QStudy Account Manager for a new registration link.</p>
          <Link to="/login" className="text-primary text-sm underline">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-foreground font-['Outfit'] mb-2">Agent application</h1>
          <p className="text-muted-foreground">
            {invite.accountManagerName
              ? `You were invited by ${invite.accountManagerName}. `
              : 'You were invited by QStudy. '}
            Fill in your details to start. You will upload your documents next.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground mb-1">Your account</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Full name *" id="name">
                <input id="name" required className={inputClass} value={form.name} onChange={set('name')} />
              </Field>
              <Field label="Email *" id="email">
                <input id="email" type="email" required className={inputClass} value={form.email}
                  onChange={set('email')} disabled={!!invite.email} />
              </Field>
              <Field label="Tel no *" id="phone">
                <input id="phone" required className={inputClass} value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
              </Field>
            </div>
          </fieldset>

          <ApplicationFormFields values={application} onChange={setApplication} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Create password *" id="password">
              <div className="relative">
                <input id="password" required minLength={10} type={showPassword ? 'text' : 'password'}
                  className={inputClass} value={form.password} onChange={set('password')} />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            <Field label="Confirm password *" id="confirmPassword">
              <input id="confirmPassword" required type={showPassword ? 'text' : 'password'}
                className={inputClass} value={form.confirmPassword} onChange={set('confirmPassword')} />
            </Field>
          </div>

          <fieldset className="space-y-4 border rounded-lg p-4">
            <legend className="text-sm font-semibold text-foreground px-1">Declaration</legend>
            <p className="text-sm text-muted-foreground">
              I declare that the information given in this application and the documents submitted are true and
              complete, and I agree to the terms of QStudy's agent programme.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Signature (type your full name) *" id="declarationName">
                <input id="declarationName" required className={inputClass} value={form.declarationName} onChange={set('declarationName')} />
              </Field>
              <Field label="ID number *" id="declarationIdNumber">
                <input id="declarationIdNumber" required className={inputClass} value={form.declarationIdNumber} onChange={set('declarationIdNumber')} />
              </Field>
              <Field label="Date" id="declarationDate">
                <input id="declarationDate" className={inputClass} value={new Date().toLocaleDateString()} disabled readOnly />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.declarationAccepted}
                onChange={(e) => setForm({ ...form, declarationAccepted: e.target.checked })}
                required
              />
              <span>I have read and accept the declaration above.</span>
            </label>
          </fieldset>

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1" role="alert">
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full py-6 text-base">
            {submitting ? 'Submitting...' : 'Submit application'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
