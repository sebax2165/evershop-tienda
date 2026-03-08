import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response) => {
  try {
    const { country, order_total, product_ids, shipping_type } = request.body || {};

    if (order_total === undefined && !country && !product_ids && !shipping_type) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'At least one condition parameter is required'
      });
    }

    const rules = await select()
      .from('cod_conditional_rule')
      .where('enabled', '=', true)
      .orderBy('priority', 'DESC')
      .execute(pool);

    for (const rule of rules) {
      let conditions;
      try {
        conditions =
          typeof rule.conditions === 'string'
            ? JSON.parse(rule.conditions)
            : rule.conditions;
      } catch {
        // Skip rules with malformed JSON conditions
        continue;
      }

      let matched = false;

      switch (rule.rule_type) {
        case 'order_total_range': {
          if (order_total !== undefined) {
            const min = conditions.min !== undefined ? Number(conditions.min) : -Infinity;
            const max = conditions.max !== undefined ? Number(conditions.max) : Infinity;
            const total = Number(order_total);
            matched = total >= min && total <= max;
          }
          break;
        }
        case 'country_whitelist': {
          if (country && Array.isArray(conditions.countries)) {
            matched = conditions.countries.includes(country);
          }
          break;
        }
        case 'product_blacklist': {
          if (Array.isArray(product_ids) && Array.isArray(conditions.product_ids)) {
            matched = product_ids.some((pid: string | number) =>
              conditions.product_ids.includes(String(pid))
            );
          }
          break;
        }
        case 'shipping_type': {
          if (shipping_type && Array.isArray(conditions.shipping_types)) {
            matched = conditions.shipping_types.includes(shipping_type);
          }
          break;
        }
        default:
          break;
      }

      if (matched) {
        // Determine if the rule blocks or allows COD based on the operator
        const operator = rule.operator || 'block';

        if (operator === 'block') {
          response.status(OK);
          return response.json({
            success: true,
            data: {
              codAvailable: false,
              reason: `Blocked by rule: ${rule.rule_type} (priority ${rule.priority})`
            }
          });
        }

        if (operator === 'allow') {
          response.status(OK);
          return response.json({
            success: true,
            data: {
              codAvailable: true,
              reason: `Allowed by rule: ${rule.rule_type} (priority ${rule.priority})`
            }
          });
        }
      }
    }

    // No rule matched — COD is available by default
    response.status(OK);
    return response.json({
      success: true,
      data: {
        codAvailable: true
      }
    });
  } catch (e) {
    console.error('[ConditionalCheck] Error:', (e as Error).message);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: 'Error al verificar las reglas'
    });
  }
};
