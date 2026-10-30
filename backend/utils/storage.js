const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APP_NAME = 'admin-portal';
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// What may be stored: extension -> content type served back. Nothing that a browser would run
// (.html, .svg, .js ...) is ever accepted, whatever the upload claims to be.
const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain',
  '.csv': 'text/csv'
};

const invalidFile = (message = 'Invalid file type') => {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
};

// The first bytes of a real file of each type. Checked so a renamed or mislabelled file is refused.
const startsWith = (data, bytes) => bytes.every((b, i) => data[i] === b);
const looksLikeText = (data) => {
  const sample = data.subarray(0, 4096);
  for (const byte of sample) {
    if (byte === 0) return false; // NUL bytes never appear in plain text
  }
  return true;
};
const SIGNATURES = {
  '.pdf': (d) => startsWith(d, [0x25, 0x50, 0x44, 0x46]), // %PDF
  '.png': (d) => startsWith(d, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  '.jpg': (d) => startsWith(d, [0xff, 0xd8, 0xff]),
  '.jpeg': (d) => startsWith(d, [0xff, 0xd8, 0xff]),
  '.gif': (d) => startsWith(d, [0x47, 0x49, 0x46, 0x38]), // GIF8
  '.webp': (d) => startsWith(d, [0x52, 0x49, 0x46, 0x46]) && d.subarray(8, 12).toString('ascii') === 'WEBP', // RIFF....WEBP
  '.docx': (d) => startsWith(d, [0x50, 0x4b, 0x03, 0x04]), // zip container
  '.doc': (d) => startsWith(d, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), // OLE2
  '.txt': looksLikeText,
  '.csv': looksLikeText
};

const extensionOf = (filename) => {
  const ext = path.extname(String(filename || '')).toLowerCase();
  return MIME_TYPES[ext] ? ext : null;
};

// Resolves a stored path inside the uploads folder. Anything that would leave it is refused.
const resolveInUploads = (storagePath) => {
  const relative = String(storagePath || '').replace(`${APP_NAME}/`, '');
  const resolved = path.resolve(UPLOADS_DIR, relative);
  if (resolved !== UPLOADS_DIR && !resolved.startsWith(UPLOADS_DIR + path.sep)) {
    throw invalidFile('Invalid file path');
  }
  return resolved;
};

// Initialize storage
const initStorage = async () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  console.log('✅ Local file storage ready');
  return 'local';
};

// Upload file to local storage
const putObject = async (storagePath, data, contentType) => {
  const ext = extensionOf(storagePath);
  if (!ext) throw invalidFile();
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (buffer.length === 0 || !SIGNATURES[ext](buffer)) {
    throw invalidFile('File content does not match its type');
  }

  try {
    const localPath = resolveInUploads(storagePath);
    const dir = path.dirname(localPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(localPath, buffer);

    return {
      path: storagePath,
      size: buffer.length,
      storage: 'local'
    };
  } catch (error) {
    if (error.statusCode) throw error;
    console.error('Local file write failed:', error.message);
    throw new Error('File upload failed');
  }
};

// Download file from local storage
const getObject = async (storagePath) => {
  try {
    const localPath = resolveInUploads(storagePath);
    if (fs.existsSync(localPath)) {
      const data = fs.readFileSync(localPath);
      const ext = path.extname(localPath).toLowerCase();
      return {
        data,
        contentType: MIME_TYPES[ext] || 'application/octet-stream'
      };
    }
    throw new Error('File not found locally');
  } catch (error) {
    console.error('File download failed:', error.message);
    throw new Error('File download failed');
  }
};

// Delete file from local storage
const deleteObject = async (storagePath) => {
  try {
    const localPath = resolveInUploads(storagePath);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    return true;
  } catch (error) {
    console.error('Local file delete failed:', error.message);
    return false;
  }
};

// Generate storage path. Only a known extension is kept; the name is random, never the user's.
const generateStoragePath = (folder, filename) => {
  const ext = extensionOf(filename);
  if (!ext) throw invalidFile();
  const safeFolder = String(folder).split(/[\\/]+/).filter((p) => p && p !== '.' && p !== '..').join('/');
  return `${APP_NAME}/${safeFolder}/${crypto.randomUUID()}${ext}`;
};

module.exports = {
  initStorage,
  putObject,
  getObject,
  deleteObject,
  generateStoragePath
};
