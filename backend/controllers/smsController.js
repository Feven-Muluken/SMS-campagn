const {
  Campaign,
  CampaignRecipient,
  Contact,
  ContactLocation,
  User,
  Group,
  Message,
  sequelize,
  LiveLocationPing,
  CompanySenderId,
} = require('../models');
const { sendSMS } = require('../services/smsService');
const { Op } = require('sequelize');
const { personalizeMessage } = require('../utils/smsTemplate');
const { pickInbound, pickDeliveryReport } = require('../utils/africastalkingWebhooks');
const { normalizeToE164, isValidE164 } = require('../utils/phoneNormalize');

const parseInboundDate = (value) => {
  if (!value) return new Date();
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? new Date() : dt;
};

const normalizeSenderId = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

// Common Premium Sender ID constraints: alphanumeric, up to 11 chars.
// Note: Actual acceptance depends on Africa's Talking approval and country/operator rules.
const isValidSenderId = (senderId) => /^[a-zA-Z0-9]{1,11}$/.test(senderId);

const ensureSenderIdAllowedForCompany = async (req, senderId) => {
  if (!senderId) return { ok: true };

  const companyId = req.companyContext?.companyId;
  if (!companyId) {
    return {
      ok: false,
      status: 400,
      message: 'Active company context is required when using senderId.',
    };
  }

  const companySender = await CompanySenderId.findOne({
    where: {
      companyId,
      senderId,
      isActive: true,
    },
  });

  if (!companySender) {
    return {
      ok: false,
      status: 403,
      message: 'Sender ID is not approved for your active company.',
    };
  }

  return { ok: true };
};

const EARTH_RADIUS_KM = 6371;
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (Number(v) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const normalizeGeoInput = (body = {}) => {
  const centerLat = Number(body.centerLat);
  const centerLng = Number(body.centerLng);
  const radiusKm = Number(body.radiusKm);

  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
    return { error: 'Valid centerLat and centerLng are required' };
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 200) {
    return { error: 'radiusKm must be a number between 0 and 200' };
  }

  return {
    centerLat,
    centerLng,
    radiusKm,
    placeName: String(body.placeName || '').trim() || 'Selected place',
  };
};

const LIVE_LOCATION_DEFAULT_MAX_AGE_MIN = 15;

const getLiveLocationCutoff = () => {
  const m = Number(process.env.LIVE_LOCATION_MAX_AGE_MINUTES);
  const min = Number.isFinite(m) && m > 0 && m <= 24 * 60 ? m : LIVE_LOCATION_DEFAULT_MAX_AGE_MIN;
  return new Date(Date.now() - min * 60 * 1000);
};

const verifyLiveLocationIngestKey = (req, res, next) => {
  const expected = process.env.LIVE_LOCATION_INGEST_KEY;
  if (!expected || !String(expected).trim()) {
    return res.status(503).json({
      message:
        'Live GPS ingest is not configured. Set LIVE_LOCATION_INGEST_KEY on the server (same value your app sends as X-Live-Location-Key).',
    });
  }
  const got = req.headers['x-live-location-key'] || req.body?.ingestKey;
  if (got !== expected) {
    return res.status(401).json({ message: 'Invalid or missing X-Live-Location-Key header' });
  }
  next();
};

const latestPingPerPhone = (pings) => {
  const byPhone = new Map();
  for (const p of pings) {
    const prev = byPhone.get(p.phoneNumber);
    const t = new Date(p.createdAt).getTime();
    if (!prev || t > new Date(prev.createdAt).getTime()) {
      byPhone.set(p.phoneNumber, p);
    }
  }
  return [...byPhone.values()];
};

const contactLike = (c) =>
  c && typeof c.toJSON === 'function'
    ? c.toJSON()
    : { id: c?.id ?? null, name: c?.name ?? null, phoneNumber: c?.phoneNumber };

const mergeGeoRows = (liveRows, savedRows) => {
  const map = new Map();
  const add = (row) => {
    const c = contactLike(row.contact);
    const phone = c.phoneNumber;
    if (!phone) return;
    const prev = map.get(phone);
    if (!prev || row.distanceKm < prev.distanceKm) {
      map.set(phone, row);
    }
  };
  liveRows.forEach(add);
  savedRows.forEach(add);
  return [...map.values()].sort((a, b) => a.distanceKm - b.distanceKm);
};

const parseGeoSources = (body) => {
  const raw = body?.geoSources;
  if (raw == null) {
    return { useLive: true, useSaved: false };
  }
  if (Array.isArray(raw)) {
    const useLive = raw.includes('live');
    const useSaved = raw.includes('saved');
    if (!useLive && !useSaved) {
      return { useLive: true, useSaved: false };
    }
    return { useLive, useSaved };
  }
  return { useLive: true, useSaved: false };
};

/** Attach contact/user display names for delivery history (list + detail). */
const enrichMessagesForDeliveryList = async (messageInstances) => {
  if (!messageInstances.length) return [];
  const rows = messageInstances.map((m) => (typeof m.toJSON === 'function' ? m.toJSON() : { ...m }));
  const contactIds = [
    ...new Set(rows.filter((r) => r.recipientType === 'Contact' && r.recipientId).map((r) => r.recipientId)),
  ];
  const userIds = [
    ...new Set(rows.filter((r) => r.recipientType === 'User' && r.recipientId).map((r) => r.recipientId)),
  ];
  const [contacts, users] = await Promise.all([
    contactIds.length
      ? Contact.findAll({ where: { id: { [Op.in]: contactIds } }, attributes: ['id', 'name', 'phoneNumber'] })
      : [],
    userIds.length
      ? User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'email', 'phoneNumber'] })
      : [],
  ]);
  const cm = Object.fromEntries(contacts.map((c) => [c.id, c]));
  const um = Object.fromEntries(users.map((u) => [u.id, u]));
  return rows.map((r) => {
    let recipientDisplayName = r.phoneNumber;
    let memberName = null;
    if (r.recipientType === 'Contact' && r.recipientId && cm[r.recipientId]) {
      const n = cm[r.recipientId].name;
      memberName = n && String(n).trim() ? String(n).trim() : null;
      recipientDisplayName = memberName || r.phoneNumber;
    } else if (r.recipientType === 'User' && r.recipientId && um[r.recipientId]) {
      const u = um[r.recipientId];
      memberName =
        (u.name && String(u.name).trim()) || (u.email && String(u.email).trim()) || null;
      recipientDisplayName = memberName || r.phoneNumber;
    }
    return {
      ...r,
      recipientDisplayName,
      memberName,
    };
  });
};

const parseAggregateCampaignsFlag = (value) =>
  ['1', 'true', 'yes'].includes(String(value ?? '').trim().toLowerCase());

/** One delivery row per campaign: worst-case status among recipient messages (pending > failed > sent). */
const rollupCampaignRecipientStatus = (pending, failed) => {
  if (pending > 0) return 'pending';
  if (failed > 0) return 'failed';
  return 'sent';
};

const statusRankForSort = (s) => (s === 'pending' ? 0 : s === 'failed' ? 1 : 2);

/** Aligns with SQL: FLOOR(UNIX_TIMESTAMP(created_at) / 120) — one list row per group blast (~2 min window). */
const GROUP_SEND_BUCKET_SEC = 120;
const normalizeGroupTimeBucket = (tb) => {
  const n = Math.floor(Number(tb));
  return Number.isFinite(n) ? n : 0;
};
const groupSendBucketFromDate = (d) => {
  const sec = Math.floor(new Date(d).getTime() / 1000);
  return Math.floor(sec / GROUP_SEND_BUCKET_SEC);
};

const sendCampaignMessages = async (req, res) => {
  const { campaignID, senderId, templateVars } = req.body;
  try {
    if (!campaignID) {
      return res.status(400).json({ message: 'Campaign ID is required' });
    }

    const normalizedSenderId = normalizeSenderId(senderId);
    if (normalizedSenderId && !isValidSenderId(normalizedSenderId)) {
      return res.status(400).json({ message: 'Invalid senderId. Use 1-11 alphanumeric characters (e.g. AbuMarket).' });
    }
    const senderCheck = await ensureSenderIdAllowedForCompany(req, normalizedSenderId);
    if (!senderCheck.ok) {
      return res.status(senderCheck.status).json({ message: senderCheck.message });
    }

    const campaign = await Campaign.findByPk(campaignID, {
      include: [{ model: CampaignRecipient, as: 'recipientLinks', attributes: ['recipientId', 'recipientType'] }]
    });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (req.user?.role !== 'admin' && campaign.createdById !== req.user?.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let recipients = [];
    const links = campaign.recipientLinks || [];
    const contactIds = links.filter((l) => l.recipientType === 'Contact').map((l) => l.recipientId);
    const userIds = links.filter((l) => l.recipientType === 'User').map((l) => l.recipientId);

    const [directContacts, directUsers] = await Promise.all([
      contactIds.length ? Contact.findAll({ where: { id: contactIds } }) : [],
      userIds.length ? User.findAll({ where: { id: userIds }, attributes: { exclude: ['password'] } }) : [],
    ]);

    recipients = [...directContacts, ...directUsers];

    if (campaign.groupId) {
      const group = await Group.findByPk(campaign.groupId, {
        include: [{ model: Contact, as: 'members', through: { attributes: [] }, attributes: ['id', 'name', 'phoneNumber'] }],
      });
      if (group && group.members?.length) {
        recipients = [...recipients, ...group.members];
      }
    }

    // unique by id+type
    const seen = new Set();
    recipients = recipients.filter((r) => {
      const key = `${r.constructor.name}-${r.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No recipients found for this campaign' });
    }

    const template = campaign.message;
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      let phone = recipient.phoneNumber || null;
      const type = recipient.constructor.name === 'Contact' ? 'Contact' : 'User';

      if (!phone) {
        failCount += 1;
        continue;
      }

      const content = personalizeMessage(template, {
        contact: type === 'Contact' ? recipient : undefined,
        user: type === 'User' ? recipient : undefined,
        templateVars,
      });

      const existing = await Message.findOne({
        where: {
          campaignId: campaign.id,
          recipientId: recipient.id,
          recipientType: type,
          status: 'pending',
        },
      });

      try {
        const { response, providerMessageId } = await sendSMS(phone, content, { senderId: normalizedSenderId });
        if (existing) {
          await existing.update({
            content,
            status: 'sent',
            response: { direction: 'outbound', providerResponse: response },
            providerMessageId,
            sentAt: new Date(),
          });
        } else {
          await Message.create({
            campaignId: campaign.id,
            groupId: campaign.groupId || null,
            recipientType: type,
            recipientId: recipient.id,
            phoneNumber: phone,
            content,
            status: 'sent',
            response: { direction: 'outbound', providerResponse: response },
            providerMessageId,
            sentAt: new Date(),
          });
        }
        successCount += 1;
      } catch (error) {
        if (existing) {
          await existing.update({
            content,
            status: 'failed',
            response: { direction: 'outbound', error: error.message || 'Unknown error' },
          });
        } else {
          await Message.create({
            campaignId: campaign.id,
            groupId: campaign.groupId || null,
            recipientType: type,
            recipientId: recipient.id,
            phoneNumber: phone,
            content,
            status: 'failed',
            response: { direction: 'outbound', error: error.message || 'Unknown error' },
          });
        }
        failCount += 1;
      }
    }

    await campaign.update({ status: 'sent' });

    res.json({
      message: 'Campaign messages dispatched',
      successCount,
      failCount,
      total: recipients.length,
    });
  } catch (error) {
    console.error('SMS dispatch error:', error, { campaignID });
    const errorMessage = error.message || error.toString() || 'Server error';
    const resp = { message: 'Failed to dispatch campaign messages', error: errorMessage };
    if (process.env.NODE_ENV !== 'production') resp.stack = error.stack;
    res.status(500).json(resp);
  }
};

const sendGroupSMS = async (req, res) => {
  const { groupId, message, senderId, templateVars } = req.body;
  try {
    if (!groupId || !message) {
      return res.status(400).json({ message: 'Group ID and message are required' });
    }

    const gid = Number.parseInt(String(groupId), 10);
    if (!Number.isInteger(gid) || gid < 1) {
      return res.status(400).json({ message: 'Invalid group ID' });
    }

    const normalizedSenderId = normalizeSenderId(senderId);
    if (normalizedSenderId && !isValidSenderId(normalizedSenderId)) {
      return res.status(400).json({ message: 'Invalid senderId. Use 1-11 alphanumeric characters (e.g. AbuMarket).' });
    }
    const senderCheck = await ensureSenderIdAllowedForCompany(req, normalizedSenderId);
    if (!senderCheck.ok) {
      return res.status(senderCheck.status).json({ message: senderCheck.message });
    }

    const group = await Group.findByPk(gid, {
      include: [{ model: Contact, as: 'members', through: { attributes: [] }, attributes: ['id', 'name', 'phoneNumber'] }],
    });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (req.user?.role !== 'admin' && group.ownerId !== req.user?.id) {
      return res.status(403).json({ message: 'You do not have permission to message this group' });
    }

    const contacts = group.members || [];
    if (contacts.length === 0) {
      return res.status(400).json({ message: 'Group has no members' });
    }

    let successCount = 0;
    let failCount = 0;

    for (const contact of contacts) {
      if (!contact.phoneNumber) {
        failCount++;
        continue;
      }

      const content = personalizeMessage(message, { contact, templateVars });

      try {
        const { response, providerMessageId } = await sendSMS(contact.phoneNumber, content, { senderId: normalizedSenderId });

        await Message.create({
          groupId: group.id,
          recipientType: 'Contact',
          recipientId: contact.id,
          phoneNumber: contact.phoneNumber,
          content,
          status: 'sent',
          response: { direction: 'outbound', providerResponse: response },
          providerMessageId,
          sentAt: new Date(),
        });
        successCount++;
      } catch (error) {
        await Message.create({
          groupId: group.id,
          recipientType: 'Contact',
          recipientId: contact.id,
          phoneNumber: contact.phoneNumber,
          content,
          status: 'failed',
          response: { direction: 'outbound', error: error.message },
        });
        failCount++;
      }
    }

    res.json({
      message: 'Group SMS dispatched',
      successCount,
      failCount,
      total: contacts.length
    });
  } catch (error) {
    console.error('Group SMS dispatch error:', error);
    const errorMessage = error.message || error.toString() || 'Server error';
    res.status(500).json({ 
      message: 'Failed to send group SMS', 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const sendContactsSMS = async (req, res) => {
  const { contactIds, message, senderId, templateVars } = req.body;
  try {
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ message: 'Contact IDs array is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const normalizedSenderId = normalizeSenderId(senderId);
    if (normalizedSenderId && !isValidSenderId(normalizedSenderId)) {
      return res.status(400).json({ message: 'Invalid senderId. Use 1-11 alphanumeric characters (e.g. AbuMarket).' });
    }
    const senderCheck = await ensureSenderIdAllowedForCompany(req, normalizedSenderId);
    if (!senderCheck.ok) {
      return res.status(senderCheck.status).json({ message: senderCheck.message });
    }

    const scope =
      req.user?.role === 'admin' ? {} : { createdById: req.user.id };
    const contacts = await Contact.findAll({
      where: { ...scope, id: { [Op.in]: contactIds } },
    });

    if (contacts.length === 0) {
      return res.status(400).json({ message: 'No valid contacts found' });
    }

    if (contacts.length !== contactIds.length) {
      return res.status(400).json({ message: 'Some contact IDs are invalid or not accessible' });
    }

    let successCount = 0;
    let failCount = 0;

    for (const contact of contacts) {
      if (!contact.phoneNumber) {
        failCount++;
        continue;
      }

      const content = personalizeMessage(message, { contact, templateVars });

      try {
        const { response, providerMessageId } = await sendSMS(contact.phoneNumber, content, { senderId: normalizedSenderId });

        await Message.create({
          recipientType: 'Contact',
          recipientId: contact.id,
          phoneNumber: contact.phoneNumber,
          content,
          status: 'sent',
          response: { direction: 'outbound', providerResponse: response },
          providerMessageId,
          sentAt: new Date()
        });
        successCount++;
      } catch (error) {
        const errorMessage = error.message || error.toString() || 'Unknown error';
        await Message.create({
          recipientType: 'Contact',
          recipientId: contact.id,
          phoneNumber: contact.phoneNumber,
          content,
          status: 'failed',
          response: { direction: 'outbound', error: errorMessage },
        });
        failCount++;
      }
    }

    res.json({
      message: 'Contacts SMS dispatched',
      successCount,
      failCount,
      total: contacts.length
    });
  } catch (error) {
    console.error('Contacts SMS dispatch error:', error);
    const errorMessage = error.message || error.toString() || 'Server error';
    res.status(500).json({ 
      message: 'Failed to send contacts SMS', 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Contacts inside radius using saved ContactLocation (legacy). Bounding-box + haversine.
 */
const findGeoFromSavedLocations = async ({ centerLat, centerLng, radiusKm, user }) => {
  const scope = user?.role === 'admin' ? {} : { createdById: user?.id };
  const r = Number(radiusKm);
  const cLat = Number(centerLat);
  const cLng = Number(centerLng);
  const cosLat = Math.cos((cLat * Math.PI) / 180);
  const dLat = (r / 111) * 1.08;
  const dLng = (r / (111 * Math.max(Math.abs(cosLat), 0.02))) * 1.08;

  const contacts = await Contact.findAll({
    where: scope,
    include: [
      {
        model: ContactLocation,
        as: 'location',
        required: true,
        where: {
          latitude: { [Op.between]: [cLat - dLat, cLat + dLat] },
          longitude: { [Op.between]: [cLng - dLng, cLng + dLng] },
        },
      },
    ],
  });

  return contacts
    .map((contact) => {
      const lat = Number(contact.location.latitude);
      const lng = Number(contact.location.longitude);
      const distanceKm = haversineDistanceKm(cLat, cLng, lat, lng);
      return { contact, distanceKm, source: 'saved' };
    })
    .filter((row) => row.distanceKm <= r)
    .sort((a, b) => a.distanceKm - b.distanceKm);
};

/**
 * Recent live GPS pings (mobile app → POST /sms/live-location/ping) within radius.
 * Staff: only phones that exist as their contacts (no saved lat/lng required on the contact).
 * Admin + openLiveAudience: any recent ping in radius. Otherwise admin: phone must exist on any contact.
 */
const findGeoFromLivePings = async ({ centerLat, centerLng, radiusKm, user, openLiveAudience }) => {
  const since = getLiveLocationCutoff();
  const r = Number(radiusKm);
  const cLat = Number(centerLat);
  const cLng = Number(centerLng);

  const pings = await LiveLocationPing.findAll({
    where: { createdAt: { [Op.gte]: since } },
  });

  const latest = latestPingPerPhone(pings);

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff' || user?.role === 'viewer';

  let contactsByPhone = new Map();
  if (isStaff) {
    const list = await Contact.findAll({
      where: { createdById: user.id },
      attributes: ['id', 'name', 'phoneNumber', 'tags', 'createdById'],
    });
    contactsByPhone = new Map(list.map((c) => [c.phoneNumber, c]));
  } else if (isAdmin && !openLiveAudience) {
    const list = await Contact.findAll({
      attributes: ['id', 'name', 'phoneNumber', 'tags', 'createdById'],
    });
    contactsByPhone = new Map(list.map((c) => [c.phoneNumber, c]));
  } else if (isAdmin && openLiveAudience) {
    const list = await Contact.findAll({
      attributes: ['id', 'name', 'phoneNumber', 'tags', 'createdById'],
    });
    contactsByPhone = new Map(list.map((c) => [c.phoneNumber, c]));
  }

  const rows = [];
  for (const ping of latest) {
    const lat = Number(ping.latitude);
    const lng = Number(ping.longitude);
    const distanceKm = haversineDistanceKm(cLat, cLng, lat, lng);
    if (distanceKm > r) continue;

    if (isStaff) {
      const c = contactsByPhone.get(ping.phoneNumber);
      if (!c) continue;
      rows.push({ contact: c, distanceKm, source: 'live' });
      continue;
    }

    if (isAdmin && openLiveAudience) {
      const c = contactsByPhone.get(ping.phoneNumber) || null;
      const pseudo = c || { id: null, name: null, phoneNumber: ping.phoneNumber };
      rows.push({ contact: pseudo, distanceKm, source: 'live' });
      continue;
    }

    if (isAdmin && !openLiveAudience) {
      const c = contactsByPhone.get(ping.phoneNumber);
      if (!c) continue;
      rows.push({ contact: c, distanceKm, source: 'live' });
    }
  }

  rows.sort((a, b) => a.distanceKm - b.distanceKm);
  return rows;
};

const resolveGeoAudience = async ({ normalized, user, body }) => {
  const { useLive, useSaved } = parseGeoSources(body);
  const openLiveAudience = Boolean(body?.openLiveAudience) && user?.role === 'admin';

  let liveRows = [];
  let savedRows = [];

  if (useLive) {
    liveRows = await findGeoFromLivePings({
      ...normalized,
      user,
      openLiveAudience,
    });
  }
  if (useSaved) {
    savedRows = await findGeoFromSavedLocations({ ...normalized, user });
  }

  if (useLive && useSaved) {
    return mergeGeoRows(liveRows, savedRows);
  }
  if (useLive) return liveRows;
  if (useSaved) return savedRows;
  return [];
};

const reportLiveLocation = async (req, res) => {
  try {
    const lat = Number(req.body?.latitude ?? req.body?.lat);
    const lng = Number(req.body?.longitude ?? req.body?.lng);
    const phoneRaw = req.body?.phoneNumber ?? req.body?.phone;
    if (!phoneRaw || !String(phoneRaw).trim()) {
      return res.status(400).json({ message: 'phoneNumber is required' });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: 'latitude and longitude must be valid numbers' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'latitude/longitude out of range' });
    }

    const storedPhone = normalizeToE164(phoneRaw);
    if (!storedPhone || !isValidE164(storedPhone)) {
      return res.status(400).json({
        message:
          'Invalid phone number. Use E.164 (e.g. +2519…) or national format with DEFAULT_PHONE_REGION / DEFAULT_PHONE_COUNTRY_CODE set.',
      });
    }

    const accuracy = req.body?.accuracyMeters ?? req.body?.accuracy;
    const acc = accuracy != null && Number.isFinite(Number(accuracy)) ? Number(accuracy) : null;

    const contact = await Contact.findOne({
      where: { phoneNumber: storedPhone },
      attributes: ['id'],
    });

    await LiveLocationPing.create({
      phoneNumber: storedPhone,
      latitude: lat,
      longitude: lng,
      accuracyMeters: acc,
      contactId: contact?.id ?? null,
    });

    return res.status(201).json({ message: 'Location recorded', phoneNumber: storedPhone });
  } catch (err) {
    console.error('reportLiveLocation error:', err);
    return res.status(500).json({ message: 'Failed to record location' });
  }
};

const previewGeoAudience = async (req, res) => {
  try {
    const normalized = normalizeGeoInput(req.body || {});
    if (normalized.error) {
      return res.status(400).json({ message: normalized.error });
    }

    const rows = await resolveGeoAudience({ normalized, user: req.user, body: req.body || {} });
    const { useLive, useSaved } = parseGeoSources(req.body || {});

    return res.json({
      count: rows.length,
      geoSources: { live: useLive, saved: useSaved },
      openLiveAudience: Boolean(req.body?.openLiveAudience) && req.user?.role === 'admin',
      liveMaxAgeMinutes:
        Number(process.env.LIVE_LOCATION_MAX_AGE_MINUTES) > 0
          ? Number(process.env.LIVE_LOCATION_MAX_AGE_MINUTES)
          : LIVE_LOCATION_DEFAULT_MAX_AGE_MIN,
      contacts: rows.slice(0, 15).map((row) => ({
        id: row.contact?.id ?? null,
        name: row.contact?.name ?? null,
        phoneNumber: row.contact?.phoneNumber,
        distanceKm: Number(row.distanceKm.toFixed(2)),
        source: row.source || 'live',
        locationName: row.contact?.location?.locationName || null,
      })),
    });
  } catch (error) {
    console.error('Geo preview error:', error);
    return res.status(500).json({ message: 'Failed to preview geo audience' });
  }
};

const sendGeoSMS = async (req, res) => {
  try {
    const normalized = normalizeGeoInput(req.body || {});
    if (normalized.error) {
      return res.status(400).json({ message: normalized.error });
    }

    const { message, senderId, templateVars } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const normalizedSenderId = normalizeSenderId(senderId);
    if (normalizedSenderId && !isValidSenderId(normalizedSenderId)) {
      return res.status(400).json({ message: 'Invalid senderId. Use 1-11 alphanumeric characters (e.g. AbuMarket).' });
    }
    const senderCheck = await ensureSenderIdAllowedForCompany(req, normalizedSenderId);
    if (!senderCheck.ok) {
      return res.status(senderCheck.status).json({ message: senderCheck.message });
    }

    const rows = await resolveGeoAudience({ normalized, user: req.user, body: req.body || {} });
    if (!rows.length) {
      return res.status(400).json({
        message:
          'No recipients in selected radius. For live GPS: ensure the app has posted a recent location (see LIVE_LOCATION_MAX_AGE_MINUTES) and phones match your contacts (staff) or enable open live audience (admin).',
      });
    }

    let successCount = 0;
    let failCount = 0;

    const msgTemplate = String(message).trim();

    for (const row of rows) {
      const contact = row.contact;
      const content = personalizeMessage(msgTemplate, { contact, templateVars });
      try {
        const { response, providerMessageId } = await sendSMS(contact.phoneNumber, content, { senderId: normalizedSenderId });
        await Message.create({
          recipientType: 'Contact',
          recipientId: contact.id != null ? contact.id : null,
          phoneNumber: contact.phoneNumber,
          content,
          status: 'sent',
          response: {
            direction: 'outbound',
            providerResponse: response,
            geo: {
              placeName: normalized.placeName,
              centerLat: normalized.centerLat,
              centerLng: normalized.centerLng,
              radiusKm: normalized.radiusKm,
              distanceKm: Number(row.distanceKm.toFixed(2)),
              source: row.source || 'live',
            },
          },
          providerMessageId,
          sentAt: new Date(),
        });
        successCount += 1;
      } catch (error) {
        await Message.create({
          recipientType: 'Contact',
          recipientId: contact.id != null ? contact.id : null,
          phoneNumber: contact.phoneNumber,
          content,
          status: 'failed',
          response: {
            direction: 'outbound',
            error: error.message || 'Unknown error',
            geo: {
              placeName: normalized.placeName,
              centerLat: normalized.centerLat,
              centerLng: normalized.centerLng,
              radiusKm: normalized.radiusKm,
              distanceKm: Number(row.distanceKm.toFixed(2)),
              source: row.source || 'live',
            },
          },
        });
        failCount += 1;
      }
    }

    const { useLive, useSaved } = parseGeoSources(req.body || {});

    return res.json({
      message: `Geo SMS sent for ${normalized.placeName}`,
      placeName: normalized.placeName,
      total: rows.length,
      successCount,
      failCount,
      geoSources: { live: useLive, saved: useSaved },
    });
  } catch (error) {
    console.error('Send geo SMS error:', error);
    return res.status(500).json({ message: 'Failed to send geo SMS' });
  }
};
const getDeliveryStatus = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 500);
    const search = (req.query.search || '').trim();
    const statusRaw = (req.query.status || '').trim().toLowerCase();
    const delivery = (req.query.delivery || '').trim();
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const sortBy = ['sent_at', 'sentAt', 'created_at', 'createdAt', 'status'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'created_at';
    const sortDir = req.query.sortDir === 'ASC' ? 'ASC' : 'DESC';
    const ilike = Op.iLike || Op.like;
    const aggregateCampaigns = parseAggregateCampaignsFlag(req.query.aggregateCampaigns);

    let campaignIdsMatchingSearch = [];
    let groupIdsMatchingSearch = [];
    if (search) {
      campaignIdsMatchingSearch = (
        await Campaign.findAll({
          where: { name: { [ilike]: `%${search}%` } },
          attributes: ['id'],
          raw: true,
        })
      ).map((r) => r.id);
      groupIdsMatchingSearch = (
        await Group.findAll({
          where: { name: { [ilike]: `%${search}%` } },
          attributes: ['id'],
          raw: true,
        })
      ).map((r) => r.id);
    }

    const searchClause = search
      ? {
          [Op.or]: [
            { phoneNumber: { [ilike]: `%${search}%` } },
            { content: { [ilike]: `%${search}%` } },
            ...(campaignIdsMatchingSearch.length ? [{ campaignId: { [Op.in]: campaignIdsMatchingSearch } }] : []),
            ...(groupIdsMatchingSearch.length ? [{ groupId: { [Op.in]: groupIdsMatchingSearch } }] : []),
          ],
        }
      : {};

    const whereBase = {
      ...(delivery ? { networkDeliveryStatus: delivery } : {}),
      ...searchClause,
      ...((startDate || endDate)
        ? {
            [Op.and]: [
              startDate ? { createdAt: { [Op.gte]: startDate } } : {},
              endDate ? { createdAt: { [Op.lte]: endDate } } : {},
            ],
          }
        : {}),
    };

    // "all" (or missing): no API-status filter — include sent, failed, and pending.
    const listStatusClause =
      !statusRaw || statusRaw === 'all'
        ? {}
        : ['sent', 'failed', 'pending'].includes(statusRaw)
          ? { status: statusRaw }
          : {};

    const whereFull = { ...whereBase, ...listStatusClause };

    const orderColumn =
      sortBy === 'sent_at' || sortBy === 'sentAt'
        ? 'sentAt'
        : sortBy === 'status'
          ? 'status'
          : 'createdAt';

    const statusCounts = { sent: 0, failed: 0, pending: 0 };
    try {
      const statusAgg = await Message.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('Message.id')), 'count'],
        ],
        where: whereBase,
        group: ['status'],
        raw: true,
      });
      for (const row of statusAgg) {
        const k = row.status;
        if (k && Object.prototype.hasOwnProperty.call(statusCounts, k)) {
          statusCounts[k] = Number(row.count) || 0;
        }
      }
    } catch (statusAggErr) {
      console.error('Delivery statusCounts aggregate failed:', statusAggErr?.message || statusAggErr);
    }

    if (!aggregateCampaigns) {
      const { rows, count } = await Message.findAndCountAll({
        where: whereFull,
        include: [
          { model: Campaign, as: 'campaign', attributes: ['id', 'name'], required: false },
          { model: Group, as: 'group', attributes: ['id', 'name'], required: false },
        ],
        order: [[orderColumn, sortDir]],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      const data = await enrichMessagesForDeliveryList(rows);
      return res.json({
        data,
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize) || 1,
        statusCounts,
      });
    }

    try {
    const sortCol =
      ['sent_at', 'sentAt'].includes(sortBy) ? sequelize.col('Message.sent_at') : sequelize.col('Message.created_at');

    // Sequelize aliases the table as `Message`; using `messages.` breaks MySQL when AS Message is used.
    const groupBucketExpr = sequelize.literal(
      `FLOOR(UNIX_TIMESTAMP(\`Message\`.\`created_at\`) / ${GROUP_SEND_BUCKET_SEC})`
    );

    const rawCampId = (b) => b.campaignId ?? b.campaign_id;
    const rawGroupId = (b) => b.groupId ?? b.group_id;
    const rawTimeBucket = (b) => b.timeBucket ?? b.timebucket;

    const [campaignBuckets, groupSendBuckets, standaloneMeta] = await Promise.all([
      Message.findAll({
        attributes: [
          'campaignId',
          [sequelize.fn('MAX', sortCol), 'bucketSort'],
        ],
        where: { campaignId: { [Op.ne]: null }, ...whereFull },
        group: ['campaignId'],
        raw: true,
      }),
      Message.findAll({
        attributes: [
          'groupId',
          [groupBucketExpr, 'timeBucket'],
          [sequelize.fn('MAX', sortCol), 'bucketSort'],
        ],
        where: { campaignId: null, groupId: { [Op.ne]: null }, ...whereFull },
        group: ['groupId', groupBucketExpr],
        raw: true,
      }),
      Message.findAll({
        attributes: ['id', 'createdAt', 'sentAt', 'status'],
        where: { campaignId: null, groupId: null, ...whereFull },
        raw: true,
      }),
    ]);

    const visibleCampaignIds = campaignBuckets.map((b) => rawCampId(b)).filter(Boolean);
    let aggByCampaign = new Map();
    if (visibleCampaignIds.length) {
      const sumSent = sequelize.literal(
        "SUM(CASE WHEN `Message`.`status` = 'sent' THEN 1 ELSE 0 END)"
      );
      const sumFailed = sequelize.literal(
        "SUM(CASE WHEN `Message`.`status` = 'failed' THEN 1 ELSE 0 END)"
      );
      const sumPending = sequelize.literal(
        "SUM(CASE WHEN `Message`.`status` = 'pending' THEN 1 ELSE 0 END)"
      );
      const aggRows = await Message.findAll({
        attributes: [
          'campaignId',
          [sequelize.fn('COUNT', sequelize.col('Message.id')), 'recipientCount'],
          [sumSent, 'sentCount'],
          [sumFailed, 'failedCount'],
          [sumPending, 'pendingCount'],
          [sequelize.fn('MAX', sequelize.col('Message.created_at')), 'lastCreatedAt'],
          [sequelize.fn('MAX', sequelize.col('Message.sent_at')), 'lastSentAt'],
        ],
        where: { campaignId: { [Op.in]: visibleCampaignIds }, ...whereBase },
        group: ['campaignId'],
        raw: true,
      });
      for (const row of aggRows) {
        const pending = Number(row.pendingCount) || 0;
        const failed = Number(row.failedCount) || 0;
        const sent = Number(row.sentCount) || 0;
        const cid = row.campaignId ?? row.campaign_id;
        aggByCampaign.set(cid, {
          recipientCount: Number(row.recipientCount) || 0,
          sentCount: sent,
          failedCount: failed,
          pendingCount: pending,
          lastCreatedAt: row.lastCreatedAt,
          lastSentAt: row.lastSentAt,
          rollup: rollupCampaignRecipientStatus(pending, failed),
        });
      }
    }

    const visibleGroupKeys = new Set(
      groupSendBuckets.map((b) => `${rawGroupId(b)}|${normalizeGroupTimeBucket(rawTimeBucket(b))}`)
    );

    let groupAggMap = new Map();
    if (visibleGroupKeys.size) {
      const sumSent = sequelize.literal(
        "SUM(CASE WHEN `Message`.`status` = 'sent' THEN 1 ELSE 0 END)"
      );
      const sumFailed = sequelize.literal(
        "SUM(CASE WHEN `Message`.`status` = 'failed' THEN 1 ELSE 0 END)"
      );
      const sumPending = sequelize.literal(
        "SUM(CASE WHEN `Message`.`status` = 'pending' THEN 1 ELSE 0 END)"
      );
      const groupAggRows = await Message.findAll({
        attributes: [
          'groupId',
          [groupBucketExpr, 'timeBucket'],
          [sequelize.fn('COUNT', sequelize.col('Message.id')), 'recipientCount'],
          [sumSent, 'sentCount'],
          [sumFailed, 'failedCount'],
          [sumPending, 'pendingCount'],
          [sequelize.fn('MAX', sequelize.col('Message.created_at')), 'lastCreatedAt'],
          [sequelize.fn('MAX', sequelize.col('Message.sent_at')), 'lastSentAt'],
        ],
        where: { campaignId: null, groupId: { [Op.ne]: null }, ...whereBase },
        group: ['groupId', groupBucketExpr],
        raw: true,
      });
      for (const row of groupAggRows) {
        const gid = row.groupId ?? row.group_id;
        const tb = row.timeBucket ?? row.timebucket;
        const key = `${gid}|${normalizeGroupTimeBucket(tb)}`;
        if (!visibleGroupKeys.has(key)) continue;
        const pending = Number(row.pendingCount) || 0;
        const failed = Number(row.failedCount) || 0;
        const sent = Number(row.sentCount) || 0;
        groupAggMap.set(key, {
          recipientCount: Number(row.recipientCount) || 0,
          sentCount: sent,
          failedCount: failed,
          pendingCount: pending,
          lastCreatedAt: row.lastCreatedAt,
          lastSentAt: row.lastSentAt,
          rollup: rollupCampaignRecipientStatus(pending, failed),
        });
      }
    }

    const standaloneSortTs = (row) => {
      const created = row.createdAt ?? row.created_at;
      const sent = row.sentAt ?? row.sent_at;
      if (['sent_at', 'sentAt'].includes(sortBy)) {
        const t = sent || created;
        return t ? new Date(t).getTime() : 0;
      }
      if (sortBy === 'status') {
        return created ? new Date(created).getTime() : 0;
      }
      return created ? new Date(created).getTime() : 0;
    };

    const merged = [];
    for (const b of campaignBuckets) {
      const cid = rawCampId(b);
      const agg = aggByCampaign.get(cid);
      if (!agg) continue;
      const sortVal = b.bucketSort ?? b.bucketsort;
      const sortTs = sortVal ? new Date(sortVal).getTime() : 0;
      merged.push({
        kind: 'campaign',
        campaignId: cid,
        sortTs,
        statusKey: agg.rollup,
      });
    }
    for (const b of groupSendBuckets) {
      const gid = rawGroupId(b);
      const tb = normalizeGroupTimeBucket(rawTimeBucket(b));
      const key = `${gid}|${tb}`;
      const agg = groupAggMap.get(key);
      if (!agg) continue;
      const sortVal = b.bucketSort ?? b.bucketsort;
      const sortTs = sortVal ? new Date(sortVal).getTime() : 0;
      merged.push({
        kind: 'group_send',
        groupId: gid,
        timeBucket: tb,
        sortTs,
        statusKey: agg.rollup,
      });
    }
    for (const m of standaloneMeta) {
      const mid = m.id ?? m.message_id;
      merged.push({
        kind: 'message',
        messageId: mid,
        sortTs: standaloneSortTs(m),
        statusKey: m.status,
      });
    }

    const kindRank = (k) => (k === 'campaign' ? 0 : k === 'group_send' ? 1 : 2);

    merged.sort((a, b) => {
      if (sortBy === 'status') {
        const ra = statusRankForSort(a.statusKey);
        const rb = statusRankForSort(b.statusKey);
        if (ra !== rb) return sortDir === 'ASC' ? ra - rb : rb - ra;
      }
      if (a.sortTs !== b.sortTs) return sortDir === 'ASC' ? a.sortTs - b.sortTs : b.sortTs - a.sortTs;
      const kra = kindRank(a.kind);
      const krb = kindRank(b.kind);
      if (kra !== krb) return kra - krb;
      if (a.kind === 'message' && b.kind === 'message') return a.messageId - b.messageId;
      if (a.kind === 'campaign' && b.kind === 'campaign') return a.campaignId - b.campaignId;
      if (a.kind === 'group_send' && b.kind === 'group_send') {
        return a.groupId - b.groupId || a.timeBucket - b.timeBucket;
      }
      return 0;
    });

    const total = merged.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const slice = merged.slice((page - 1) * pageSize, page * pageSize);

    const pageMessageIds = slice.filter((x) => x.kind === 'message').map((x) => x.messageId);
    const pageCampaignIds = slice.filter((x) => x.kind === 'campaign').map((x) => x.campaignId);
    const pageGroupSendItems = slice.filter((x) => x.kind === 'group_send');
    const pageGroupIds = [...new Set(pageGroupSendItems.map((x) => x.groupId))];

    const [messageRows, campaignsMeta, sampleRows, groupsMeta, groupSampleCandidates] = await Promise.all([
      pageMessageIds.length
        ? Message.findAll({
            where: { id: { [Op.in]: pageMessageIds } },
            include: [
              { model: Campaign, as: 'campaign', attributes: ['id', 'name'], required: false },
              { model: Group, as: 'group', attributes: ['id', 'name'], required: false },
            ],
          })
        : [],
      pageCampaignIds.length
        ? Campaign.findAll({
            where: { id: { [Op.in]: pageCampaignIds } },
            attributes: ['id', 'name', 'message', 'status', 'type', 'groupId'],
            include: [{ model: Group, as: 'group', attributes: ['id', 'name'], required: false }],
          })
        : [],
      pageCampaignIds.length
        ? Message.findAll({
            where: { campaignId: { [Op.in]: pageCampaignIds }, ...whereBase },
            attributes: ['id', 'campaignId', 'phoneNumber', 'status'],
            order: [['id', 'ASC']],
            raw: true,
          })
        : [],
      pageGroupIds.length
        ? Group.findAll({
            where: { id: { [Op.in]: pageGroupIds } },
            attributes: ['id', 'name'],
          })
        : [],
      pageGroupIds.length
        ? Message.findAll({
            where: { campaignId: null, groupId: { [Op.in]: pageGroupIds }, ...whereBase },
            attributes: ['groupId', 'createdAt', 'phoneNumber', 'status', 'content'],
            order: [['id', 'ASC']],
            raw: true,
          })
        : [],
    ]);

    const enrichedMessages = await enrichMessagesForDeliveryList(messageRows);
    const msgById = new Map(enrichedMessages.map((r) => [r.id, { ...r, listKind: 'message' }]));
    const campById = new Map(campaignsMeta.map((c) => [c.id, c.toJSON ? c.toJSON() : c]));

    const samplesByCampaign = new Map();
    for (const cid of pageCampaignIds) samplesByCampaign.set(cid, []);
    for (const s of sampleRows) {
      const cid = s.campaignId ?? s.campaign_id;
      const list = samplesByCampaign.get(cid);
      if (list && list.length < 8) {
        list.push({ phoneNumber: s.phoneNumber ?? s.phone_number, status: s.status });
      }
    }

    const groupById = new Map(groupsMeta.map((g) => [g.id, g.toJSON ? g.toJSON() : g]));

    const samplesByGroupSend = new Map();
    for (const it of pageGroupSendItems) {
      samplesByGroupSend.set(`${it.groupId}|${it.timeBucket}`, []);
    }
    for (const s of groupSampleCandidates) {
      const created = s.createdAt ?? s.created_at;
      const gid = s.groupId ?? s.group_id;
      const bucket = groupSendBucketFromDate(created);
      const key = `${gid}|${bucket}`;
      const list = samplesByGroupSend.get(key);
      if (!list || list.length >= 8) continue;
      list.push({ phoneNumber: s.phoneNumber ?? s.phone_number, status: s.status });
    }

    const groupContentByKey = new Map();
    for (const s of groupSampleCandidates) {
      const created = s.createdAt ?? s.created_at;
      const gid = s.groupId ?? s.group_id;
      const bucket = groupSendBucketFromDate(created);
      const key = `${gid}|${bucket}`;
      if (!groupContentByKey.has(key) && s.content) groupContentByKey.set(key, s.content);
    }

    const data = slice.map((item) => {
      if (item.kind === 'message') {
        return msgById.get(item.messageId) || { listKind: 'message', id: item.messageId };
      }
      if (item.kind === 'group_send') {
        const key = `${item.groupId}|${item.timeBucket}`;
        const agg = groupAggMap.get(key);
        const g = groupById.get(item.groupId);
        return {
          listKind: 'group_send',
          id: `group-${item.groupId}-${item.timeBucket}`,
          groupId: item.groupId,
          timeBucket: item.timeBucket,
          group: g ? { id: g.id, name: g.name } : { id: item.groupId, name: 'Group' },
          content: groupContentByKey.get(key) || '',
          recipientCount: agg?.recipientCount ?? 0,
          sentCount: agg?.sentCount ?? 0,
          failedCount: agg?.failedCount ?? 0,
          pendingCount: agg?.pendingCount ?? 0,
          status: agg?.rollup ?? 'pending',
          createdAt: agg?.lastCreatedAt ?? null,
          sentAt: agg?.lastSentAt ?? null,
          campaign: null,
          sampleRecipients: samplesByGroupSend.get(key) || [],
        };
      }
      const c = campById.get(item.campaignId);
      const agg = aggByCampaign.get(item.campaignId);
      const audienceGroup =
        c?.group && (c.group.id || c.group.name)
          ? { id: c.group.id, name: c.group.name }
          : null;
      return {
        listKind: 'campaign',
        id: `campaign-${item.campaignId}`,
        campaignId: item.campaignId,
        campaign: c
          ? { id: c.id, name: c.name, message: c.message, status: c.status, type: c.type }
          : { id: item.campaignId, name: 'Campaign', message: '', status: 'pending', type: 'individual' },
        audienceGroup,
        content: c?.message || '',
        recipientCount: agg?.recipientCount ?? 0,
        sentCount: agg?.sentCount ?? 0,
        failedCount: agg?.failedCount ?? 0,
        pendingCount: agg?.pendingCount ?? 0,
        status: agg?.rollup ?? 'pending',
        createdAt: agg?.lastCreatedAt ?? null,
        sentAt: agg?.lastSentAt ?? null,
        group: null,
        phoneNumber: null,
        recipientDisplayName: null,
        memberName: null,
        sampleRecipients: samplesByCampaign.get(item.campaignId) || [],
      };
    });

    return res.json({
      data,
      page,
      pageSize,
      total,
      totalPages,
      statusCounts,
    });
    } catch (aggErr) {
      console.error('Delivery status aggregate failed, using flat list:', aggErr?.message || aggErr);
      const { rows, count } = await Message.findAndCountAll({
        where: whereFull,
        include: [
          { model: Campaign, as: 'campaign', attributes: ['id', 'name'], required: false },
          { model: Group, as: 'group', attributes: ['id', 'name'], required: false },
        ],
        order: [[orderColumn, sortDir]],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      const data = await enrichMessagesForDeliveryList(rows);
      return res.json({
        data,
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize) || 1,
        statusCounts,
      });
    }
  } catch (error) {
    console.error('Failed to fetch delivery status', error);
    res.status(500).json({ message: 'Failed to fetch delivery status' });
  }
};

// Public webhook endpoint for inbound customer SMS from provider.
const TAG_TOKEN = /^[a-zA-Z0-9_-]+$/;

const receiveInboundSMS = async (req, res) => {
  try {
    const inbound = pickInbound(req.body || {});
    if (!inbound.from || !inbound.text) {
      return res.status(400).json({ message: 'from and text are required' });
    }

    const normalizedPhone = normalizeToE164(inbound.from) || inbound.from;
    const contact =
      (await Contact.findOne({ where: { phoneNumber: normalizedPhone } })) ||
      (await Contact.findOne({ where: { phoneNumber: inbound.from } }));

    const storedPhone = contact?.phoneNumber || normalizedPhone;

    await Message.create({
      recipientType: 'Contact',
      recipientId: contact?.id || null,
      phoneNumber: storedPhone,
      content: inbound.text,
      status: 'sent',
      sentAt: parseInboundDate(inbound.date),
      response: {
        direction: 'inbound',
        provider: 'africastalking',
        messageId: inbound.id,
        raw: inbound.raw,
      },
    });

    return res.status(200).json({ message: 'Inbound message received' });
  } catch (error) {
    console.error('Inbound SMS error:', error);
    return res.status(500).json({ message: 'Failed to process inbound message' });
  }
};

const receiveDeliveryReport = async (req, res) => {
  try {
    const raw = pickDeliveryReport(req.body || {});
    const messageId = raw.messageId ? String(raw.messageId) : '';
    if (!messageId) {
      return res.status(200).json({ ok: true, note: 'ignored: missing message id' });
    }

    const msg = await Message.findOne({ where: { providerMessageId: messageId } });
    if (!msg) {
      return res.status(200).json({ ok: true, note: 'no local message for provider id' });
    }

    const prev = msg.response && typeof msg.response === 'object' ? { ...msg.response } : {};
    const delivery = {
      ...(prev.delivery || {}),
      status: raw.status,
      failureReason: raw.failureReason || '',
      networkCode: raw.networkCode,
      retryCount: raw.retryCount,
      updatedAt: new Date().toISOString(),
    };

    const statusStr = raw.status ? String(raw.status).slice(0, 32) : null;
    await msg.update({
      networkDeliveryStatus: statusStr,
      response: { ...prev, delivery, rawReport: raw.raw },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Delivery report webhook error:', error);
    return res.status(500).json({ message: 'Failed to process delivery report' });
  }
};

const sendToPhone = async (req, res) => {
  try {
    const { phoneNumber, message, senderId } = req.body || {};
    if (!phoneNumber || !String(message || '').trim()) {
      return res.status(400).json({ message: 'phoneNumber and message are required' });
    }
    const normalizedPhone = normalizeToE164(phoneNumber);
    if (!isValidE164(normalizedPhone)) {
      return res.status(400).json({ message: 'Invalid phone number. Use E.164 (e.g. +251912345678)' });
    }
    const normalizedSenderId = normalizeSenderId(senderId);
    if (normalizedSenderId && !isValidSenderId(normalizedSenderId)) {
      return res.status(400).json({ message: 'Invalid senderId. Use 1-11 alphanumeric characters (e.g. AbuMarket).' });
    }
    const senderCheck = await ensureSenderIdAllowedForCompany(req, normalizedSenderId);
    if (!senderCheck.ok) {
      return res.status(senderCheck.status).json({ message: senderCheck.message });
    }
    const content = String(message).trim();
    const { response, providerMessageId } = await sendSMS(normalizedPhone, content, { senderId: normalizedSenderId });
    const contact = await Contact.findOne({ where: { phoneNumber: normalizedPhone } });
    await Message.create({
      campaignId: null,
      recipientType: 'Contact',
      recipientId: contact?.id || null,
      phoneNumber: normalizedPhone,
      content,
      status: 'sent',
      response: { direction: 'outbound', providerResponse: response },
      providerMessageId,
      sentAt: new Date(),
    });
    res.json({ message: 'SMS sent', providerMessageId });
  } catch (error) {
    console.error('sendToPhone error:', error);
    res.status(500).json({ message: error.message || 'Failed to send SMS' });
  }
};

const sendTagsSMS = async (req, res) => {
  try {
    const { tags, message, senderId, matchAll, templateVars } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'message is required' });
    }
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ message: 'tags array is required' });
    }
    const sanitized = [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter((t) => TAG_TOKEN.test(t)))];
    if (!sanitized.length) {
      return res.status(400).json({ message: 'No valid tags (use letters, numbers, underscore, hyphen)' });
    }

    const normalizedSenderId = normalizeSenderId(senderId);
    if (normalizedSenderId && !isValidSenderId(normalizedSenderId)) {
      return res.status(400).json({ message: 'Invalid senderId. Use 1-11 alphanumeric characters (e.g. AbuMarket).' });
    }
    const senderCheck = await ensureSenderIdAllowedForCompany(req, normalizedSenderId);
    if (!senderCheck.ok) {
      return res.status(senderCheck.status).json({ message: senderCheck.message });
    }

    const baseWhere = req.user?.role === 'admin' ? {} : { createdById: req.user?.id };
    const tagLiterals = sanitized.map((tag) =>
      sequelize.literal(
        `JSON_SEARCH(COALESCE(tags, '[]'), 'one', ${sequelize.escape(tag)}, NULL, '$[*]') IS NOT NULL`
      )
    );
    const tagClause = matchAll ? { [Op.and]: tagLiterals } : { [Op.or]: tagLiterals };

    const contacts = await Contact.findAll({
      where: { ...baseWhere, ...tagClause },
    });
    if (!contacts.length) {
      return res.status(400).json({ message: 'No contacts match the selected tags' });
    }

    let successCount = 0;
    let failCount = 0;
    const template = String(message).trim();

    for (const contact of contacts) {
      if (!contact.phoneNumber) {
        failCount += 1;
        continue;
      }
      const content = personalizeMessage(template, { contact, templateVars });
      try {
        const { response, providerMessageId } = await sendSMS(contact.phoneNumber, content, { senderId: normalizedSenderId });
        await Message.create({
          recipientType: 'Contact',
          recipientId: contact.id,
          phoneNumber: contact.phoneNumber,
          content,
          status: 'sent',
          response: {
            direction: 'outbound',
            providerResponse: response,
            tagBroadcast: { tags: sanitized, matchAll: !!matchAll },
          },
          providerMessageId,
          sentAt: new Date(),
        });
        successCount += 1;
      } catch (error) {
        await Message.create({
          recipientType: 'Contact',
          recipientId: contact.id,
          phoneNumber: contact.phoneNumber,
          content,
          status: 'failed',
          response: { direction: 'outbound', error: error.message },
        });
        failCount += 1;
      }
    }

    res.json({
      message: 'Tag segment SMS dispatched',
      successCount,
      failCount,
      total: contacts.length,
    });
  } catch (error) {
    console.error('sendTagsSMS error:', error);
    res.status(500).json({ message: 'Failed to send tag segment SMS' });
  }
};

module.exports = {
  sendCampaignMessages,
  sendGroupSMS,
  sendContactsSMS,
  previewGeoAudience,
  sendGeoSMS,
  getDeliveryStatus,
  receiveInboundSMS,
  receiveDeliveryReport,
  sendToPhone,
  sendTagsSMS,
  reportLiveLocation,
  verifyLiveLocationIngestKey,
};