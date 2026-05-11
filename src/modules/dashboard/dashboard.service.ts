import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) { }

  async getStats() {
    // 1. KPIs Principales (Siguen siendo reales)
    const totalRevenue = await this.prisma.payment.aggregate({ _sum: { amount: true } });
    const totalInvoices = await this.prisma.invoice.count();
    const totalCustomers = await this.prisma.customerProfile.count();
    const executedCuts = await this.prisma.serviceCut.count({ where: { status: 'EJECUTADO' } });

    // 2. Lógica de Gráficas Reales (Agrupación por Mes)
    // Obtenemos los ingresos de los últimos 6 meses
    const revenueStats: any[] = await this.prisma.$queryRaw`
      SELECT
        date_trunc('month', "createdAt") as time,
        SUM(amount) as value
      FROM "Payment"
      WHERE "createdAt" > now() - interval '6 months'
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    // Obtenemos el consumo de los últimos 6 meses
    const consumptionStats: any[] = await this.prisma.$queryRaw`
      SELECT
        date_trunc('month', "createdAt") as time,
        SUM(consumption) as value
      FROM "Reading"
      WHERE "createdAt" > now() - interval '6 months'
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    // 3. Mapa de Cortes (Real)
    const mapCutsData = await this.prisma.serviceCut.findMany({
      where: {
        gpsLat: { not: null },
        gpsLng: { not: null },
      },
      select: {
        id: true,
        status: true,
        reason: true,
        gpsLat: true,
        gpsLng: true,
        createdAt: true,
        customer: {
          select: {
            fullName: true,
            address: true,
          }
        }
      }
    });

    // 4. Últimas Lecturas
    const recentReadings = await this.prisma.reading.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { meter: { include: { customer: { include: { district: true } } } } }
    });

    return {
      kpis: {
        revenue: totalRevenue._sum.amount || 0,
        invoices: totalInvoices,
        customers: totalCustomers,
        cuts: executedCuts,
      },
      recentReadings: recentReadings.map(r => ({
        id: r.id,
        customer: r.meter.customer?.fullName || 'Desconocido',
        zone: r.meter.customer?.district?.name || '-',
        meter: r.meter.code,
        consumption: r.consumption.toString(),
        status: r.consumption > 50 ? 'Alerta Fuga' : 'Normal'
      })),
      mapData: mapCutsData,
      charts: {
        // Formateamos la fecha para que el frontend (Lightweight Charts) la entienda
        revenue: revenueStats.map(stat => ({
          time: stat.time.toISOString().split('T')[0],
          value: Number(stat.value)
        })),
        consumption: consumptionStats.map(stat => ({
          time: stat.time.toISOString().split('T')[0],
          value: Number(stat.value)
        }))
      }
    };
  }
}
