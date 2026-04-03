const axios = require('axios');

const STORAGE_URL = 'https://integrations.emergentagent.com/objstore/api/v1/storage';
const APP_NAME = 'admin-portal';

let storageKey = null;

// Initialize storage - call once at startup
const initStorage = async () => {
  if (storageKey) return storageKey;
  
  const emergentKey = process.env.EMERGENT_LLM_KEY;
  if (!emergentKey) {
    console.warn('⚠️ EMERGENT_LLM_KEY not set, file uploads will be disabled');
    return null;
  }
  
  try {
    const response = await axios.post(`${STORAGE_URL}/init`, {
      emergent_key: emergentKey
    }, { timeout: 30000 });
    
    storageKey = response.data.storage_key;
    console.log('✅ Object storage initialized successfully');
    return storageKey;
  } catch (error) {
    console.error('❌ Failed to initialize object storage:', error.message);
    return null;
  }
};

// Upload file to storage
const putObject = async (path, data, contentType) => {
  const key = await initStorage();
  if (!key) {
    throw new Error('Object storage not available');
  }
  
  try {
    const response = await axios.put(
      `${STORAGE_URL}/objects/${path}`,
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
    return response.data;
  } catch (error) {
    console.error('File upload failed:', error.message);
    throw new Error('File upload failed');
  }
};

// Download file from storage
const getObject = async (path) => {
  const key = await initStorage();
  if (!key) {
    throw new Error('Object storage not available');
  }
  
  try {
    const response = await axios.get(
      `${STORAGE_URL}/objects/${path}`,
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
    console.error('File download failed:', error.message);
    throw new Error('File download failed');
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
  generateStoragePath
};
