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
} from '@evershop/evershop/src/lib/postgres/connection.js';
import {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';

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

    const connection = await getConnection();
    await startTransaction(connection);

    try {
      const itemQty = parseInt(qty, 10) || 1;
      const itemPrice = parseFloat(price) || parseFloat(product.price) || 0;
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
          product_id: parseInt(product_id, 10),
          qty: itemQty,
          price: itemPrice,
          upsell_type: upsell.upsell_type,
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
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
