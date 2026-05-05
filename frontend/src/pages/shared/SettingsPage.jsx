import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  User,
  Lock,
  Bell,
  CreditCard,
  Building2,
  Phone,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  Clock,
  ChevronRight,
  Check,
  X,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { agentAPI, formatApiError } from '../../utils/api';

const NAV_ITEMS = [
  { id: 'profile', icon: User, label: 'Profile & Agency', roles: ['admin', 'agent'] },
  { id: 'security', icon: Lock, label: 'Password & Security', roles: ['admin', 'agent'] },
  { id: 'notifications', icon: Bell, label: 'Notifications', roles: ['admin', 'agent'] },
  { id: 'billing', icon: CreditCard, label: 'Payment Details', roles: ['agent'] },
  { id: 'admins', icon: UserPlus, label: 'Manage Admins', roles: ['admin'] },
];

const FieldLabel = ({ children }) => (
  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{children}</p>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-lg font-semibold text-[#111827] font-['Outfit']">{children}</h2>
);

const Divider = () => <div className="h-[0.5px] bg-slate-200 my-6" />;

export default function SettingsPage() {
  const { user, updateProfile, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    agencyName: user?.agencyName || '',
    businessRegistrationNumber: user?.businessRegistrationNumber || '',
    fullAddress: user?.fullAddress || '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [newAdmin, setNewAdmin] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });

  const [notifPrefs, setNotifPrefs] = useState({
    email: true,
    inapp: true,
    sms: false,
    marketing: false,
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await updateProfile(profileData);
    setLoading(false);
    result.success ? toast.success('Profile updated') : toast.error(result.error || 'Update failed');
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    setLoading(true);
    const result = await updatePassword(passwordData.current_password, passwordData.new_password);
    setLoading(false);
    if (result.success) {
      toast.success('Password updated');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } else {
      toast.error(result.error || 'Update failed');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (newAdmin.password !== newAdmin.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await agentAPI.createAdmin({
        name: newAdmin.name,
        email: newAdmin.email,
        password: newAdmin.password,
        phone: newAdmin.phone,
      });
      toast.success(`Admin account created for ${newAdmin.name}`);
      setNewAdmin({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  // Admins are always verified — isVerified only applies to agents
  const isVerified = user?.role === 'admin' ? true : !!user?.isVerified;

  return (
    <div className="bg-[#FDFDFF] min-h-screen font-sans">
      <div className="max-w-[1100px] mx-auto p-7">

        {/* Page Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Account Settings</h1>
          <p className="text-sm font-medium text-[#6B7280] mt-1">
            Manage your profile, security, and notification preferences.
          </p>
        </div>

        <div className="h-[0.5px] bg-slate-200 my-6" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Sidebar Nav */}
          <div className="lg:col-span-3 space-y-1">
            {/* Avatar Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#E6F1FB] flex items-center justify-center text-2xl font-bold text-[#0C447C] mb-3 shadow-sm">
                {initials}
              </div>
              <p className="text-sm font-semibold text-[#111827] truncate w-full">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-500 truncate w-full mt-0.5">{user?.email}</p>
              <span className={cn(
                "mt-2 text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                isVerified ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-[#FAEEDA] text-[#633806]'
              )}>
                {isVerified ? 'Verified' : 'Pending'}
              </span>
            </div>

            {NAV_ITEMS.filter(item => item.roles.includes(user?.role)).map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                    active
                      ? 'bg-[#042C53] text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                  {!active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-300" />}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="lg:col-span-9">

            {/* ─── PROFILE TAB ─── */}
            {activeTab === 'profile' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 px-7">
                <div className="flex items-center justify-between mb-5">
                  <SectionTitle>Personal Information</SectionTitle>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <FieldLabel>Full Name</FieldLabel>
                      <input
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                        value={profileData.name}
                        onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Email Address</FieldLabel>
                      <input
                        disabled
                        className="w-full h-10 px-3 border border-slate-100 rounded-lg text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed"
                        value={user?.email || ''}
                      />
                    </div>
                    <div>
                      <FieldLabel>Phone Number</FieldLabel>
                      <input
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                        value={profileData.phone}
                        onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <FieldLabel>Role</FieldLabel>
                      <div className="h-10 px-3 border border-slate-100 rounded-lg flex items-center bg-slate-50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{user?.role}</span>
                      </div>
                    </div>
                  </div>

                  {user?.role === 'agent' && (
                    <>
                      <Divider />
                      <div className="flex items-center justify-between pt-3 mb-5">
                        <SectionTitle>Agency Details</SectionTitle>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <FieldLabel>Agency Name</FieldLabel>
                          <input
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                            value={profileData.agencyName}
                            onChange={e => setProfileData({ ...profileData, agencyName: e.target.value })}
                            placeholder="ABC Education Consultancy"
                          />
                        </div>
                        <div>
                          <FieldLabel>Business Reg. Number</FieldLabel>
                          <input
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                            value={profileData.businessRegistrationNumber}
                            onChange={e => setProfileData({ ...profileData, businessRegistrationNumber: e.target.value })}
                            placeholder="U12345MH2020PTC123456"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <FieldLabel>Registered Address</FieldLabel>
                          <textarea
                            rows={3}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all resize-none"
                            value={profileData.fullAddress}
                            onChange={e => setProfileData({ ...profileData, fullAddress: e.target.value })}
                            placeholder="Full street address, city, state, pincode"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <Divider />

                  {/* Verification status row */}
                  <div className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border mt-5",
                    user?.isVerified
                      ? "bg-[#EAF3DE] border-[#BFD49A] text-[#27500A]"
                      : "bg-[#FAEEDA] border-[#F5C98A] text-[#633806]"
                  )}>
                    {user?.isVerified
                      ? <ShieldCheck className="w-5 h-5 shrink-0" />
                      : <Clock className="w-5 h-5 shrink-0" />
                    }
                    <div className="">
                      <p className="text-xs font-semibold uppercase tracking-wider">
                        {user?.isVerified ? 'Account Verified' : 'Verification Pending'}
                      </p>
                      <p className="text-[11px] font-medium opacity-80 mt-0.5">
                        {user?.isVerified
                          ? 'Your agency has been fully verified and is compliant.'
                          : 'Our team is reviewing your registration. Usually 1–2 business days.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-[#042C53] hover:bg-[#0C447C] text-white text-sm font-medium h-9 px-5 rounded-lg transition-colors"
                    >
                      <Save className="w-3.5 h-3.5 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ─── SECURITY TAB ─── */}
            {activeTab === 'security' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 px-7">
                <div className="mb-5">
                  <SectionTitle>Password & Security</SectionTitle>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Update your password to keep your account secure.
                  </p>
                </div>

                <form onSubmit={handlePasswordUpdate}>
                  <div className="space-y-5 max-w-md">
                    <div>
                      <FieldLabel>Current Password</FieldLabel>
                      <input
                        type="password"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                        value={passwordData.current_password}
                        onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <FieldLabel>New Password</FieldLabel>
                      <input
                        type="password"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                        value={passwordData.new_password}
                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        placeholder="Minimum 8 characters"
                      />
                    </div>
                    <div>
                      <FieldLabel>Confirm New Password</FieldLabel>
                      <input
                        type="password"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                        value={passwordData.confirm_password}
                        onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        placeholder="Repeat new password"
                      />
                      {passwordData.confirm_password && passwordData.new_password && (
                        <p className={cn(
                          "text-[11px] font-medium mt-1.5 flex items-center gap-1",
                          passwordData.new_password === passwordData.confirm_password
                            ? "text-[#3B6D11]"
                            : "text-[#A32D2D]"
                        )}>
                          {passwordData.new_password === passwordData.confirm_password
                            ? <><Check className="w-3 h-3" /> Passwords match</>
                            : <><X className="w-3 h-3" /> Passwords do not match</>
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <Divider />

                  {/* Security info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'Last Login', value: 'Today' },
                      { label: 'Sessions', value: '1 active' },
                      { label: '2FA', value: 'Not enabled' },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-medium text-slate-900 mt-1">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#042C53] hover:bg-[#0C447C] text-white text-sm font-medium h-9 px-5 rounded-lg transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                    Update Password
                  </Button>
                </form>
              </div>
            )}

            {/* ─── NOTIFICATIONS TAB ─── */}
            {activeTab === 'notifications' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 px-7">
                <div className="mb-5">
                  <SectionTitle>Notification Preferences</SectionTitle>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Choose how and when you want to be alerted.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {[
                    { key: 'email', label: 'Email Notifications', desc: 'Receive daily summaries and event alerts via email.' },
                    { key: 'inapp', label: 'In-app Notifications', desc: 'Real-time alerts inside the portal dashboard.' },
                    { key: 'sms', label: 'SMS Notifications', desc: 'Critical alerts sent to your phone. (Coming Soon)', disabled: true },
                    { key: 'marketing', label: 'Marketing Updates', desc: 'Stay updated with new institutional partners.' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        disabled={item.disabled}
                        onClick={() => !item.disabled && setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                        className={cn(
                          "relative w-10 h-5 rounded-full transition-colors shrink-0",
                          notifPrefs[item.key] ? "bg-[#042C53]" : "bg-slate-200",
                          item.disabled && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                          notifPrefs[item.key] ? "left-[22px]" : "left-0.5"
                        )} />
                      </button>
                    </div>
                  ))}
                </div>

                <Divider />

                <div className="flex justify-end">
                  <Button
                    onClick={() => toast.success('Preferences saved')}
                    className="bg-[#042C53] hover:bg-[#0C447C] text-white text-sm font-medium h-9 px-5 rounded-lg transition-colors"
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}

            {/* ─── BILLING TAB ─── */}
            {activeTab === 'billing' && user?.role === 'agent' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 px-7">
                <div className="mb-5">
                  <SectionTitle>Payment Information</SectionTitle>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Manage your bank details for commission payouts.
                  </p>
                </div>

                <Divider />

                {/* Commission plan summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Commission Plan', value: 'Standard · 8%' },
                    { label: 'Next Payout', value: 'Pending' },
                    { label: 'Payout Cycle', value: '15 working days' },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-medium text-slate-900 mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="py-14 text-center border border-dashed border-slate-200 rounded-xl">
                  <CreditCard className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-900">No bank account linked</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 max-w-xs mx-auto">
                    Add your bank account to receive commission payouts automatically.
                  </p>
                  <Button
                    onClick={() => toast.info('Bank details form coming soon')}
                    className="mt-5 bg-[#042C53] hover:bg-[#0C447C] text-white text-sm font-medium h-9 px-5 rounded-lg"
                  >
                    Add Bank Account
                  </Button>
                </div>
              </div>
            )}
            {/* ─── MANAGE ADMINS TAB ─── */}
            {activeTab === 'admins' && user?.role === 'admin' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 px-7">
                <div className="mb-5">
                  <SectionTitle>Add New Admin</SectionTitle>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Create a new administrator account. Admins are verified immediately and have full portal access.
                  </p>
                </div>

                <Divider />

                <form onSubmit={handleCreateAdmin}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
                    <div>
                      <FieldLabel>Full Name</FieldLabel>
                      <input
                        required
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                        value={newAdmin.name}
                        onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <FieldLabel>Email Address</FieldLabel>
                      <input
                        required
                        type="email"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                        value={newAdmin.email}
                        onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                        placeholder="admin@qstudy.edu"
                      />
                    </div>
                    <div>
                      <FieldLabel>Phone (optional)</FieldLabel>
                      <input
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                        value={newAdmin.phone}
                        onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div />
                    <div>
                      <FieldLabel>Password</FieldLabel>
                      <input
                        required
                        type="password"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                        value={newAdmin.password}
                        onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                        placeholder="Min. 6 characters"
                      />
                    </div>
                    <div>
                      <FieldLabel>Confirm Password</FieldLabel>
                      <input
                        required
                        type="password"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#042C53]/10 focus:border-[#042C53] transition-all"
                        value={newAdmin.confirmPassword}
                        onChange={e => setNewAdmin({ ...newAdmin, confirmPassword: e.target.value })}
                        placeholder="Repeat password"
                      />
                      {newAdmin.confirmPassword && newAdmin.password && (
                        <p className={cn(
                          "text-[11px] font-medium mt-1.5 flex items-center gap-1",
                          newAdmin.password === newAdmin.confirmPassword ? "text-[#3B6D11]" : "text-[#A32D2D]"
                        )}>
                          {newAdmin.password === newAdmin.confirmPassword
                            ? <><Check className="w-3 h-3" /> Passwords match</>
                            : <><X className="w-3 h-3" /> Passwords do not match</>
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <Divider />

                  <div className="bg-[#FAEEDA] border border-[#F5C98A] rounded-lg p-4 text-[#633806] text-xs font-medium max-w-2xl mb-6">
                    ⚠️ Admin accounts have full access to the portal including agent management, invoices, and all student data. Only create accounts for trusted team members.
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#042C53] hover:bg-[#0C447C] text-white text-sm font-medium h-9 px-5 rounded-lg"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-2" />
                    Create Admin Account
                  </Button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
