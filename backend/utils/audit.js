const { AsyncLocalStorage } = require('async_hooks');

// Central audit log capture.
//
// How it works: a middleware keeps the current request in an AsyncLocalStorage, the auth middleware
// records who is signed in, and global Sequelize hooks write one AuditLog row whenever any record is
// created, updated or deleted. So every change is logged with its author without touching each controller.
//
// Not logged: the audit log itself, notifications and password reset tokens (noise or secrets), and
// bulk SQL updates that bypass instance hooks (startup backfills, "mark all as read").

const store = new AsyncLocalStorage();

// Express middleware: starts a context for the request
const auditContext = (req, res, next) => store.run({ req, user: null }, next);

// Called by the auth middleware once the user is known
const setAuditActor = (user) => {
  const context = store.getStore();
  if (context) context.user = user;
};

const SKIPPED_MODELS = new Set(['AuditLog', 'Notification', 'PasswordResetToken', 'ChatMessage']);

// Fields that change on every save or carry no business meaning
const IGNORED_FIELDS = new Set(['createdAt', 'updatedAt', 'id', '_id']);

const SECRET_FIELD = /password|token|secret|hash/i;
// Values are not copied, only the fact that they changed (personal or financial details)
const PRIVATE_FIELD = /^bank|^declaration.*Number$|^idNumber$|^eCertificateNumber$/i;

const MAX_VALUE_LENGTH = 300;

// What is safe and useful to store for one field value
const presentValue = (field, value) => {
  if (value === null || value === undefined) return null;
  if (SECRET_FIELD.test(field)) return '[hidden]';
  if (PRIVATE_FIELD.test(field)) return '[changed]';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return '[changed]'; // JSON documents and arrays: histories, files
  if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) return `${value.slice(0, MAX_VALUE_LENGTH)}...`;
  return value;
};

// { field: { from, to } } for the fields that really changed
const buildChanges = (instance) => {
  const changes = {};
  for (const field of instance.changed() || []) {
    if (IGNORED_FIELDS.has(field)) continue;
    const from = instance.previous(field);
    const to = instance.get(field);
    // Same value saved again, or two equal dates / structures
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    changes[field] = { from: presentValue(field, from), to: presentValue(field, to) };
  }
  return changes;
};

const entityTypeOf = (instance) => {
  const name = instance.constructor.name;
  if (name === 'User') return instance.get('role') === 'agent' ? 'Agent' : 'Staff';
  if (name === 'NewsItem') return 'News';
  if (name === 'AgentInvite') return 'Agent invite';
  return name;
};

const labelOf = (instance) => {
  for (const field of ['applicationNumber', 'invoiceNumber', 'payoffNumber', 'name', 'title', 'subject', 'email']) {
    const value = instance.get(field);
    if (value) return String(value).slice(0, 255);
  }
  return null;
};

const actorOf = () => {
  const context = store.getStore();
  const user = context && context.user;
  if (!user) return { actorId: null, actorName: 'System', actorRole: 'system' };
  const role = user.role === 'admin' ? (user.staffRole || 'super_admin') : (user.role || 'user');
  return { actorId: String(user.id), actorName: user.name || user.email || 'Unknown', actorRole: role };
};

const requestOf = () => {
  const context = store.getStore();
  const req = context && context.req;
  if (!req) return { endpoint: null, ip: null };
  return {
    endpoint: `${req.method} ${String(req.originalUrl || req.url || '').split('?')[0]}`.slice(0, 300),
    ip: String(req.ip || (req.socket && req.socket.remoteAddress) || '').slice(0, 64) || null
  };
};

const summarize = (action, type, label, changes) => {
  const name = label ? `${type} ${label}` : type;
  if (action === 'create') return `Created ${name}`;
  if (action === 'delete') return `Deleted ${name}`;
  const fields = Object.keys(changes);
  const shown = fields.slice(0, 3).map((field) => {
    const { from, to } = changes[field];
    const plain = (v) => (v === null ? 'empty' : String(v));
    return ['[hidden]', '[changed]'].includes(to) ? field : `${field} (${plain(from)} → ${plain(to)})`;
  });
  const more = fields.length > 3 ? ` and ${fields.length - 3} more` : '';
  return `Updated ${name}: ${shown.join(', ')}${more}`;
};

/**
 * Installs the hooks. Call once after the models are loaded.
 * `write` is injectable so the capture logic can be tested without a database.
 */
const installAuditHooks = (sequelize, AuditLog, write = (row) => AuditLog.create(row)) => {
  const record = (instance, options, action, changes) => {
    const row = {
      at: new Date(),
      ...actorOf(),
      action,
      entityType: entityTypeOf(instance),
      entityId: String(instance.get('id')),
      entityLabel: labelOf(instance),
      changes: action === 'update' ? changes : null,
      ...requestOf()
    };
    row.summary = summarize(action, row.entityType, row.entityLabel, changes || {});

    const save = () => Promise.resolve(write(row)).catch((error) => console.error('Audit log error:', error.message));
    // Inside a transaction, log only once it has committed (a rolled-back change never happened)
    if (options && options.transaction && typeof options.transaction.afterCommit === 'function') {
      options.transaction.afterCommit(save);
    } else {
      save();
    }
  };

  const skip = (instance) => SKIPPED_MODELS.has(instance.constructor.name);

  sequelize.addHook('afterCreate', (instance, options) => {
    if (skip(instance)) return;
    record(instance, options, 'create');
  });

  // Capture the old and new values before they are saved
  sequelize.addHook('beforeUpdate', (instance) => {
    if (skip(instance)) return;
    instance._auditChanges = buildChanges(instance);
  });

  sequelize.addHook('afterUpdate', (instance, options) => {
    if (skip(instance)) return;
    const changes = instance._auditChanges;
    delete instance._auditChanges;
    if (!changes || Object.keys(changes).length === 0) return;
    record(instance, options, 'update', changes);
  });

  sequelize.addHook('afterDestroy', (instance, options) => {
    if (skip(instance)) return;
    record(instance, options, 'delete');
  });
};

module.exports = { auditContext, setAuditActor, installAuditHooks, buildChanges, summarize, presentValue };
