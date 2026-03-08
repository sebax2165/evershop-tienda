import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response) => {
  try {
    const period = request.query?.period || '30d';

    // Build date filter
    let dateFilter: string | null = null;
    if (period === '7d') {
      dateFilter = "created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === '30d') {
      dateFilter = "created_at >= NOW() - INTERVAL '30 days'";
    }
    // 'all' => no date filter

    // --- Total orders & revenue ---
    let orderQuery = select('COUNT(*)::int AS total_orders')
      .select('COALESCE(SUM(grand_total), 0)::float AS total_revenue')
      .select(
        'CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(grand_total) / COUNT(*), 0)::float ELSE 0 END AS average_order_value'
      )
      .from('"order"');

    if (dateFilter) {
      orderQuery = orderQuery.where('created_at', '>=', getDateBound(period));
    }

    const orderStats = await orderQuery.execute(pool);
    const stats = orderStats[0] || {
      total_orders: 0,
      total_revenue: 0,
      average_order_value: 0
    };

    // --- Last 7 days stats (always fetch for subtitle) ---
    const last7Query = select('COUNT(*)::int AS cnt')
      .select('COALESCE(SUM(grand_total), 0)::float AS rev')
      .from('"order"')
      .where('created_at', '>=', getDateBound('7d'));

    const last7 = await last7Query.execute(pool);
    const last7Stats = last7[0] || { cnt: 0, rev: 0 };

    // --- Last 30 days stats ---
    const last30Query = select('COUNT(*)::int AS cnt')
      .select('COALESCE(SUM(grand_total), 0)::float AS rev')
      .from('"order"')
      .where('created_at', '>=', getDateBound('30d'));

    const last30 = await last30Query.execute(pool);
    const last30Stats = last30[0] || { cnt: 0, rev: 0 };

    // --- Abandoned orders ---
    let abandonedCount = 0;
    try {
      let abandonedQuery = select('COUNT(*)::int AS cnt').from(
        'cod_abandoned_order'
      );
      if (dateFilter) {
        abandonedQuery = abandonedQuery.where(
          'created_at',
          '>=',
          getDateBound(period)
        );
      }
      const abandonedResult = await abandonedQuery.execute(pool);
      abandonedCount = abandonedResult[0]?.cnt || 0;
    } catch {
      // Table may not exist yet
      abandonedCount = 0;
    }

    // --- Conversion rate ---
    const totalAttempts =
      Number(stats.total_orders) + Number(abandonedCount);
    const conversionRate =
      totalAttempts > 0
        ? Math.round((Number(stats.total_orders) / totalAttempts) * 100)
        : 0;

    // --- Upsell accept rate ---
    let upsellAcceptRate = 0;
    try {
      const upsellTotal = await select('COUNT(*)::int AS cnt')
        .from('cod_upsell_event')
        .execute(pool);
      const upsellAccepted = await select('COUNT(*)::int AS cnt')
        .from('cod_upsell_event')
        .where('accepted', '=', true)
        .execute(pool);

      const total = upsellTotal[0]?.cnt || 0;
      const accepted = upsellAccepted[0]?.cnt || 0;
      upsellAcceptRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    } catch {
      // Table may not exist yet
      upsellAcceptRate = 0;
    }

    // --- Recent orders ---
    let recentQuery = select(
      'order_id',
      'order_number',
      'grand_total',
      'created_at',
      'payment_status'
    )
      .from('"order"')
      .orderBy('created_at', 'DESC')
      .limit(0, 10);

    const recentOrders = await recentQuery.execute(pool);

    // --- Top products ---
    let topProducts: Array<{
      product_name: string;
      total_orders: number;
      total_revenue: number;
    }> = [];
    try {
      let topQuery = select(
        'oi.product_name',
        'COUNT(DISTINCT oi.order_item_order_id)::int AS total_orders',
        'COALESCE(SUM(oi.final_price * oi.qty), 0)::float AS total_revenue'
      )
        .from('order_item', 'oi');

      if (dateFilter) {
        topQuery = topQuery
          .leftJoin('"order"', 'o')
          .on('oi.order_item_order_id', '=', 'o.order_id')
          .where('o.created_at', '>=', getDateBound(period));
      }

      topQuery = topQuery
        .groupBy('oi.product_name')
        .orderBy('total_orders', 'DESC')
        .limit(0, 5);

      topProducts = await topQuery.execute(pool);
    } catch {
      // If order_item table structure differs, gracefully handle
      topProducts = [];
    }

    response.status(OK);
    return response.json({
      data: {
        totalOrders: Number(stats.total_orders),
        totalRevenue: Number(stats.total_revenue),
        averageOrderValue: Number(stats.average_order_value),
        abandonedOrders: abandonedCount,
        conversionRate,
        upsellAcceptRate,
        recentOrders: recentOrders.map((o) => ({
          order_id: o.order_id,
          order_number: o.order_number,
          grand_total: Number(o.grand_total),
          created_at: o.created_at,
          payment_status: o.payment_status
        })),
        topProducts: topProducts.map((p) => ({
          product_name: p.product_name,
          total_orders: Number(p.total_orders),
          total_revenue: Number(p.total_revenue)
        })),
        last7DaysOrders: Number(last7Stats.cnt),
        last30DaysOrders: Number(last30Stats.cnt),
        last7DaysRevenue: Number(last7Stats.rev),
        last30DaysRevenue: Number(last30Stats.rev)
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};

function getDateBound(period: string): string {
  const now = new Date();
  if (period === '7d') {
    now.setDate(now.getDate() - 7);
  } else if (period === '30d') {
    now.setDate(now.getDate() - 30);
  } else {
    // Return very old date for "all"
    return '2000-01-01';
  }
  return now.toISOString();
}
