import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coins, FileText, Megaphone, Plus, Trash2, Pencil, Eye, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { universityAPI, formatApiError } from '../../utils/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const money = (amount, currency) =>
  amount == null ? '-' : `${currency ? `${currency} ` : ''}${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const emptyUpdate = { type: 'news', title: '', content: '', amount: '', deadline: '', notifyAgents: true };

const sectionTitle = 'text-base font-bold text-gray-900 font-[\'Outfit\'] flex items-center gap-2';
const cardClass = 'border-[#E5E7EB] bg-white shadow-none';

/**
 * Fee structure, courses with what the student pays and what the agent earns, brochures,
 * and news / scholarship updates. Everyone can read; only `canManage` (Head of Admission) can change.
 */
const UniversityContent = ({ university, canManage, onChanged }) => {
  const id = university.id;
  const fees = Array.isArray(university.fees) ? university.fees : [];
  const brochures = Array.isArray(university.brochures) ? university.brochures : [];

  const [courseData, setCourseData] = useState({ commissionRate: null, courses: [] });
  const [updates, setUpdates] = useState([]);
  const [form, setForm] = useState(null); // null = closed, else { id?, ...fields }
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [brochureTitle, setBrochureTitle] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [c, u] = await Promise.all([universityAPI.getCourses(id), universityAPI.getUpdates(id)]);
      setCourseData(c.data);
      setUpdates(u.data);
    } catch (error) {
      toast.error('Could not load the university details', { description: formatApiError(error) });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openBrochure = async (brochure, download) => {
    try {
      const res = await universityAPI.downloadBrochure(id, brochure.id);
      const type = res.headers['content-type'] || brochure.contentType || 'application/octet-stream';
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type });
      const url = window.URL.createObjectURL(blob);
      if (download) {
        const a = document.createElement('a');
        a.href = url;
        a.download = brochure.fileName || brochure.title;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else if (!window.open(url, '_blank')) {
        toast.error('Pop-up blocked. Please allow pop-ups to view the brochure.');
      }
    } catch (error) {
      toast.error('Could not open the brochure', { description: formatApiError(error) });
    }
  };

  const uploadBrochure = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await universityAPI.uploadBrochure(id, file, brochureTitle.trim());
      toast.success('Brochure added. Agents have been notified.');
      setBrochureTitle('');
      onChanged && onChanged();
    } catch (error) {
      toast.error('Could not add the brochure', { description: formatApiError(error) });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeBrochure = async (brochure) => {
    if (!window.confirm(`Remove the brochure "${brochure.title}"?`)) return;
    try {
      await universityAPI.deleteBrochure(id, brochure.id);
      toast.success('Brochure removed');
      onChanged && onChanged();
    } catch (error) {
      toast.error('Could not remove the brochure', { description: formatApiError(error) });
    }
  };

  const saveUpdate = async () => {
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        title: form.title,
        content: form.content,
        amount: form.amount,
        deadline: form.deadline || null
      };
      if (form.id) {
        await universityAPI.editUpdate(id, form.id, payload);
        toast.success('Update saved');
      } else {
        await universityAPI.createUpdate(id, { ...payload, notifyAgents: form.notifyAgents });
        toast.success(form.notifyAgents ? 'Published. Agents have been notified.' : 'Published');
      }
      setForm(null);
      load();
    } catch (error) {
      toast.error('Could not save the update', { description: formatApiError(error) });
    } finally {
      setSaving(false);
    }
  };

  const removeUpdate = async (update) => {
    if (!window.confirm(`Delete "${update.title}"?`)) return;
    try {
      await universityAPI.deleteUpdate(id, update.id);
      load();
    } catch (error) {
      toast.error('Could not delete the update', { description: formatApiError(error) });
    }
  };

  const { courses, commissionRate } = courseData;

  return (
    <div className="space-y-6">
      {/* News and scholarships */}
      <Card className={cardClass}>
        <CardHeader className="border-b border-gray-100 px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className={sectionTitle}><Megaphone size={18} className="text-[#042C53]" /> News and scholarships</CardTitle>
            <CardDescription className="text-xs text-gray-500 mt-0.5">Latest updates from this university</CardDescription>
          </div>
          {canManage && !form && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setForm({ ...emptyUpdate })}>
              <Plus size={14} /> Add update
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {form && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <select
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="news">News</option>
                    <option value="scholarship">Scholarship</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label className="text-xs">Title</Label>
                  <Input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Text</Label>
                <textarea
                  className="w-full min-h-[90px] rounded-md border border-gray-200 bg-white p-2 text-sm"
                  maxLength={5000}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </div>
              {form.type === 'scholarship' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Amount (optional)</Label>
                    <Input value={form.amount || ''} maxLength={100} placeholder="e.g. 50% tuition waiver" onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Deadline (optional)</Label>
                    <Input type="date" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                {!form.id ? (
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={form.notifyAgents} onChange={(e) => setForm({ ...form, notifyAgents: e.target.checked })} />
                    Notify agents (portal and email)
                  </label>
                ) : <span />}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
                  <Button size="sm" className="h-8 text-xs" onClick={saveUpdate} disabled={saving}>
                    {saving ? 'Saving...' : form.id ? 'Save' : 'Publish'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {updates.length === 0 && !form && <p className="text-sm text-gray-500">Nothing published yet.</p>}
          {updates.map((update) => (
            <div key={update.id} className="rounded-md border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={update.type === 'scholarship' ? 'border-emerald-200 text-emerald-700' : 'border-blue-200 text-blue-700'}>
                      {update.type === 'scholarship' ? 'Scholarship' : 'News'}
                    </Badge>
                    <span className="text-sm font-semibold text-gray-900">{update.title}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(update.publishedAt).toLocaleDateString()}
                    {update.amount ? ` · ${update.amount}` : ''}
                    {update.deadline ? ` · Deadline ${new Date(update.deadline).toLocaleDateString()}` : ''}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Edit update"
                      onClick={() => setForm({ id: update.id, type: update.type, title: update.title, content: update.content, amount: update.amount || '', deadline: update.deadline || '', notifyAgents: false })}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" aria-label="Delete update" onClick={() => removeUpdate(update)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{update.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Fees */}
      <Card className={cardClass}>
        <CardHeader className="border-b border-gray-100 px-6 py-4">
          <CardTitle className={sectionTitle}><Coins size={18} className="text-[#042C53]" /> Fee structure</CardTitle>
          <CardDescription className="text-xs text-gray-500 mt-0.5">Fees besides tuition. Tuition per course is shown below.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {fees.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No fees listed.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">{fee.label}</TableCell>
                    <TableCell>{money(fee.amount, fee.currency)}</TableCell>
                    <TableCell className="text-gray-500">{fee.note || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Courses, tuition and commission */}
      <Card className={cardClass}>
        <CardHeader className="border-b border-gray-100 px-6 py-4">
          <CardTitle className={sectionTitle}><FileText size={18} className="text-[#042C53]" /> Courses, tuition and commission</CardTitle>
          <CardDescription className="text-xs text-gray-500 mt-0.5">
            Tuition is what the student pays.{' '}
            {commissionRate > 0 ? `Commission is ${commissionRate}% of tuition.` : 'No commission rate is set for this university yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {courses.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No courses listed.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Tuition (student pays)</TableHead>
                  <TableHead>Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.name}{course.code ? <span className="text-gray-400"> · {course.code}</span> : null}</TableCell>
                    <TableCell>{course.level || '-'}</TableCell>
                    <TableCell>{course.tuitionAmount ? money(course.tuitionAmount) : (course.tuitionFee || '-')}</TableCell>
                    <TableCell>{course.commissionAmount != null ? money(course.commissionAmount) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Brochures */}
      <Card className={cardClass}>
        <CardHeader className="border-b border-gray-100 px-6 py-4">
          <CardTitle className={sectionTitle}><FileText size={18} className="text-[#042C53]" /> Brochures</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {brochures.length === 0 && <p className="text-sm text-gray-500">No brochures yet.</p>}
          {brochures.map((brochure) => (
            <div key={brochure.id} className="flex items-center justify-between rounded-md border border-gray-100 px-4 py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{brochure.title}</p>
                <p className="text-xs text-gray-500">{brochure.fileName}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="View brochure" onClick={() => openBrochure(brochure, false)}><Eye size={14} /></Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Download brochure" onClick={() => openBrochure(brochure, true)}><Download size={14} /></Button>
                {canManage && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" aria-label="Remove brochure" onClick={() => removeBrochure(brochure)}><Trash2 size={14} /></Button>
                )}
              </div>
            </div>
          ))}
          {canManage && (
            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-gray-100">
              <div className="space-y-1">
                <Label className="text-xs">Title (optional)</Label>
                <Input className="h-9 w-64" value={brochureTitle} maxLength={150} onChange={(e) => setBrochureTitle(e.target.value)} />
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={uploadBrochure} />
              <Button size="sm" className="h-9 text-xs gap-1" disabled={uploading} onClick={() => fileRef.current && fileRef.current.click()}>
                <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload brochure'}
              </Button>
              <span className="text-[11px] text-gray-500">PDF, JPG or PNG, up to 15 MB</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UniversityContent;
