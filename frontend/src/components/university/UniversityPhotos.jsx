import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Upload, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { universityAPI, formatApiError } from '../../utils/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

// Photos sit behind authentication, so they are fetched with the token and shown from a blob URL
const usePhotoUrls = (universityId, photos) => {
  const [urls, setUrls] = useState({});
  const cache = useRef({});

  useEffect(() => {
    let cancelled = false;
    const ids = new Set(photos.map((p) => p.id));

    Object.keys(cache.current).forEach((photoId) => {
      if (!ids.has(photoId)) {
        window.URL.revokeObjectURL(cache.current[photoId]);
        delete cache.current[photoId];
      }
    });

    photos.filter((p) => !cache.current[p.id]).forEach(async (photo) => {
      try {
        const res = await universityAPI.getPhoto(universityId, photo.id);
        if (cancelled) return;
        cache.current[photo.id] = window.URL.createObjectURL(res.data);
      } catch {
        cache.current[photo.id] = '';
      }
      if (!cancelled) setUrls({ ...cache.current });
    });

    setUrls({ ...cache.current });
    return () => { cancelled = true; };
  }, [universityId, photos]);

  useEffect(() => () => {
    Object.values(cache.current).forEach((url) => url && window.URL.revokeObjectURL(url));
    cache.current = {};
  }, [universityId]);

  return urls;
};

/**
 * Campus photos in the About section. Everyone can look; only `canManage` (Head of Admission) can add or remove.
 */
const UniversityPhotos = ({ university, canManage, onChanged }) => {
  const photos = Array.isArray(university.photos) ? university.photos : [];
  const urls = usePhotoUrls(university.id, photos);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(null);
  const fileRef = useRef(null);

  if (!canManage && photos.length === 0) return null;

  const upload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      await universityAPI.uploadPhotos(university.id, files, caption.trim());
      toast.success(files.length === 1 ? 'Photo added' : `${files.length} photos added`);
      setCaption('');
      onChanged && onChanged();
    } catch (error) {
      toast.error('Could not add the photos', { description: formatApiError(error) });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (photo) => {
    if (!window.confirm('Remove this photo?')) return;
    try {
      await universityAPI.deletePhoto(university.id, photo.id);
      toast.success('Photo removed');
      onChanged && onChanged();
    } catch (error) {
      toast.error('Could not remove the photo', { description: formatApiError(error) });
    }
  };

  return (
    <Card className="border-[#E5E7EB] bg-white shadow-none">
      <CardHeader className="border-b border-gray-100 px-6 py-4">
        <CardTitle className="text-sm font-bold text-gray-900 font-['Outfit'] flex items-center gap-2">
          <ImageIcon size={16} className="text-[#042C53]" /> University photos {photos.length > 0 && `(${photos.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {photos.length === 0 ? (
          <p className="text-sm text-gray-500">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <figure key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                <button
                  type="button"
                  onClick={() => urls[photo.id] && setViewing(photo)}
                  className="block w-full aspect-[4/3]"
                  aria-label={photo.caption || photo.fileName}
                >
                  {urls[photo.id] ? (
                    <img src={urls[photo.id]} alt={photo.caption || photo.fileName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-gray-100" />
                  )}
                </button>
                {photo.caption && (
                  <figcaption className="px-2 py-1.5 text-[11px] text-gray-600 truncate">{photo.caption}</figcaption>
                )}
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1.5 right-1.5 h-7 w-7 p-0 bg-white/90 text-red-600 hover:bg-white opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="Remove photo"
                    onClick={() => remove(photo)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </figure>
            ))}
          </div>
        )}

        {canManage && (
          <div className="flex flex-wrap items-end gap-2 pt-4 border-t border-gray-100">
            <div className="space-y-1">
              <Label className="text-xs">Caption (optional)</Label>
              <Input className="h-9 w-64" value={caption} maxLength={150} onChange={(e) => setCaption(e.target.value)} />
            </div>
            <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={upload} />
            <Button size="sm" className="h-9 text-xs gap-1" disabled={uploading} onClick={() => fileRef.current && fileRef.current.click()}>
              <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload photos'}
            </Button>
            <span className="text-[11px] text-gray-500">JPG, PNG or WebP, up to 5 MB each</span>
          </div>
        )}
      </CardContent>

      {viewing && urls[viewing.id] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewing(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/90 flex items-center justify-center"
            aria-label="Close"
            onClick={() => setViewing(null)}
          >
            <X size={18} />
          </button>
          <figure className="max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={urls[viewing.id]} alt={viewing.caption || viewing.fileName} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
            {viewing.caption && <figcaption className="mt-2 text-center text-sm text-white">{viewing.caption}</figcaption>}
          </figure>
        </div>
      )}
    </Card>
  );
};

export default UniversityPhotos;
