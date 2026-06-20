// Centralised notification creation used by the automation scheduler and by
// request handlers. Notifications are deduped so periodic jobs don't spam the
// same user about the same entity repeatedly.
const Notification = require('../models/Notification');
const CRMUser = require('../models/CRMUser');
const { ROLE_HIERARCHY } = require('../routes/auth');
const { generateId } = require('../middleware/auth');

const MANAGER_LEVEL = 3; // Ops Manager and above

// Create a notification for one user, unless an equivalent one was already
// raised within `dedupeHours` (default 24h) — keyed by user + type + entity.
async function createNotification({ user_id, title, message, type = 'info', lead_id, entity_type, entity_id, link, dedupeHours = 24 }) {
  if (!user_id) return null;

  if (dedupeHours > 0) {
    const since = new Date(Date.now() - dedupeHours * 3600 * 1000);
    const existing = await Notification.findOne({
      user_id, type,
      ...(entity_id ? { entity_id } : (lead_id ? { lead_id } : {})),
      created_at: { $gte: since },
    }).lean();
    if (existing) return existing;
  }

  return Notification.create({
    id: generateId('ntf'),
    user_id, title, message, type, lead_id, entity_type, entity_id, link,
  });
}

// Names of all active users at manager level or above (for escalations).
async function managerNames() {
  const users = await CRMUser.find({ status: 'Active' }).lean();
  return users
    .filter((u) => (ROLE_HIERARCHY[u.role] || 0) >= MANAGER_LEVEL)
    .map((u) => u.name);
}

// Fan a notification out to every manager (deduped per manager).
async function notifyManagers(payload) {
  const names = await managerNames();
  await Promise.all(names.map((name) => createNotification({ ...payload, user_id: name })));
}

module.exports = { createNotification, notifyManagers, managerNames, MANAGER_LEVEL };
