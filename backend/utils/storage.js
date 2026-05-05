const axios = require('axios');
const fs = require('fs');
const path = require('path');

const STORAGE_URL = 'https://integrations.emergentagent.com/objstore/api/v1/storage';
const APP_NAME = 'admin-portal';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let storageKey = null;
let useLocalStorage = false;

// Initialize storage - call once at startup
const initStorage = async () => {
  if (storageKey) return storageKey;
  if (useLocalStorage) return null;
  
  const emergentKey = process.env.EMERGENT_LLM_KEY;
  if (!emergentKey) {
    console.warn('⚠️ EMERGENT_LLM_KEY not set, using local storage fallback');
    useLocalStorage = true;
    return null;
  }
  
  try {
    const response = await axios.post(`${STORAGE_URL}/init`, {
      emergent_key: emergentKey
    }, { timeout: 15000 }); // Reduced timeout for faster fallback
    
    storageKey = response.data.storage_key;
    console.log('✅ Object storage initialized successfully');
    return storageKey;
  } catch (error) {
    console.error('❌ Failed to initialize object storage:', error.message);
    console.warn('⚠️ Switching to local storage fallback');
    useLocalStorage = true;
    return null;
  }
};

// Upload file to storage
const putObject = async (storagePath, data, contentType) => {
  const key = await initStorage();
  
  if (!key || useLocalStorage) {
    // Local storage fallback
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
      throw new Error('File upload failed (local fallback)');
    }
  }
  
  try {
    const response = await axios.put(
      `${STORAGE_URL}/objects/${storagePath}`,
      data,
      {
        headers: {
          'X-Storage-Key': key,
          'Content-Type': contentType
        },
        timeout: 120000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );
    return { ...response.data, storage: 'remote' };
  } catch (error) {
    console.error('Remote file upload failed:', error.message);
    // Try local fallback as a last resort
    useLocalStorage = true;
    return putObject(storagePath, data, contentType);
  }
};

// Download file from storage
const getObject = async (storagePath) => {
  // Try remote first if not explicitly using local
  if (!useLocalStorage) {
    const key = await initStorage();
    if (key) {
      try {
        const response = await axios.get(
          `${STORAGE_URL}/objects/${storagePath}`,
          {
            headers: { 'X-Storage-Key': key },
            timeout: 60000,
            responseType: 'arraybuffer'
          }
        );
        return {
          data: response.data,
          contentType: response.headers['content-type'] || 'application/octet-stream'
        };
      } catch (error) {
        console.error('Remote file download failed:', error.message);
        // If not found remotely, we'll try local next
      }
    }
  }
  
  // Local storage fallback
  try {
    const localPath = path.join(UPLOADS_DIR, storagePath.replace(`${APP_NAME}/`, ''));
    if (fs.existsSync(localPath)) {
      const data = fs.readFileSync(localPath);
      // Basic content type detection based on extension
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

// Delete file from storage
const deleteObject = async (storagePath) => {
  if (!useLocalStorage) {
    const key = await initStorage();
    if (key) {
      try {
        await axios.delete(
          `${STORAGE_URL}/objects/${storagePath}`,
          {
            headers: { 'X-Storage-Key': key }
          }
        );
        return true;
      } catch (error) {
        console.error('Remote file delete failed:', error.message);
      }
    }
  }
  
  // Local storage fallback
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
