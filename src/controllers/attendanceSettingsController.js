const AttendanceSettings = require('../models/AttendanceSettings');

async function getOrCreate() {
  let settings = await AttendanceSettings.findOne();
  if (!settings) settings = await AttendanceSettings.create({});
  return settings;
}

exports.getOrCreate = getOrCreate;

exports.getSettings = async (req, res) => {
  try {
    res.json(await getOrCreate());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { siteName, latitude, longitude, radius, workStart, toleranceMinutes, workDays, holidays, thresholds } = req.body;
    const update = {};

    if (siteName !== undefined) update.siteName = String(siteName).trim();

    if (latitude !== undefined) {
      const lat = Number(latitude);
      if (!(lat >= -90 && lat <= 90)) return res.status(400).json({ error: 'Latitude invalide (entre -90 et 90)' });
      update.latitude = lat;
    }

    if (longitude !== undefined) {
      const lng = Number(longitude);
      if (!(lng >= -180 && lng <= 180)) return res.status(400).json({ error: 'Longitude invalide (entre -180 et 180)' });
      update.longitude = lng;
    }

    if (radius !== undefined) {
      const r = Number(radius);
      if (!(r >= 10 && r <= 5000)) return res.status(400).json({ error: 'Le rayon doit être entre 10 et 5000 mètres' });
      update.radius = r;
    }

    if (workStart !== undefined) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(workStart)) return res.status(400).json({ error: 'Heure de début invalide (format HH:MM)' });
      update.workStart = workStart;
    }

    if (toleranceMinutes !== undefined) {
      const t = Number(toleranceMinutes);
      if (!Number.isInteger(t) || t < 0 || t > 120) return res.status(400).json({ error: 'La tolérance doit être entre 0 et 120 minutes' });
      update.toleranceMinutes = t;
    }

    if (workDays !== undefined) {
      const valid = Array.isArray(workDays) && workDays.length > 0 && workDays.every(d => Number.isInteger(d) && d >= 0 && d <= 6);
      if (!valid) return res.status(400).json({ error: 'Jours travaillés invalides' });
      update.workDays = [...new Set(workDays)];
    }

    if (holidays !== undefined) {
      const valid = Array.isArray(holidays) && holidays.every(h => /^\d{4}-\d{2}-\d{2}$/.test(h.date));
      if (!valid) return res.status(400).json({ error: 'Jours fériés invalides (date au format AAAA-MM-JJ)' });
      update.holidays = holidays.map(h => ({ date: h.date, label: String(h.label || '').trim() }));
    }

    if (thresholds !== undefined) {
      const { veryGood, satisfactory, watch } = thresholds;
      const ok = [veryGood, satisfactory, watch].every(v => Number(v) >= 0 && Number(v) <= 100) &&
        Number(veryGood) > Number(satisfactory) && Number(satisfactory) > Number(watch);
      if (!ok) return res.status(400).json({ error: 'Seuils invalides (très bon > satisfaisant > à surveiller)' });
      update.thresholds = { veryGood: Number(veryGood), satisfactory: Number(satisfactory), watch: Number(watch) };
    }

    const settings = await getOrCreate();
    settings.set(update);
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};