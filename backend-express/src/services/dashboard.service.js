import prisma from '../config/database.js';

export const dashboardService = {
  async getOverview() {
    try {
      const [
        truckStats,
        excavatorStats,
        activeHauling,
        todayProduction,
        operatorStats,
        latestWeather,
        recentIncidents,
      ] = await Promise.all([
        prisma.truck
          .groupBy({
            by: ['status'],
            _count: true,
          })
          .catch(() => []),
        prisma.excavator
          .groupBy({
            by: ['status'],
            _count: true,
          })
          .catch(() => []),
        prisma.haulingActivity
          .count({
            where: {
              status: { in: ['LOADING', 'HAULING', 'DUMPING', 'RETURNING'] },
            },
          })
          .catch(() => 0),
        prisma.productionRecord
          .aggregate({
            where: {
              recordDate: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
            _sum: {
              actualProduction: true,
              targetProduction: true,
              totalFuel: true,
            },
          })
          .catch(() => ({ _sum: { actualProduction: 0, targetProduction: 0, totalFuel: 0 } })),
        prisma.operator
          .aggregate({
            where: { status: 'ACTIVE' },
            _sum: { salary: true },
          })
          .catch(() => ({ _sum: { salary: 0 } })),
        prisma.weatherLog
          .findFirst({
            orderBy: { timestamp: 'desc' },
            select: {
              condition: true,
              riskLevel: true,
              isOperational: true,
              miningSite: {
                select: { name: true },
              },
            },
          })
          .catch(() => null),
        prisma.incidentReport
          .count({
            where: {
              incidentDate: {
                gte: new Date(new Date().setDate(new Date().getDate() - 7)),
              },
            },
          })
          .catch(() => 0),
      ]);

      const trucksOperating = truckStats
        .filter((s) => ['HAULING', 'LOADING', 'DUMPING', 'IN_QUEUE'].includes(s.status))
        .reduce((sum, s) => sum + s._count, 0);
      const excavatorsOperating = excavatorStats
        .filter((s) => ['ACTIVE', 'LOADING', 'STANDBY'].includes(s.status))
        .reduce((sum, s) => sum + s._count, 0);

      return {
        fleetStatus: {
          trucksOperating,
          excavatorsOperating,
        },
        fleet: {
          trucks: truckStats,
          excavators: excavatorStats,
          activeOperations: activeHauling,
        },
        activeHauling,
        todayProduction: todayProduction._sum.actualProduction || 0,
        production: {
          todayActual: todayProduction._sum.actualProduction || 0,
          todayTarget: todayProduction._sum.targetProduction || 0,
          todayAchievement:
            todayProduction._sum.targetProduction > 0
              ? (todayProduction._sum.actualProduction / todayProduction._sum.targetProduction) *
                100
              : 0,
        },
        financials: {
          estimatedFuelCost: (todayProduction._sum.totalFuel || 0) * 15000,
          estimatedOperatorCost: (operatorStats._sum?.salary || 0) / 30, // Daily rate
          currency: 'IDR',
        },
        weather: latestWeather,
        safety: {
          recentIncidents,
        },
      };
    } catch (error) {
      console.error('Dashboard overview error:', error);
      throw error;
    }
  },

  async getEquipmentUtilization(startDate, endDate) {
    const where = {
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      where.loadingStartTime = {};
      if (startDate) where.loadingStartTime.gte = new Date(startDate);
      if (endDate) where.loadingStartTime.lte = new Date(endDate);
    }

    const [truckUtilization, excavatorUtilization] = await Promise.all([
      prisma.haulingActivity.groupBy({
        by: ['truckId'],
        where,
        _count: true,
        _sum: {
          cycleTime: true,
        },
      }),
      prisma.haulingActivity.groupBy({
        by: ['excavatorId'],
        where,
        _count: true,
        _sum: {
          loadingDuration: true,
        },
      }),
    ]);

    const [trucks, excavators] = await Promise.all([
      prisma.truck.findMany({
        where: {
          id: {
            in: truckUtilization.map((u) => u.truckId),
          },
        },
        select: { id: true, code: true, name: true },
      }),
      prisma.excavator.findMany({
        where: {
          id: {
            in: excavatorUtilization.map((u) => u.excavatorId),
          },
        },
        select: { id: true, code: true, name: true },
      }),
    ]);

    return {
      trucks: truckUtilization.map((u) => {
        const truck = trucks.find((t) => t.id === u.truckId);
        return {
          ...truck,
          trips: u._count,
          totalCycleTime: u._sum.cycleTime,
          avgCycleTime: u._sum.cycleTime / u._count,
        };
      }),
      excavators: excavatorUtilization.map((u) => {
        const excavator = excavators.find((e) => e.id === u.excavatorId);
        return {
          ...excavator,
          loads: u._count,
          totalLoadingTime: u._sum.loadingDuration,
          avgLoadingTime: u._sum.loadingDuration / u._count,
        };
      }),
    };
  },

  async getDelayAnalysis(startDate, endDate) {
    const where = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const delays = await prisma.delayReason.groupBy({
      by: ['category', 'reason'],
      where,
      _sum: {
        duration: true,
      },
      _count: true,
    });

    const totalDelays = delays.reduce((sum, d) => sum + d._sum.duration, 0);

    return {
      byCategory: delays.reduce((acc, d) => {
        if (!acc[d.category]) {
          acc[d.category] = {
            totalDuration: 0,
            count: 0,
            reasons: [],
          };
        }
        acc[d.category].totalDuration += d._sum.duration;
        acc[d.category].count += d._count;
        acc[d.category].reasons.push({
          reason: d.reason,
          duration: d._sum.duration,
          count: d._count,
        });
        return acc;
      }, {}),
      totalDelays,
    };
  },

  async getMaintenanceOverview() {
    const [upcoming, overdue, completed] = await Promise.all([
      prisma.maintenanceLog.count({
        where: {
          status: 'SCHEDULED',
          scheduledDate: {
            gte: new Date(),
            lte: new Date(new Date().setDate(new Date().getDate() + 7)),
          },
        },
      }),
      prisma.maintenanceLog.count({
        where: {
          status: 'SCHEDULED',
          scheduledDate: {
            lt: new Date(),
          },
        },
      }),
      prisma.maintenanceLog.count({
        where: {
          status: 'COMPLETED',
          actualDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      }),
    ]);

    return {
      upcoming,
      overdue,
      completed,
    };
  },
};
