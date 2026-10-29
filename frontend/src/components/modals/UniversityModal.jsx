import React, { useState, useEffect, useRef } from 'react';
import { universityAPI } from '../../utils/api';
import { useData } from '../../context/DataContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Building2, Globe, Mail, User, MapPin, Upload } from 'lucide-react';
import { countries } from '../../lib/countries';
import { toast } from 'sonner';

const initialFormState = {
  name: '',
  code: '',
  country: '',
  city: '',
  website: '',
  logoUrl: '',
  contactPerson: '',
  contactEmail: '',
  status: 'active',
  description: '',
  fees: []
};

const UniversityModal = ({ open, onOpenChange, university = null, onSuccess }) => {
  const { createUniversity, updateUniversity } = useData();
  const isEditing = Boolean(university);

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (university) {
      setFormData({
        name: university.name || '',
        code: university.code || '',
        country: university.country || '',
        city: university.city || '',
        website: university.website || '',
        logoUrl: university.logoUrl || '',
        contactPerson: university.contactPerson || '',
        contactEmail: university.contactEmail || '',
        status: university.status || 'active',
        description: university.description || '',
        fees: Array.isArray(university.fees)
          ? university.fees.map((fee) => ({ id: fee.id, label: fee.label || '', amount: String(fee.amount ?? ''), currency: fee.currency || 'USD', note: fee.note || '' }))
          : []
      });
    } else {
      setFormData(initialFormState);
    }
    setErrors({});
  }, [university, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be 2MB or smaller');
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await universityAPI.uploadLogo(file);
      handleChange('logoUrl', url);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'University name is required';
    if (!formData.code.trim()) newErrors.code = 'University code is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';

    if (formData.contactEmail && formData.contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail.trim())) {
        newErrors.contactEmail = 'Invalid contact email format';
      }
    }

    formData.fees.forEach((fee, index) => {
      if (!fee.label.trim()) newErrors.fees = `Fee ${index + 1}: a name is required`;
      else if (fee.amount === '' || isNaN(parseFloat(fee.amount)) || parseFloat(fee.amount) < 0) newErrors.fees = `Fee ${index + 1} (${fee.label}): enter an amount, 0 or more`;
      else if (!/^[A-Za-z]{3}$/.test(fee.currency.trim())) newErrors.fees = `Fee ${index + 1} (${fee.label}): the currency is a 3-letter code such as USD or MYR`;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        country: formData.country.trim(),
        city: formData.city.trim() || null,
        website: formData.website.trim() || null,
        logoUrl: formData.logoUrl.trim() || null,
        status: formData.status,
        description: formData.description.trim() || null,
        fees: formData.fees.map((fee) => ({
          id: fee.id,
          label: fee.label.trim(),
          amount: parseFloat(fee.amount),
          currency: fee.currency.trim().toUpperCase(),
          note: fee.note.trim() || null
        }))
      };

      if (isEditing) {
        await updateUniversity(university.id, payload);
      } else {
        await createUniversity(payload);
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Submit university error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[650px] p-0 overflow-y-auto border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#042C53]/5 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#042C53]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                {isEditing ? 'Edit University' : 'Add New University'}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                {isEditing ? 'Update institution details and contact information' : 'Register a partner university to the portal'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 bg-[#F9FAFB] max-h-[70vh] overflow-y-auto space-y-5">
            {/* Primary Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-gray-700">
                  University Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Oxford University"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-[11px] text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Institution Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  placeholder="e.g. OXF-UK"
                  className={errors.code ? 'border-red-500' : ''}
                  disabled={isEditing}
                />
                {errors.code && <p className="text-[11px] text-red-500">{errors.code}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleChange('status', val)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Country <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.country}
                  onValueChange={(val) => handleChange('country', val)}
                >
                  <SelectTrigger className={`bg-white ${errors.country ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.name}>
                        <span className="mr-2">{c.flag}</span> {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-[11px] text-red-500">{errors.country}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  City
                </Label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Oxford"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Website URL
                </Label>
                <Input
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.ox.ac.uk"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Logo URL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.logoUrl}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {uploadingLogo ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
                {formData.logoUrl && (
                  <img
                    src={formData.logoUrl}
                    alt="Logo preview"
                    className="h-12 w-12 object-contain rounded border border-gray-200 bg-white mt-1"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    onLoad={(e) => { e.currentTarget.style.display = ''; }}
                  />
                )}
              </div>
            </div>


            {/* Fee structure */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Fee structure</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFormData(prev => ({ ...prev, fees: [...prev.fees, { id: undefined, label: '', amount: '', currency: 'USD', note: '' }] }))}
                >
                  Add fee
                </Button>
              </div>
              <p className="text-[11px] text-gray-500">
                What a student pays besides tuition, for example an application or registration fee. Tuition per course is set under Courses.
              </p>
              {formData.fees.map((fee, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start">
                  <Input
                    className="col-span-4"
                    placeholder="Name, e.g. Application fee"
                    value={fee.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, fees: prev.fees.map((f, i) => i === index ? { ...f, label: e.target.value } : f) }))}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    value={fee.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, fees: prev.fees.map((f, i) => i === index ? { ...f, amount: e.target.value } : f) }))}
                  />
                  <Input
                    className="col-span-2 uppercase"
                    maxLength={3}
                    placeholder="USD"
                    value={fee.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, fees: prev.fees.map((f, i) => i === index ? { ...f, currency: e.target.value } : f) }))}
                  />
                  <Input
                    className="col-span-3"
                    placeholder="Note (optional)"
                    value={fee.note}
                    onChange={(e) => setFormData(prev => ({ ...prev, fees: prev.fees.map((f, i) => i === index ? { ...f, note: e.target.value } : f) }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="col-span-1 h-9 text-red-600 hover:bg-red-50"
                    aria-label="Remove fee"
                    onClick={() => setFormData(prev => ({ ...prev, fees: prev.fees.filter((_, i) => i !== index) }))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {errors.fees && <p className="text-[11px] text-red-500">{errors.fees}</p>}
            </div>

            {/* Description */}
            <div className="pt-3 border-t border-gray-200 space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">About Institution</Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description, admission criteria highlights, or general notes..."
                className="bg-white"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#042C53] hover:bg-[#0C447C] text-white"
            >
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create University'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UniversityModal;
