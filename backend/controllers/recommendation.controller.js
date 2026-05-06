import mongoose from 'mongoose';
import { getRecommendedSlots } from '../services/recommendation.service.js';

/** Keeps parsing aligned with how Appointment.date is stored (UTC midnight) */
function parseUtcDateOnly(dateStr) {
  const raw = String(dateStr ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const utc = new Date(Date.UTC(y, mo - 1, d));
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== mo - 1 || utc.getUTCDate() !== d) return null;
  return utc;
}

/** Recommends slots using deterministic heuristics rather than hidden ML behavior */
export const getRecommendations = async (req, res) => {
  try {
    const { businessId, serviceId, date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(String(businessId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business id',
        data: {},
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(serviceId || ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service id',
        data: {},
      });
    }

    const parsedDate = parseUtcDateOnly(date);
    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: 'date must be YYYY-MM-DD',
        data: {},
      });
    }

    const recommendations = await getRecommendedSlots(businessId, req.user._id, serviceId, parsedDate);

    return res.status(200).json({
      success: true,
      message: 'Slot recommendations retrieved',
      data: recommendations,
    });
  } catch (err) {
    const status = err?.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
    if (status >= 500) console.error(err);
    return res.status(status).json({
      success: false,
      message: err?.message || 'Could not compute recommendations',
      data: {},
    });
  }
};

