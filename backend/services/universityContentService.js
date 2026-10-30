const { randomUUID: uuidv4 } = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { University, UniversityUpdate, Course } = require('../models');
const { putObject, getObject, deleteObject, generateStoragePath } = require('../utils/storage');
const { parseCourseTuitionFee } = require('../utils/tuitionUtils');
const { isUuid, fail } = require('../utils/universityContent');
const { notifyAgents } = require('../controllers/notificationController');
const { assertCanAccessUniversity } = require('../utils/universityAccess');

// What the Head of Admission publishes about a university besides its basic details:
// courses with what the student pays and what the agent earns, brochures, and news / scholarship updates.
// Agents can read all of it and change none of it (the routes enforce that).

const MAX_BROCHURES = 20;
const MAX_PHOTOS = 30;
const UPDATE_TYPES = ['news', 'scholarship'];

const round2 = (n) => Math.round(n * 100) / 100;

const loadUniversity = async (id) => {
  if (!isUuid(id)) throw fail('Invalid university id');
  const university = await University.findByPk(id);
  if (!university) {
    const err = new Error('University not found');
    err.statusCode = 404;
    throw err;
  }
  return university;
};

// Telling agents must never break publishing
const tellAgents = (payload) =>
  notifyAgents(payload).catch((error) => console.error('University content notification error:', error.message));

class UniversityContentService {
  /**
   * Courses of a university with what each student pays (tuition) and the commission the agent earns:
   * tuition x the university's commission rate. A course with no university, or a list of universities
   * that includes this one, is offered here too. Agents only see active courses.
   */
  async getCourses(universityId, currentUser) {
    const university = await loadUniversity(universityId);
    assertCanAccessUniversity(currentUser, university);

    const where = {
      [Op.or]: [
        { universityId },
        { universityId: null },
        sequelize.literal(`"Course"."universityIds"::text LIKE '%${universityId}%'`),
        sequelize.literal(`"Course"."universityIds" IS NULL OR "Course"."universityIds"::text = '[]'`)
      ]
    };
    if (currentUser.role === 'agent') where.status = 'active';

    const courses = await Course.findAll({ where, order: [['name', 'ASC']] });
    const rate = university.commissionRate !== null && university.commissionRate !== undefined
      ? parseFloat(university.commissionRate)
      : null;

    return {
      commissionRate: rate,
      courses: courses.map((course) => {
        const tuitionAmount = parseCourseTuitionFee(course.tuitionFee);
        return {
          id: course.id,
          name: course.name,
          code: course.code,
          level: course.level,
          department: course.department,
          duration: course.duration,
          status: course.status,
          tuitionFee: course.tuitionFee,
          tuitionAmount,
          commissionRate: rate > 0 ? rate : null,
          commissionAmount: rate > 0 && tuitionAmount ? round2(tuitionAmount * (rate / 100)) : null
        };
      })
    };
  }

  // ── Brochures ──

  async addBrochure(universityId, file, title, currentUser) {
    if (!file) throw fail('Please choose a brochure file');
    const university = await loadUniversity(universityId);

    const brochures = Array.isArray(university.brochures) ? university.brochures : [];
    if (brochures.length >= MAX_BROCHURES) throw fail(`A university can have at most ${MAX_BROCHURES} brochures`);

    const cleanTitle = (typeof title === 'string' && title.trim()) || file.originalname.replace(/\.[^.]+$/, '');
    if (cleanTitle.length > 150) throw fail('The brochure title must be at most 150 characters');

    const path = generateStoragePath(`universities/${university.id}/brochures`, file.originalname);
    const result = await putObject(path, file.buffer, file.mimetype);

    // A new array (not an edit in place) so the change is saved
    university.brochures = [
      ...brochures,
      {
        id: uuidv4(),
        title: cleanTitle,
        fileName: file.originalname,
        fileUrl: result.path,
        contentType: file.mimetype,
        size: result.size || file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser.id
      }
    ];
    await university.save();

    await tellAgents({
      title: 'New university brochure',
      message: `A new brochure "${cleanTitle}" was added for ${university.name}.`,
      relatedId: university.id,
      relatedModel: 'University'
    });

    return university.toJSON();
  }

  async removeBrochure(universityId, brochureId, currentUser) {
    const university = await loadUniversity(universityId);
    const brochures = Array.isArray(university.brochures) ? university.brochures : [];
    const brochure = brochures.find((b) => b.id === brochureId);
    if (!brochure) {
      const err = new Error('Brochure not found');
      err.statusCode = 404;
      throw err;
    }

    try {
      await deleteObject(brochure.fileUrl);
    } catch (error) {
      console.error('Brochure file could not be deleted:', error.message);
    }
    university.brochures = brochures.filter((b) => b.id !== brochureId);
    await university.save();
    return university.toJSON();
  }

  async getBrochureFile(universityId, brochureId, currentUser) {
    const university = await loadUniversity(universityId);
    assertCanAccessUniversity(currentUser, university);
    const brochures = Array.isArray(university.brochures) ? university.brochures : [];
    const brochure = brochures.find((b) => b.id === brochureId);
    if (!brochure) {
      const err = new Error('Brochure not found');
      err.statusCode = 404;
      throw err;
    }
    const { data, contentType } = await getObject(brochure.fileUrl);
    return { data, contentType: contentType || brochure.contentType, fileName: brochure.fileName };
  }

  // ── Photos (About section) ──

  async addPhotos(universityId, files, caption, currentUser) {
    if (!files || files.length === 0) throw fail('Please choose at least one photo');
    const university = await loadUniversity(universityId);

    const photos = Array.isArray(university.photos) ? university.photos : [];
    if (photos.length + files.length > MAX_PHOTOS) throw fail(`A university can have at most ${MAX_PHOTOS} photos`);

    const cleanCaption = typeof caption === 'string' ? caption.trim() : '';
    if (cleanCaption.length > 150) throw fail('The caption must be at most 150 characters');

    const added = [];
    for (const file of files) {
      const path = generateStoragePath(`universities/${university.id}/photos`, file.originalname);
      const result = await putObject(path, file.buffer, file.mimetype);
      added.push({
        id: uuidv4(),
        caption: cleanCaption,
        fileName: file.originalname,
        fileUrl: result.path,
        contentType: file.mimetype,
        size: result.size || file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser.id
      });
    }

    // A new array (not an edit in place) so the change is saved
    university.photos = [...photos, ...added];
    await university.save();
    return university.toJSON();
  }

  async removePhoto(universityId, photoId) {
    const university = await loadUniversity(universityId);
    const photos = Array.isArray(university.photos) ? university.photos : [];
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) {
      const err = new Error('Photo not found');
      err.statusCode = 404;
      throw err;
    }

    try {
      await deleteObject(photo.fileUrl);
    } catch (error) {
      console.error('Photo file could not be deleted:', error.message);
    }
    university.photos = photos.filter((p) => p.id !== photoId);
    await university.save();
    return university.toJSON();
  }

  async getPhotoFile(universityId, photoId, currentUser) {
    const university = await loadUniversity(universityId);
    assertCanAccessUniversity(currentUser, university);
    const photos = Array.isArray(university.photos) ? university.photos : [];
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) {
      const err = new Error('Photo not found');
      err.statusCode = 404;
      throw err;
    }
    const { data, contentType } = await getObject(photo.fileUrl);
    return { data, contentType: contentType || photo.contentType, fileName: photo.fileName };
  }

  // ── News and scholarship updates ──

  _parseUpdate(data, { partial = false } = {}) {
    const out = {};

    if (!partial || data.type !== undefined) {
      if (!UPDATE_TYPES.includes(data.type)) throw fail(`Type must be one of: ${UPDATE_TYPES.join(', ')}`);
      out.type = data.type;
    }
    if (!partial || data.title !== undefined) {
      const title = typeof data.title === 'string' ? data.title.trim() : '';
      if (!title) throw fail('A title is required');
      if (title.length > 200) throw fail('The title must be at most 200 characters');
      out.title = title;
    }
    if (!partial || data.content !== undefined) {
      const content = typeof data.content === 'string' ? data.content.trim() : '';
      if (!content) throw fail('The text of the update is required');
      if (content.length > 5000) throw fail('The text must be at most 5000 characters');
      out.content = content;
    }
    if (data.amount !== undefined) {
      const amount = typeof data.amount === 'string' ? data.amount.trim() : String(data.amount ?? '').trim();
      if (amount.length > 100) throw fail('The amount must be at most 100 characters');
      out.amount = amount || null;
    }
    if (data.deadline !== undefined) {
      if (data.deadline === null || data.deadline === '') {
        out.deadline = null;
      } else {
        const date = new Date(data.deadline);
        if (isNaN(date.getTime())) throw fail('The deadline is not a valid date');
        out.deadline = date.toISOString().slice(0, 10);
      }
    }
    return out;
  }

  async listUpdates(universityId, currentUser) {
    assertCanAccessUniversity(currentUser, await loadUniversity(universityId));
    const updates = await UniversityUpdate.findAll({
      where: { universityId },
      order: [['publishedAt', 'DESC']]
    });
    return updates.map((u) => u.toJSON());
  }

  async createUpdate(universityId, data, currentUser) {
    const university = await loadUniversity(universityId);
    const fields = this._parseUpdate(data || {});

    const update = await UniversityUpdate.create({
      ...fields,
      universityId: university.id,
      publishedAt: new Date(),
      createdBy: currentUser.id
    });

    // Publishing tells the agents (in the portal and by email), unless the author turns it off
    if (data.notifyAgents !== false && data.notifyAgents !== 'false') {
      const label = update.type === 'scholarship' ? 'Scholarship' : 'News';
      const preview = update.content.length > 140 ? `${update.content.slice(0, 137)}...` : update.content;
      await tellAgents({
        title: `${label}: ${update.title}`,
        message: `${university.name}. ${preview}`,
        relatedId: university.id,
        relatedModel: 'University'
      });
    }

    return update.toJSON();
  }

  async updateUpdate(universityId, updateId, data, currentUser) {
    await loadUniversity(universityId);
    const update = await UniversityUpdate.findOne({ where: { id: updateId, universityId } });
    if (!update) {
      const err = new Error('Update not found');
      err.statusCode = 404;
      throw err;
    }
    Object.assign(update, this._parseUpdate(data || {}, { partial: true }));
    await update.save();
    return update.toJSON();
  }

  async deleteUpdate(universityId, updateId, currentUser) {
    await loadUniversity(universityId);
    const update = await UniversityUpdate.findOne({ where: { id: updateId, universityId } });
    if (!update) {
      const err = new Error('Update not found');
      err.statusCode = 404;
      throw err;
    }
    await update.destroy();
    return { success: true };
  }
}

module.exports = new UniversityContentService();
