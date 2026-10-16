const { NewsItem, User, Notification } = require('../models');
const { putObject, generateStoragePath } = require('../utils/storage');
const { notifyUsers } = require('./notificationController');

const CATEGORIES = ['news', 'update'];

const YOUTUBE_REGEX = /^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{11}/i;

// Returns the cleaned value, null for blank, or undefined when invalid
const cleanMedia = (value, validator) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return validator(trimmed) ? trimmed : undefined;
};
const isUrlOrUploadPath = (v) => /^https?:\/\//i.test(v) || v.startsWith('/uploads/news-media/');

const withAuthor = {
  model: User,
  as: 'author',
  attributes: ['id', 'name']
};

const sendError = (res, error, label) => {
  console.error(`${label}:`, error);
  res.status(error.statusCode || 500).json({
    success: false,
    detail: error.message || 'Server error'
  });
};

// @desc    Upload an image or video for a news item
// @route   POST /api/news/media
// @access  Private (Admin only)
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, detail: 'No file uploaded' });
    }
    const storagePath = generateStoragePath('news-media', req.file.originalname);
    await putObject(storagePath, req.file.buffer, req.file.mimetype);
    const filename = storagePath.split('/').pop();
    res.status(201).json({
      path: `/uploads/news-media/${filename}`,
      type: req.file.mimetype.startsWith('video/') ? 'video' : 'image'
    });
  } catch (error) {
    sendError(res, error, 'Upload news media error');
  }
};

// @desc    List news & updates (pinned first, newest first)
// @route   GET /api/news
// @access  Private
exports.getNews = async (req, res) => {
  try {
    const where = {};
    if (req.query.category && CATEGORIES.includes(req.query.category)) {
      where.category = req.query.category;
    }
    const items = await NewsItem.findAll({
      where,
      include: [withAuthor],
      order: [['isPinned', 'DESC'], ['publishedAt', 'DESC']]
    });
    res.status(200).json(items.map(item => item.toJSON()));
  } catch (error) {
    sendError(res, error, 'Get news error');
  }
};

// @desc    Get a single news item
// @route   GET /api/news/:id
// @access  Private
exports.getNewsItem = async (req, res) => {
  try {
    const item = await NewsItem.findByPk(req.params.id, { include: [withAuthor] });
    if (!item) {
      return res.status(404).json({ success: false, detail: 'News item not found' });
    }
    res.status(200).json(item.toJSON());
  } catch (error) {
    sendError(res, error, 'Get news item error');
  }
};

// @desc    Publish a news item or update
// @route   POST /api/news
// @access  Private (Admin only)
exports.createNews = async (req, res) => {
  try {
    const { title, content, category, isPinned, publishedAt, notifyAgents } = req.body;
    const imageUrl = cleanMedia(req.body.imageUrl, isUrlOrUploadPath);
    const videoUrl = cleanMedia(req.body.videoUrl, isUrlOrUploadPath);
    const youtubeUrl = cleanMedia(req.body.youtubeUrl, (v) => YOUTUBE_REGEX.test(v));

    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ success: false, detail: 'Title and content are required' });
    }
    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, detail: `Category must be one of: ${CATEGORIES.join(', ')}` });
    }

    if (imageUrl === undefined || videoUrl === undefined) {
      return res.status(400).json({ success: false, detail: 'Invalid image or video link' });
    }
    if (youtubeUrl === undefined) {
      return res.status(400).json({ success: false, detail: 'Enter a valid YouTube link' });
    }

    const item = await NewsItem.create({
      title: title.trim(),
      content: content.trim(),
      category: category || 'news',
      imageUrl,
      videoUrl,
      youtubeUrl,
      isPinned: Boolean(isPinned),
      publishedAt: publishedAt || new Date(),
      createdBy: req.user.id
    });

    if (notifyAgents) {
      try {
        const agents = await User.findAll({ where: { role: 'agent', status: 'active' }, attributes: ['id'] });
        await notifyUsers(agents.map(agent => ({
          recipient: agent.id,
          title: item.category === 'update' ? `Update: ${item.title}` : `News: ${item.title}`,
          message: item.content.length > 140 ? `${item.content.slice(0, 137)}...` : item.content,
          type: 'info',
          relatedId: item.id,
          relatedModel: 'News'
        })));
      } catch (notifyErr) {
        console.warn('News notification error:', notifyErr.message);
      }
    }

    res.status(201).json(item.toJSON());
  } catch (error) {
    sendError(res, error, 'Create news error');
  }
};

// @desc    Update a news item
// @route   PUT /api/news/:id
// @access  Private (Admin only)
exports.updateNews = async (req, res) => {
  try {
    const item = await NewsItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, detail: 'News item not found' });
    }

    const { title, content, category, isPinned, publishedAt } = req.body;

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ success: false, detail: 'Title cannot be empty' });
      item.title = title.trim();
    }
    if (content !== undefined) {
      if (!content.trim()) return res.status(400).json({ success: false, detail: 'Content cannot be empty' });
      item.content = content.trim();
    }
    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, detail: `Category must be one of: ${CATEGORIES.join(', ')}` });
      }
      item.category = category;
    }
    const media = [
      ['imageUrl', isUrlOrUploadPath, 'Invalid image link'],
      ['videoUrl', isUrlOrUploadPath, 'Invalid video link'],
      ['youtubeUrl', (v) => YOUTUBE_REGEX.test(v), 'Enter a valid YouTube link']
    ];
    for (const [field, validator, message] of media) {
      if (req.body[field] === undefined) continue;
      const cleaned = cleanMedia(req.body[field], validator);
      if (cleaned === undefined) {
        return res.status(400).json({ success: false, detail: message });
      }
      item[field] = cleaned;
    }
    if (isPinned !== undefined) item.isPinned = Boolean(isPinned);
    if (publishedAt !== undefined) item.publishedAt = publishedAt;

    await item.save();
    res.status(200).json(item.toJSON());
  } catch (error) {
    sendError(res, error, 'Update news error');
  }
};

// @desc    Delete a news item
// @route   DELETE /api/news/:id
// @access  Private (Admin only)
exports.deleteNews = async (req, res) => {
  try {
    const item = await NewsItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, detail: 'News item not found' });
    }
    await item.destroy();
    res.status(200).json({ success: true, message: 'News item deleted successfully' });
  } catch (error) {
    sendError(res, error, 'Delete news error');
  }
};
