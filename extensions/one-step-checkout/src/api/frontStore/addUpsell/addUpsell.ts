import {
  select,
  insert,
  update,
  startTransaction,
  commit,
  rollback
} from '@evershop/postgres-query-builder';
import {
  getConnection,
  pool
} from '@evershop/evershop/lib/postgres';
import {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  const { order_id } = request.params;
  const { upsell_id, product_id, qty, price } = request.body;

  try {
    // Verify the order exists
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .load(pool);

    if (!order) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify the order was recently created (within 30 minutes) to prevent
    // manipulation of old orders. Only the customer who just placed the order
    // should be able to add upsells.
    const orderAge = Date.now() - new Date(order.created_at).getTime();
    const MAX_UPSELL_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
    if (orderAge > MAX_UPSELL_WINDOW_MS) {
      response.status(403);
      return response.json({
        success: false,
        message: 'Upsell window has expired'
      });
    }

    // Verify the upsell exists
    const upsell = await select()
      .from('cod_upsell')
      .where('cod_upsell_id', '=', parseInt(upsell_id, 10))
      .load(pool);

    if (!upsell) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Upsell not found'
      });
    }

    // Get the product details
    const product = await select('p.*', 'pd.name')
      .from('product', 'p')
      .leftJoin('product_description', 'pd')
      .on('p.product_id', '=', 'pd.product_description_product_id')
      .where('p.product_id', '=', parseInt(product_id, 10))
      .load(pool);

    if (!product) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validate that the product is the configured offer product for this upsell
    if (parseInt(product_id, 10) !== upsell.offer_product_id) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Product does not match upsell offer'
      });
    }

    const connection = await getConnection();
    await startTransaction(connection);

    try {
      const itemQty = Math.min(Math.max(parseInt(qty, 10) || 1, 1), 10);
      // Use the product price from DB, not from user input
      const itemPrice = parseFloat(product.price) || 0;
      const lineTotal = itemPrice * itemQty;

      // Add order item
      const orderItem = await insert('order_item')
        .given({
          order_item_order_id: order.order_id,
          product_id: parseInt(product_id, 10),
          product_name: product.name,
          product_sku: product.sku,
          product_price: itemPrice,
          qty: itemQty,
          final_price: itemPrice,
          total: lineTotal
        })
        .execute(connection);

      // Update order totals
      const newGrandTotal =
        parseFloat(order.grand_total) + lineTotal;
      const newSubTotal =
        parseFloat(order.sub_total) + lineTotal;

      await update('order')
        .given({
          grand_total: newGrandTotal,
          sub_total: newSubTotal
        })
        .where('order_id', '=', order.order_id)
        .execute(connection);

      // Log upsell event
      await insert('cod_upsell_event')
        .given({
          order_id: order.order_id,
          upsell_id: parseInt(upsell_id, 10),
          event_type: 'accepted',
          ab_variant: upsell.ab_variant || null,
          created_at: new Date().toISOString()
        })
        .execute(connection);

      await commit(connection);

      response.status(OK);
      return response.json({
        success: true,
        data: {
          order_item_id: orderItem.order_item_id,
          new_grand_total: newGrandTotal
        }
      });
    } catch (e) {
      await rollback(connection);
      throw e;
    }
  } catch (e) {
    console.error('[AddUpsell] Error:', (e as Error).message);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: 'Error al procesar el upsell'
    });
  }
};
