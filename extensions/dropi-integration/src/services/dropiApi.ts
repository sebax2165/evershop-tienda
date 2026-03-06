import crypto from 'crypto';

const DROPI_TEST_URL = 'https://test-api.dropi.co/integrations';
const DROPI_PROD_URL = 'https://api.dropi.co/integrations';

/**
 * Retorna la URL base de Dropi segun el ambiente configurado.
 */
export function getDropiBaseUrl(environment: string): string {
  return environment === 'production' ? DROPI_PROD_URL : DROPI_TEST_URL;
}

/**
 * Genera un hash SHA-256 de un valor sensible.
 */
export function hashSensitiveData(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Realiza una solicitud autenticada a la API de Dropi.
 */
export async function dropiRequest(
  endpoint: string,
  method: string,
  body: Record<string, any> | null,
  token: string,
  environment: string
): Promise<any> {
  const baseUrl = getDropiBaseUrl(environment);
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'dropi-integration-key': token
  };

  const options: RequestInit = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Dropi API error ${response.status}: ${errorText}`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

/**
 * Crea un pedido en Dropi.
 */
export async function createDropiOrder(
  orderData: {
    calculate_costs_and_shiping?: boolean;
    state: string;
    city: string;
    client_email: string;
    name: string;
    surname: string;
    dir: string;
    notes?: string;
    payment_method_id: number;
    phone: string;
    rate_type?: string;
    type?: string;
    total_order: number;
    shop_order_id: string;
    products: Array<{
      id: number;
      price: number;
      variation_id: number | null;
      quantity: number;
    }>;
  },
  token: string,
  environment: string
): Promise<any> {
  const payload = {
    calculate_costs_and_shiping:
      orderData.calculate_costs_and_shiping ?? true,
    state: orderData.state,
    city: orderData.city,
    client_email: orderData.client_email,
    name: orderData.name,
    surname: orderData.surname,
    dir: orderData.dir,
    notes: orderData.notes || '',
    payment_method_id: orderData.payment_method_id ?? 1,
    phone: orderData.phone,
    rate_type: orderData.rate_type || 'CON RECAUDO',
    type: orderData.type || 'FINAL_ORDER',
    total_order: orderData.total_order,
    shop_order_id: orderData.shop_order_id,
    products: orderData.products
  };

  return dropiRequest('/orders/myorders', 'POST', payload, token, environment);
}

/**
 * Lista pedidos en Dropi.
 */
export async function getDropiOrders(
  params: Record<string, any>,
  token: string,
  environment: string
): Promise<any> {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = queryString
    ? `/orders/myorders?${queryString}`
    : '/orders/myorders';
  return dropiRequest(endpoint, 'GET', null, token, environment);
}

/**
 * Obtiene un pedido de Dropi por ID.
 */
export async function getDropiOrderById(
  orderId: string,
  token: string,
  environment: string
): Promise<any> {
  return dropiRequest(
    `/orders/myorders/${orderId}`,
    'GET',
    null,
    token,
    environment
  );
}

/**
 * Lista productos en Dropi.
 */
export async function getDropiProducts(
  params: Record<string, any>,
  token: string,
  environment: string
): Promise<any> {
  return dropiRequest('/products/index', 'POST', params, token, environment);
}

/**
 * Obtiene cotizacion de envio desde Dropi.
 */
export async function quoteShipping(
  params: Record<string, any>,
  token: string,
  environment: string
): Promise<any> {
  return dropiRequest(
    '/orders/cotizaEnvioTransportadoraV2',
    'POST',
    params,
    token,
    environment
  );
}

/**
 * Lista ciudades por departamento en Dropi.
 */
export async function getCities(
  params: Record<string, any>,
  token: string,
  environment: string
): Promise<any> {
  return dropiRequest('/trajectory/bycity', 'POST', params, token, environment);
}

/**
 * Lista departamentos en Dropi.
 */
export async function getDepartments(
  token: string,
  environment: string
): Promise<any> {
  return dropiRequest('/department', 'GET', null, token, environment);
}
