const fs = require('fs');
const path = require('path');

const APP_NAME = 'admin-portal';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize storage
const initStorage = async () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  console.log('✅ Local file storage ready at:', UPLOADS_DIR);
  return 'local';
};

// Upload file to local storage
const putObject = async (storagePath, data, contentType) => {
  try {
    const localPath = path.join(UPLOADS_DIR, storagePath.replace(`${APP_NAME}/`, ''));
    const dir = path.dirname(localPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(localPath, data);

    return {
      path: storagePath,
      size: data.length,
      storage: 'local'
    };
  } catch (error) {
    console.error('Local file write failed:', error.message);
    throw new Error('File upload failed');
  }
};

// Download file from local storage
const getObject = async (storagePath) => {
  try {
    const localPath = path.join(UPLOADS_DIR, storagePath.replace(`${APP_NAME}/`, ''));
    if (fs.existsSync(localPath)) {
      const data = fs.readFileSync(localPath);
      const ext = path.extname(localPath).toLowerCase();
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain',
        '.csv': 'text/csv'
      };

      return {
        data,
        contentType: mimeTypes[ext] || 'application/octet-stream'
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
    const localPath = path.join(UPLOADS_DIR, storagePath.replace(`${APP_NAME}/`, ''));
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    return true;
  } catch (error) {
    console.error('Local file delete failed:', error.message);
    return false;
  }
};

// Generate storage path
const generateStoragePath = (folder, filename) => {
  const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
  const uuid = require('uuid').v4();
  return `${APP_NAME}/${folder}/${uuid}.${ext}`;
};

module.exports = {
  initStorage,
  putObject,
  getObject,
  deleteObject,
  generateStoragePath
};
