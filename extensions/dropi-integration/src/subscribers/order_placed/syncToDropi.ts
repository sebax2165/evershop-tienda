import { select, insert, update } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import { getSetting } from '@evershop/evershop/setting/services';
import { createDropiOrder, DropiApiError, toIntegerPrice } from '../../services/dropiApi.js';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 30000]; // ms entre reintentos

interface OrderPlacedData {
  order_id: number;
  [key: string]: any;
}

/**
 * Espera un tiempo determinado (para reintentos).
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determina si un error es recuperable (vale la pena reintentar).
 */
function isRetryableError(error: Error): boolean {
  if (error instanceof DropiApiError) {
    // Errores de servidor o rate limit son reintentables
    return [429, 500, 502, 503, 504].includes(error.statusCode);
  }
  // Errores de red son reintentables
  if (error.message.includes('Error de conexion')) return true;
  if (error.message.includes('fetch failed')) return true;
  if (error.message.includes('ECONNREFUSED')) return true;
  if (error.message.includes('ETIMEDOUT')) return true;
  return false;
}

export default async function syncToDropi(data: OrderPlacedData) {
  let syncRecord: any = null;

  try {
    // 1. Read Dropi config (try dropi_config table first, then EverShop settings)
    let token: string | null = null;
    let environment = 'test';
    let autoSync = false;

    const config = await select()
      .from('dropi_config')
      .where('enabled', '=', true)
      .load(pool);

    if (config) {
      token = config.api_key || null;
      environment = config.environment || 'test';
      autoSync = !!config.auto_sync;
    } else {
      // Fallback: read from EverShop settings system
      try {
        token = await getSetting('dropiApiKey', null);
        environment = (await getSetting('dropiEnvironment', 'test')) || 'test';
        const autoSyncSetting = await getSetting('dropiAutoSync', '0');
        autoSync = autoSyncSetting === '1' || autoSyncSetting === 'true';
      } catch {
        // Settings not available
      }
    }

    if (!autoSync) {
      return;
    }

    if (!token) {
      console.warn('[Dropi] Token de integracion no configurado. Omitiendo sincronizacion.');
      return;
    }

    // 2. Load the EverShop order
    const order = await select()
      .from('order')
      .where('order_id', '=', data.order_id)
      .load(pool);

    if (!order) {
      console.error(`[Dropi] Pedido ${data.order_id} no encontrado en la base de datos.`);
      return;
    }

    // Check if already synced successfully
    const existingSync = await select()
      .from('dropi_order_sync')
      .where('evershop_order_id', '=', order.order_id)
      .where('status', '=', 'synced')
      .load(pool);

    if (existingSync) {
      console.info(`[Dropi] Pedido ${order.order_number} ya fue sincronizado (Dropi ID: ${existingSync.dropi_order_id}). Omitiendo.`);
      return;
    }

    // 3. Load shipping address
    const shippingAddress = await select()
      .from('order_address')
      .where('order_address_id', '=', order.shipping_address_id)
      .load(pool);

    if (!shippingAddress) {
      console.error(`[Dropi] Direccion de envio no encontrada para pedido ${order.order_number}.`);
      await createFailedSyncRecord(order.order_id, 'Direccion de envio no encontrada');
      return;
    }

    // 4. Load order items
    const orderItems = await select()
      .from('order_item')
      .where('order_item_order_id', '=', order.order_id)
      .execute(pool);

    if (!orderItems || orderItems.length === 0) {
      console.error(`[Dropi] Pedido ${order.order_number} no tiene items.`);
      await createFailedSyncRecord(order.order_id, 'El pedido no tiene productos');
      return;
    }

    // 5. Map order items to Dropi products
    const dropiProducts: Array<{
      id: number;
      price: number;
      variation_id: number | null;
      quantity: number;
    }> = [];

    const unmappedProducts: string[] = [];

    for (const item of orderItems) {
      const mapping = await select()
        .from('dropi_product_map')
        .where('evershop_product_id', '=', item.product_id)
        .load(pool);

      if (mapping) {
        dropiProducts.push({
          id: mapping.dropi_product_id,
          price: toIntegerPrice(parseFloat(item.final_price) || parseFloat(item.product_price)),
          variation_id: mapping.dropi_variation_id || null,
          quantity: item.qty
        });
      } else {
        unmappedProducts.push(`${item.product_name || item.product_id}`);
        console.warn(
          `[Dropi] Producto EverShop ${item.product_id} (${item.product_name || 'sin nombre'}) no tiene mapeo a Dropi.`
        );
      }
    }

    if (dropiProducts.length === 0) {
      const errorMsg = `Ningun producto tiene mapeo a Dropi. Sin mapear: ${unmappedProducts.join(', ')}`;
      console.warn(`[Dropi] Pedido ${order.order_number}: ${errorMsg}`);
      await createFailedSyncRecord(order.order_id, errorMsg);
      return;
    }

    // 6. Parse full_name into name and surname
    const fullName = shippingAddress.full_name || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // 7. Build the Dropi order payload (formato WooCommerce)
    const dropiOrderData = {
      shop_order_id: `EV-${order.order_number}`,
      state: (shippingAddress.province || shippingAddress.city || '').toUpperCase(),
      city: (shippingAddress.city || '').toUpperCase(),
      client_email: order.customer_email || shippingAddress.email || '',
      name: firstName,
      surname: lastName,
      dir: shippingAddress.address_1 || '',
      notes: order.customer_note || '',
      payment_method_id: 1,
      phone: shippingAddress.telephone || shippingAddress.phone || '',
      rate_type: 'CON RECAUDO',
      type: 'FINAL_ORDER',
      total_order: toIntegerPrice(parseFloat(order.grand_total)),
      products: dropiProducts,
      calculate_costs_and_shiping: true
    };

    // 8. Create sync record as pending
    syncRecord = await insert('dropi_order_sync')
      .given({
        evershop_order_id: order.order_id,
        status: 'pending',
        request_payload: JSON.stringify(dropiOrderData)
      })
      .execute(pool);

    const syncId = syncRecord.insertId || syncRecord.sync_id;

    // 9. Send to Dropi with retry logic
    let lastError: Error | null = null;
    let dropiResponse: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const waitMs = RETRY_DELAYS[attempt - 1] || 30000;
          console.info(`[Dropi] Reintento ${attempt}/${MAX_RETRIES - 1} para pedido ${order.order_number} en ${waitMs}ms...`);

          // Update sync record to show retry status
          await update('dropi_order_sync')
            .given({
              status: 'pending',
              error_message: `Reintento ${attempt} de ${MAX_RETRIES - 1}: ${lastError?.message || ''}`,
              updated_at: new Date().toISOString()
            })
            .where('sync_id', '=', syncId)
            .execute(pool);

          await delay(waitMs);
        }

        dropiResponse = await createDropiOrder(
          dropiOrderData,
          token,
          environment
        );

        // Si llega aqui, fue exitoso
        lastError = null;
        break;
      } catch (e) {
        lastError = e as Error;
        console.error(
          `[Dropi] Intento ${attempt + 1}/${MAX_RETRIES} fallo para pedido ${order.order_number}: ${lastError.message}`
        );

        // Si no es un error reintentable, no reintentar
        if (!isRetryableError(lastError)) {
          console.info(`[Dropi] Error no reintentable. Abortando reintentos.`);
          break;
        }
      }
    }

    // Si todos los intentos fallaron
    if (lastError || !dropiResponse) {
      const errorMsg = lastError?.message || 'Error desconocido al enviar a Dropi';
      console.error(`[Dropi] Pedido ${order.order_number} fallo despues de ${MAX_RETRIES} intentos: ${errorMsg}`);

      await update('dropi_order_sync')
        .given({
          status: 'failed',
          error_message: errorMsg,
          response_payload: lastError instanceof DropiApiError
            ? JSON.stringify({ statusCode: lastError.statusCode, body: lastError.responseBody })
            : null,
          updated_at: new Date().toISOString()
        })
        .where('sync_id', '=', syncId)
        .execute(pool);

      return;
    }

    // 10. Update sync record with success
    const dropiOrderId =
      dropiResponse?.object?.id ||
      dropiResponse?.data?.id ||
      dropiResponse?.id ||
      null;

    const dropiGuide =
      dropiResponse?.object?.guide_number ||
      dropiResponse?.data?.guide_number ||
      null;

    await update('dropi_order_sync')
      .given({
        dropi_order_id: dropiOrderId ? String(dropiOrderId) : null,
        dropi_guide_number: dropiGuide ? String(dropiGuide) : null,
        status: 'synced',
        dropi_status: dropiResponse?.object?.status || dropiResponse?.data?.status || null,
        response_payload: JSON.stringify(dropiResponse),
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null
      })
      .where('sync_id', '=', syncId)
      .execute(pool);

    console.info(
      `[Dropi] Pedido ${order.order_number} sincronizado exitosamente. Dropi ID: ${dropiOrderId}`
    );
  } catch (e) {
    const error = e as Error;
    console.error(`[Dropi] Error critico sincronizando pedido ${data.order_id}:`, error.message);

    // Update sync record with error if it exists
    if (syncRecord) {
      try {
        const syncId = syncRecord.insertId || syncRecord.sync_id;
        await update('dropi_order_sync')
          .given({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .where('sync_id', '=', syncId)
          .execute(pool);
      } catch (updateError) {
        console.error('[Dropi] Error actualizando registro de sincronizacion:', (updateError as Error).message);
      }
    } else {
      await createFailedSyncRecord(data.order_id, error.message);
    }
  }
}

/**
 * Crea un registro de sincronizacion fallida.
 */
async function createFailedSyncRecord(orderId: number, errorMessage: string): Promise<void> {
  try {
    await insert('dropi_order_sync')
      .given({
        evershop_order_id: orderId,
        status: 'failed',
        error_message: errorMessage
      })
      .execute(pool);
  } catch (insertError) {
    console.error('[Dropi] Error creando registro de sincronizacion fallido:', (insertError as Error).message);
  }
}
