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
  const { product_id } = request.params;
  const {
    enabled,
    default_country,
    cod_fee,
    custom_button_text,
    show_urgency_timer,
    urgency_timer_minutes,
    show_email,
    show_postcode
  } = request.body;

  try {
    // Check if the product exists
    const product = await select()
      .from('product')
      .where('product_id', '=', product_id)
      .load(pool);

    if (!product) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Product does not exist'
      });
    }

    const connection = await getConnection();
    await startTransaction(connection);

    try {
      const configData = {
        product_id: parseInt(product_id, 10),
        enabled: enabled ?? true,
        default_country: default_country ?? 'CO',
        cod_fee: cod_fee ?? 0,
        custom_button_text: custom_button_text ?? 'Completar Pedido',
        show_urgency_timer: show_urgency_timer ?? false,
        urgency_timer_minutes: urgency_timer_minutes ?? 15,
        show_email: show_email ?? true,
        show_postcode: show_postcode ?? true,
        updated_at: new Date().toISOString()
      };

      // Check if config already exists for this product
      const existing = await select()
        .from('product_checkout_config')
        .where('product_id', '=', product_id)
        .load(connection);

      if (existing) {
        // Update existing config
        await update('product_checkout_config')
          .given(configData)
          .where('product_id', '=', product_id)
          .execute(connection);
      } else {
        // Insert new config
        await insert('product_checkout_config')
          .given(configData)
          .execute(connection);
      }

      await commit(connection);

      // Load the saved config
      const savedConfig = await select()
        .from('product_checkout_config')
        .where('product_id', '=', product_id)
        .load(pool);

      response.status(OK);
      return response.json({
        success: true,
        data: savedConfig
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
