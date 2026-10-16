const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getNews,
  uploadMedia,
  getNewsItem,
  createNews,
  updateNews,
  deleteNews
} = require('../controllers/newsController');
const { protect, restrictTo } = require('../middleware/auth');

const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype) || /^video\/(mp4|webm|quicktime)$/.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only PNG, JPG, GIF, WebP images or MP4, WebM, MOV videos are allowed'));
  }
});

router.use(protect);

// Readable by all authenticated users
router.get('/', getNews);
router.get('/:id', getNewsItem);

// Admin only
router.post('/media', restrictTo('admin'), mediaUpload.single('file'), uploadMedia);
router.post('/', restrictTo('admin'), createNews);
router.put('/:id', restrictTo('admin'), updateNews);
router.delete('/:id', restrictTo('admin'), deleteNews);

module.exports = router;
