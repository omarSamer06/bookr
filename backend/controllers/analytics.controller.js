import Business from '../models/Business.js';
import Appointment from '../models/Appointment.js';

/** Prevents owners from querying other businesses by never trusting business ids from the request */
async function findOwnedBusiness(ownerId) {
  return Business.findOne({ owner: ownerId }).select('_id');
}

/** Uses UTC boundaries to match how Appointment.date is stored (UTC midnight) */
function getPeriodWindow(periodRaw) {
  const period = String(periodRaw || 'month').toLowerCase();
  const now = new Date();

  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (period === 'week') {
    const start = new Date(startOfTodayUtc);
    start.setUTCDate(start.getUTCDate() - 6);
    return { period: 'week', startDate: start };
  }

  if (period === 'year') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return { period: 'year', startDate: start };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { period: 'month', startDate: start };
}

/** Aggregates owner-scoped performance stats without loading appointment rows into JS memory */
export const getOverviewStats = async (req, res) => {
  try {
    const business = await findOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const [stats = null] = await Appointment.aggregate([
      { $match: { business: business._id } },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          totalPaidAppointments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$service.price', 0],
            },
          },
          nonCancelledAppointments: {
            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] },
          },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          noShowAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] },
          },
          uniqueClients: { $addToSet: '$client' },
        },
      },
      {
        $project: {
          _id: 0,
          totalAppointments: 1,
          totalRevenue: { $ifNull: ['$totalRevenue', 0] },
          totalUniqueClients: { $size: { $ifNull: ['$uniqueClients', []] } },
          completionRate: {
            $cond: [
              { $gt: ['$nonCancelledAppointments', 0] },
              {
                $multiply: [
                  { $divide: ['$completedAppointments', '$nonCancelledAppointments'] },
                  100,
                ],
              },
              0,
            ],
          },
          noShowRate: {
            $cond: [
              { $gt: ['$nonCancelledAppointments', 0] },
              {
                $multiply: [
                  { $divide: ['$noShowAppointments', '$nonCancelledAppointments'] },
                  100,
                ],
              },
              0,
            ],
          },
          averageAppointmentValue: {
            $cond: [
              { $gt: ['$totalPaidAppointments', 0] },
              { $divide: ['$totalRevenue', '$totalPaidAppointments'] },
              0,
            ],
          },
        },
      },
    ]);

    const overview = stats ?? {
      totalAppointments: 0,
      totalRevenue: 0,
      completionRate: 0,
      noShowRate: 0,
      totalUniqueClients: 0,
      averageAppointmentValue: 0,
    };

    return res.status(200).json({
      success: true,
      message: 'Analytics overview retrieved',
      data: { overview },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load analytics overview',
      data: {},
    });
  }
};

/** Returns chart-ready time series grouped by day or month using date aggregation */
export const getAppointmentsByPeriod = async (req, res) => {
  try {
    const business = await findOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const { period, startDate } = getPeriodWindow(req.query.period);
    const dateFormat = period === 'year' ? '%Y-%m' : '%Y-%m-%d';

    const series = await Appointment.aggregate([
      { $match: { business: business._id, date: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$date',
              timezone: 'UTC',
            },
          },
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$service.price', 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1,
          revenue: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Appointments by period retrieved',
      data: { period, startDate, series },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load appointments by period',
      data: {},
    });
  }
};

/** Breaks down bookings by service snapshot so historical names/prices stay consistent */
export const getServiceBreakdown = async (req, res) => {
  try {
    const business = await findOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const [result = null] = await Appointment.aggregate([
      { $match: { business: business._id, status: { $ne: 'cancelled' } } },
      {
        $facet: {
          perService: [
            {
              $group: {
                _id: '$service.name',
                count: { $sum: 1 },
                revenue: {
                  $sum: {
                    $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$service.price', 0],
                  },
                },
              },
            },
            { $sort: { count: -1, _id: 1 } },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          totalCount: { $ifNull: [{ $first: '$totals.totalCount' }, 0] },
          perService: 1,
        },
      },
      {
        $project: {
          breakdown: {
            $map: {
              input: '$perService',
              as: 's',
              in: {
                serviceName: '$$s._id',
                count: '$$s.count',
                revenue: '$$s.revenue',
                percentage: {
                  $cond: [
                    { $gt: ['$totalCount', 0] },
                    { $multiply: [{ $divide: ['$$s.count', '$totalCount'] }, 100] },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Service breakdown retrieved',
      data: { breakdown: result?.breakdown ?? [] },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load service breakdown',
      data: {},
    });
  }
};

/** Surfaces demand by hour string so owners can tune working hours without exporting raw appointments */
export const getBusiestHours = async (req, res) => {
  try {
    const business = await findOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const hours = await Appointment.aggregate([
      { $match: { business: business._id, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$startTime',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          count: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Busiest hours retrieved',
      data: { hours },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load busiest hours',
      data: {},
    });
  }
};

/** Computes client insights without exposing emails by returning only display names and counts */
export const getClientStats = async (req, res) => {
  try {
    const business = await findOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const [result = null] = await Appointment.aggregate([
      { $match: { business: business._id, status: { $ne: 'cancelled' } } },
      {
        $facet: {
          newClientsPerMonth: [
            { $sort: { client: 1, date: 1 } },
            {
              $group: {
                _id: '$client',
                firstBookingDate: { $first: '$date' },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m',
                    date: '$firstBookingDate',
                    timezone: 'UTC',
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, month: '$_id', count: 1 } },
          ],
          returningClients: [
            { $group: { _id: '$client', count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $count: 'count' },
          ],
          topClients: [
            { $group: { _id: '$client', appointmentCount: { $sum: 1 } } },
            { $sort: { appointmentCount: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'client',
              },
            },
            { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                clientId: '$_id',
                clientName: '$client.name',
                appointmentCount: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          newClientsPerMonth: 1,
          returningClientsCount: { $ifNull: [{ $first: '$returningClients.count' }, 0] },
          topClients: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Client stats retrieved',
      data: {
        newClientsPerMonth: result?.newClientsPerMonth ?? [],
        returningClientsCount: result?.returningClientsCount ?? 0,
        topClients: result?.topClients ?? [],
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load client stats',
      data: {},
    });
  }
};

/** Powers the dashboard feed without returning PII beyond the client display name */
export const getRecentActivity = async (req, res) => {
  try {
    const business = await findOwnedBusiness(req.user._id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        data: {},
      });
    }

    const activity = await Appointment.aggregate([
      { $match: { business: business._id } },
      { $sort: { date: -1, startTime: -1, createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'client',
          foreignField: '_id',
          as: 'client',
        },
      },
      { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          clientName: '$client.name',
          service: '$service.name',
          date: 1,
          startTime: 1,
          status: 1,
          paymentStatus: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: 'Recent activity retrieved',
      data: { activity },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Could not load recent activity',
      data: {},
    });
  }
};

