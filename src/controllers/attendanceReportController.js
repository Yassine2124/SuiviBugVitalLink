const Attendance = require('../models/Attendance');
const AttendanceException = require('../models/AttendanceException');
const User = require('../models/User');
const { getOrCreate } = require('./attendanceSettingsController');

const TZ = 'Africa/Conakry';
const MAX_DAYS = 366;

const dateStrOf = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

function eachDate(from, to) {
  const list = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    list.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return list;
}

const weekday = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay();

function resolvePeriod(query) {
  const { month, from, to } = query;
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) return { error: 'Mois invalide (format AAAA-MM)' };
    const [y, m] = month.split('-').map(Number);
    if (m < 1 || m > 12) return { error: 'Mois invalide (format AAAA-MM)' };
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
  }
  if (from && to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return { error: 'Dates invalides (format AAAA-MM-JJ)' };
    if (from > to) return { error: 'La date de début doit précéder la date de fin' };
    return { from, to };
  }
  return { error: 'Indiquez un mois (month) ou une période (from et to)' };
}

const punch = (p) => (p && p.time ? { time: p.time, signatureUrl: p.signatureUrl || null } : null);

exports.getReport = async (req, res) => {
  try {
    const period = resolvePeriod(req.query);
    if (period.error) return res.status(400).json({ error: period.error });
    const { from, to } = period;

    const days = eachDate(from, to);
    if (days.length > MAX_DAYS) return res.status(400).json({ error: 'Période trop longue (maximum 366 jours)' });

    const settings = await getOrCreate();
    const today = dateStrOf(new Date());
    const holidays = new Set(settings.holidays.map(h => h.date));

    const staff = await User.find({ isApproved: true, isStaff: true }).select('name email staffSince createdAt').sort({ name: 1 });
    const ids = staff.map(s => s._id);

    const [records, exceptions] = await Promise.all([
      Attendance.find({ user: { $in: ids }, date: { $gte: from, $lte: to } }),
      AttendanceException.find({ user: { $in: ids }, date: { $gte: from, $lte: to } })
    ]);

    const recMap = new Map(records.map(r => [`${r.user}_${r.date}`, r]));
    const excMap = new Map(exceptions.map(e => [`${e.user}_${e.date}`, e]));

    const members = staff.map(member => {
      const startDate = dateStrOf(member.staffSince || member.createdAt);
      const stats = { present: 0, onTime: 0, late: 0, lateMinutes: 0, absJustified: 0, absUnjustified: 0, missions: 0, missingDeparture: 0, hours: 0 };
      const rows = [];

      for (const day of days) {
        if (day < startDate || day > today) continue;

        const key = `${member._id}_${day}`;
        const rec = recMap.get(key);
        const exc = excMap.get(key);

        if (rec) {
          const arrival = punch(rec.arrival);
          const departure = punch(rec.departure);
          const missingDeparture = !departure && day < today;
          let status = 'nonWorking';

          if (rec.isWorkingDay) {
            stats.present += 1;
            if (rec.isLate) {
              status = 'late';
              stats.late += 1;
              stats.lateMinutes += rec.lateMinutes;
            } else {
              status = 'onTime';
              stats.onTime += 1;
            }
          }

          if (missingDeparture) stats.missingDeparture += 1;

          let hours = null;
          if (arrival && departure) {
            hours = Math.round(((new Date(departure.time) - new Date(arrival.time)) / 36e5) * 100) / 100;
            stats.hours += hours;
          }

          rows.push({
            date: day, status, lateMinutes: rec.lateMinutes || 0, arrival, departure,
            missingDeparture, hours, reason: exc ? exc.reason : '', exceptionId: exc ? exc._id : null
          });
          continue;
        }

        const isWorkday = settings.workDays.includes(weekday(day)) && !holidays.has(day);
        if (!isWorkday) continue;
        if (day === today && !exc) continue;

        let status = 'absent';
        if (exc && exc.type === 'mission') {
          status = 'mission';
          stats.missions += 1;
        } else if (exc && exc.type === 'justified') {
          status = 'justified';
          stats.absJustified += 1;
        } else {
          stats.absUnjustified += 1;
        }

        rows.push({
          date: day, status, lateMinutes: 0, arrival: null, departure: null,
          missingDeparture: false, hours: null, reason: exc ? exc.reason : '', exceptionId: exc ? exc._id : null
        });
      }

      const rate = stats.present > 0 ? Math.round((stats.onTime / stats.present) * 100) : null;
      let rating = null;
      if (rate !== null) {
        const t = settings.thresholds;
        rating = rate >= t.veryGood ? 'veryGood' : rate >= t.satisfactory ? 'satisfactory' : rate >= t.watch ? 'watch' : 'insufficient';
      }

      return {
        userId: member._id,
        name: member.name,
        email: member.email,
        since: startDate,
        ...stats,
        hours: Math.round(stats.hours * 100) / 100,
        expectedDays: stats.present + stats.missions + stats.absJustified + stats.absUnjustified,
        rate,
        rating,
        days: rows
      };
    });

    const totals = members.reduce((acc, m) => ({
      present: acc.present + m.present,
      onTime: acc.onTime + m.onTime,
      late: acc.late + m.late,
      lateMinutes: acc.lateMinutes + m.lateMinutes,
      absJustified: acc.absJustified + m.absJustified,
      absUnjustified: acc.absUnjustified + m.absUnjustified,
      missions: acc.missions + m.missions,
      expectedDays: acc.expectedDays + m.expectedDays
    }), { present: 0, onTime: 0, late: 0, lateMinutes: 0, absJustified: 0, absUnjustified: 0, missions: 0, expectedDays: 0 });

    totals.rate = totals.present > 0 ? Math.round((totals.onTime / totals.present) * 100) : null;

    res.json({
      period: { from, to },
      settings: { workStart: settings.workStart, toleranceMinutes: settings.toleranceMinutes, thresholds: settings.thresholds },
      totals,
      members
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertException = async (req, res) => {
  try {
    const { userId, date, type, reason } = req.body;
    if (!userId) return res.status(400).json({ error: 'Membre manquant' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ error: 'Date invalide (format AAAA-MM-JJ)' });
    if (!['justified', 'mission'].includes(type)) return res.status(400).json({ error: 'Type invalide' });

    const member = await User.findOne({ _id: userId, isStaff: true });
    if (!member) return res.status(404).json({ error: 'Membre du personnel introuvable' });

    const exception = await AttendanceException.findOneAndUpdate(
      { user: userId, date },
      { type, reason: String(reason || '').trim().slice(0, 200), createdBy: req.user._id, createdByName: req.user.name },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(exception);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteException = async (req, res) => {
  try {
    const exception = await AttendanceException.findByIdAndDelete(req.params.id);
    if (!exception) return res.status(404).json({ error: 'Entrée introuvable' });
    res.json({ message: 'Supprimé' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};