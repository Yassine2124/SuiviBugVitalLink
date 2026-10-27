const Attendance = require('../models/Attendance');
const imagekit = require('../config/imagekit');
const { getOrCreate } = require('./attendanceSettingsController');

const TZ = 'Africa/Conakry';
const MAX_ACCURACY = 300;

function localParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const get = (type) => parts.find(p => p.type === type).value;
  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute'))
  };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function validatePunch(req, settings) {
  const { signature, latitude, longitude, accuracy } = req.body || {};

  if (!req.user.isStaff) return { status: 403, error: "Vous n'êtes pas concerné par le pointage." };

  if (settings.latitude == null || settings.longitude == null) {
    return { status: 400, error: "La zone de pointage n'est pas encore configurée. Contactez un administrateur." };
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  const acc = Number(accuracy);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { status: 400, error: 'Position invalide.' };
  }

  if (Number.isFinite(acc) && acc > MAX_ACCURACY) {
    return { status: 400, error: `Position trop imprécise (environ ${Math.round(acc)} m). Activez le GPS ou rapprochez-vous d'une fenêtre, puis réessayez.` };
  }

  if (typeof signature !== 'string' || !/^data:image\/png;base64,/.test(signature) || signature.length < 500 || signature.length > 700000) {
    return { status: 400, error: 'Signature manquante ou invalide.' };
  }

  const distance = distanceMeters(lat, lng, settings.latitude, settings.longitude);
  if (distance > settings.radius) {
    return { status: 403, error: `Vous êtes à environ ${Math.round(distance)} m du site « ${settings.siteName} ». Le pointage est autorisé dans un rayon de ${settings.radius} m.` };
  }

  return {
    lat, lng,
    accuracy: Number.isFinite(acc) ? Math.round(acc) : null,
    distance: Math.round(distance),
    signature
  };
}

async function uploadSignature(dataUrl, userId, kind, dateStr) {
  const result = await imagekit.upload({
    file: dataUrl.replace(/^data:image\/png;base64,/, ''),
    fileName: `sig_${kind}_${userId}_${dateStr}.png`,
    folder: '/signatures'
  });
  return result.url;
}

exports.getToday = async (req, res) => {
  try {
    const settings = await getOrCreate();
    const { dateStr } = localParts(new Date());
    const record = await Attendance.findOne({ user: req.user._id, date: dateStr });
    res.json({
      isStaff: !!req.user.isStaff,
      zoneConfigured: settings.latitude != null && settings.longitude != null,
      siteName: settings.siteName,
      radius: settings.radius,
      workStart: settings.workStart,
      toleranceMinutes: settings.toleranceMinutes,
      date: dateStr,
      record
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMine = async (req, res) => {
  try {
    const { month } = req.query;
    const filter = { user: req.user._id };
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Mois invalide (format AAAA-MM)' });
      filter.date = { $regex: `^${month}` };
    }
    const records = await Attendance.find(filter).sort({ date: -1 }).limit(100);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.clockIn = async (req, res) => {
  try {
    const settings = await getOrCreate();
    const check = validatePunch(req, settings);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const now = new Date();
    const { dateStr, hour, minute } = localParts(now);

    const existing = await Attendance.findOne({ user: req.user._id, date: dateStr });
    if (existing) return res.status(400).json({ error: "Vous avez déjà pointé votre arrivée aujourd'hui." });

    const dayOfWeek = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
    const isHoliday = settings.holidays.some(h => h.date === dateStr);
    const isWorkingDay = settings.workDays.includes(dayOfWeek) && !isHoliday;

    const start = toMinutes(settings.workStart);
    const limit = start + settings.toleranceMinutes;
    const arrivalMinutes = hour * 60 + minute;
    const isLate = isWorkingDay && arrivalMinutes > limit;
    const lateMinutes = isLate ? arrivalMinutes - start : 0;

    const signatureUrl = await uploadSignature(check.signature, req.user._id, 'in', dateStr);

    const record = await Attendance.create({
      user: req.user._id,
      userName: req.user.name,
      date: dateStr,
      isWorkingDay,
      isLate,
      lateMinutes,
      arrival: {
        time: now,
        signatureUrl,
        latitude: check.lat,
        longitude: check.lng,
        accuracy: check.accuracy,
        distance: check.distance
      }
    });

    res.status(201).json(record);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: "Vous avez déjà pointé votre arrivée aujourd'hui." });
    res.status(500).json({ error: err.message });
  }
};

exports.clockOut = async (req, res) => {
  try {
    const settings = await getOrCreate();
    const check = validatePunch(req, settings);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const now = new Date();
    const { dateStr } = localParts(now);

    const record = await Attendance.findOne({ user: req.user._id, date: dateStr });
    if (!record) return res.status(400).json({ error: "Vous devez d'abord pointer votre arrivée." });
    if (record.departure && record.departure.time) {
      return res.status(400).json({ error: "Vous avez déjà pointé votre départ aujourd'hui." });
    }

    const signatureUrl = await uploadSignature(check.signature, req.user._id, 'out', dateStr);

    record.departure = {
      time: now,
      signatureUrl,
      latitude: check.lat,
      longitude: check.lng,
      accuracy: check.accuracy,
      distance: check.distance
    };
    await record.save();

    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};