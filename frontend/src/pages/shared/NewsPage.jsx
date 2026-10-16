import React, { useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Megaphone, Newspaper, Pencil, Pin, Plus, Search, Trash2, Video, X, Youtube } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { newsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { cn } from '../../lib/utils';

const emptyForm = {
  title: '',
  content: '',
  category: 'news',
  imageUrl: '',
  videoUrl: '',
  youtubeUrl: '',
  isPinned: false,
  notifyAgents: true,
};

const YOUTUBE_ID_REGEX = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i;
const getYoutubeId = (url) => {
  const match = (url || '').trim().match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'news', label: 'News' },
  { key: 'update', label: 'Updates' },
];

const categoryStyle = {
  news: 'bg-blue-50 text-blue-700 border-blue-200',
  update: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const NewsPage = () => {
  const { news, createNews, updateNews, deleteNews } = useData();
  const { isAdmin } = useAuth();
  const admin = isAdmin();

  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(null); // 'image' | 'video' | null
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    return news.filter((item) => {
      if (filter !== 'all' && item.category !== filter) return false;
      if (!term) return true;
      return item.title.toLowerCase().includes(term) || item.content.toLowerCase().includes(term);
    });
  }, [news, filter, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title,
      content: item.content,
      category: item.category,
      imageUrl: item.imageUrl || '',
      videoUrl: item.videoUrl || '',
      youtubeUrl: item.youtubeUrl || '',
      isPinned: Boolean(item.isPinned),
      notifyAgents: false,
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleMediaUpload = async (e, kind) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const limitMb = kind === 'video' ? 50 : 5;
    if (!file.type.startsWith(`${kind}/`)) {
      toast.error(`Please select ${kind === 'video' ? 'a video' : 'an image'} file`);
      return;
    }
    if (file.size > limitMb * 1024 * 1024) {
      toast.error(`File must be ${limitMb}MB or smaller`);
      return;
    }
    setUploading(kind);
    try {
      const url = await newsAPI.uploadMedia(file);
      handleChange(kind === 'video' ? 'videoUrl' : 'imageUrl', url);
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.content.trim()) newErrors.content = 'Content is required';
    if (form.youtubeUrl.trim() && !getYoutubeId(form.youtubeUrl)) {
      newErrors.youtubeUrl = 'Enter a valid YouTube link';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (editing) {
        const { notifyAgents, ...changes } = form;
        await updateNews(editing.id, changes);
        toast.success('Updated successfully');
      } else {
        await createNews(form);
        toast.success(form.category === 'update' ? 'Update published' : 'News published');
      }
      setModalOpen(false);
    } catch (err) {
      // Error toast is raised by the data context
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await deleteNews(item.id);
      toast.success('Deleted successfully');
    } catch (err) {
      // Error toast is raised by the data context
    }
  };

  return (
    <div className="p-6 md:p-8 min-h-screen bg-[#F9FAFB] font-['Inter']" data-testid="news-page">
      <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] font-['Outfit']">News &amp; Updates</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {admin ? 'Publish announcements and portal updates for your agents' : 'Latest announcements and portal updates'}
          </p>
        </div>
        {admin && (
          <Button onClick={openCreate} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            Publish
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                filter === f.key
                  ? 'bg-[#042C53] text-white border-[#042C53]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news & updates…"
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
          <Newspaper className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-900">Nothing here yet</h3>
          <p className="text-xs text-gray-500 mt-1">
            {admin ? 'Publish the first news item or update for your agents.' : 'New announcements will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = item.category === 'update' ? Megaphone : Newspaper;
            return (
              <article
                key={item.id}
                className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-[#042C53]/5 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#042C53]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-[#111827] font-['Outfit']">{item.title}</h3>
                    <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wider', categoryStyle[item.category])}>
                      {item.category === 'update' ? 'Update' : 'News'}
                    </Badge>
                    {item.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">
                    {item.publishedAt ? format(new Date(item.publishedAt), 'dd MMM yyyy, h:mm a') : ''}
                    {item.author?.name ? ` · ${item.author.name}` : ''}
                  </p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{item.content}</p>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      className="mt-3 w-full max-w-md max-h-64 rounded-lg border border-gray-200 object-cover bg-gray-50"
                    />
                  )}
                  {item.videoUrl && (
                    <video
                      src={item.videoUrl}
                      controls
                      preload="metadata"
                      className="mt-3 w-full max-w-2xl rounded-lg border border-gray-200 bg-black"
                    />
                  )}
                  {getYoutubeId(item.youtubeUrl) && (
                    <div className="mt-3 w-full max-w-2xl aspect-video">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${getYoutubeId(item.youtubeUrl)}`}
                        title={`${item.title} video`}
                        className="w-full h-full rounded-lg border border-gray-200"
                        allow="accelerometer; encrypted-media; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
                {admin && (
                  <div className="flex items-start gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Edit">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} aria-label="Delete">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[560px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 border-b border-gray-100 bg-white">
            <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
              {editing ? 'Edit Post' : 'Publish News or Update'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-0.5">
              Visible to all agents in their News &amp; Updates page
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="p-6 bg-[#F9FAFB] space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g. New intake dates announced"
                  maxLength={200}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-[11px] text-red-500">{errors.title}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Type</Label>
                <Select value={form.category} onValueChange={(val) => handleChange('category', val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Content <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  rows={6}
                  value={form.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder="Write the announcement…"
                  className={cn('bg-white', errors.content ? 'border-red-500' : '')}
                />
                {errors.content && <p className="text-[11px] text-red-500">{errors.content}</p>}
              </div>

              <div className="pt-3 border-t border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Media (optional)</h4>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Image
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={form.imageUrl}
                      onChange={(e) => handleChange('imageUrl', e.target.value)}
                      placeholder="Paste an image URL or upload"
                    />
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      className="hidden"
                      onChange={(e) => handleMediaUpload(e, 'image')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={uploading === 'image'}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {uploading === 'image' ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                  {form.imageUrl && (
                    <div className="relative inline-block">
                      <img
                        src={form.imageUrl}
                        alt="Preview"
                        className="h-24 rounded border border-gray-200 bg-white object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        onLoad={(e) => { e.currentTarget.style.display = ''; }}
                      />
                      <button
                        type="button"
                        onClick={() => handleChange('imageUrl', '')}
                        className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-0.5 shadow"
                        aria-label="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Video
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={form.videoUrl}
                      onChange={(e) => handleChange('videoUrl', e.target.value)}
                      placeholder="Paste a video file URL or upload (MP4, WebM, up to 50MB)"
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => handleMediaUpload(e, 'video')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={uploading === 'video'}
                      onClick={() => videoInputRef.current?.click()}
                    >
                      {uploading === 'video' ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                  {form.videoUrl && (
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="truncate">{form.videoUrl}</span>
                      <button
                        type="button"
                        onClick={() => handleChange('videoUrl', '')}
                        className="text-red-500 font-semibold shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Youtube className="w-3.5 h-3.5" /> YouTube link
                  </Label>
                  <Input
                    value={form.youtubeUrl}
                    onChange={(e) => handleChange('youtubeUrl', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={errors.youtubeUrl ? 'border-red-500' : ''}
                  />
                  {errors.youtubeUrl && <p className="text-[11px] text-red-500">{errors.youtubeUrl}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Pin to top</Label>
                <Switch checked={form.isPinned} onCheckedChange={(val) => handleChange('isPinned', val)} />
              </div>

              {!editing && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-700">Notify active agents</Label>
                  <Switch checked={form.notifyAgents} onCheckedChange={(val) => handleChange('notifyAgents', val)} />
                </div>
              )}
            </div>

            <DialogFooter className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || Boolean(uploading)} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
                {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Publish'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default NewsPage;
