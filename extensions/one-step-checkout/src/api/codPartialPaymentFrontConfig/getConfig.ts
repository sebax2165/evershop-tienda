import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response) => {
  try {
    const { product_id } = request.params;

    // Check if partial payment is enabled globally
    const partialSetting = await select()
      .from('cod_settings')
      .where('setting_key', '=', 'partial_payment_enabled')
      .execute(pool);

    const partialEnabled =
      partialSetting.length > 0 && partialSetting[0].setting_value === 'true';

    if (!partialEnabled) {
      response.status(OK);
      return response.json({
        success: true,
        data: {
          enabled: false,
          depositType: null,
          depositValue: null,
          minOrderTotal: null,
          maxOrderTotal: null
        }
      });
    }

    // Try product-specific config first
    let config = await select()
      .from('cod_partial_payment_config')
      .where('product_id', '=', product_id)
      .execute(pool);

    // Fall back to global config (product_id IS NULL)
    if (config.length === 0) {
      config = await select()
        .from('cod_partial_payment_config')
        .where('product_id', 'IS NULL', null)
        .execute(pool);
    }

    if (config.length === 0) {
      response.status(OK);
      return response.json({
        success: true,
        data: {
          enabled: false,
          depositType: null,
          depositValue: null,
          minOrderTotal: null,
          maxOrderTotal: null
        }
      });
    }

    const c = config[0];
    response.status(OK);
    return response.json({
      success: true,
      data: {
        enabled: c.enabled,
        depositType: c.deposit_type,
        depositValue: c.deposit_value,
        minOrderTotal: c.min_order_total,
        maxOrderTotal: c.max_order_total
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
