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
 * Tipo de error especifico para errores de la API de Dropi.
 */
export class DropiApiError extends Error {
  public statusCode: number;
  public responseBody: string;
  public endpoint: string;

  constructor(statusCode: number, responseBody: string, endpoint: string) {
    const parsed = DropiApiError.parseErrorMessage(statusCode, responseBody);
    super(parsed);
    this.name = 'DropiApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.endpoint = endpoint;
  }

  static parseErrorMessage(statusCode: number, responseBody: string): string {
    // Intentar parsear el body como JSON para extraer mensaje
    try {
      const json = JSON.parse(responseBody);
      if (json.message) return `Dropi error (${statusCode}): ${json.message}`;
      if (json.error) return `Dropi error (${statusCode}): ${json.error}`;
      if (json.errors && Array.isArray(json.errors)) {
        return `Dropi error (${statusCode}): ${json.errors.join(', ')}`;
      }
    } catch {
      // No es JSON
    }

    // Mensajes en espanol segun codigo HTTP
    switch (statusCode) {
      case 400:
        return `Solicitud invalida a Dropi (400): ${responseBody}`;
      case 401:
        return 'Token de integracion Dropi invalido o expirado (401)';
      case 403:
        return 'Sin permisos para acceder a este recurso en Dropi (403)';
      case 404:
        return 'Recurso no encontrado en Dropi (404)';
      case 409:
        return `Conflicto al crear recurso en Dropi (409): ${responseBody}`;
      case 422:
        return `Datos invalidos enviados a Dropi (422): ${responseBody}`;
      case 429:
        return 'Demasiadas solicitudes a Dropi. Intenta mas tarde (429)';
      case 500:
        return 'Error interno en el servidor de Dropi (500)';
      case 502:
        return 'Dropi no disponible temporalmente (502)';
      case 503:
        return 'Servicio de Dropi en mantenimiento (503)';
      default:
        return `Error de Dropi (${statusCode}): ${responseBody}`;
    }
  }
}

/**
 * Realiza una solicitud autenticada a la API de Dropi.
 * Incluye logging detallado para depuracion.
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

  console.info(`[Dropi API] ${method} ${url}`);
  if (body) {
    console.debug(`[Dropi API] Request body: ${JSON.stringify(body).substring(0, 500)}`);
  }

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    const msg = `Error de conexion con Dropi: ${(networkError as Error).message}`;
    console.error(`[Dropi API] ${msg}`);
    throw new Error(msg);
  }

  const responseText = await response.text();
  console.debug(`[Dropi API] Response ${response.status}: ${responseText.substring(0, 500)}`);

  if (!response.ok) {
    throw new DropiApiError(response.status, responseText, endpoint);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(responseText);
    } catch {
      return responseText;
    }
  }
  return responseText;
}

/**
 * Prueba la conexion con Dropi verificando que el token sea valido.
 * Usa el endpoint de departamentos como verificacion ligera.
 */
export async function testConnection(
  token: string,
  environment: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const result = await dropiRequest('/department', 'GET', null, token, environment);
    return {
      success: true,
      message: 'Conexion exitosa con Dropi',
      data: result
    };
  } catch (e) {
    const error = e as Error;
    if (error instanceof DropiApiError && error.statusCode === 401) {
      return {
        success: false,
        message: 'Token de integracion invalido. Verifica tu clave en Dropi.'
      };
    }
    return {
      success: false,
      message: `Error al conectar con Dropi: ${error.message}`
    };
  }
}

/**
 * Asegura que un precio sea entero (pesos colombianos, sin decimales).
 */
export function toIntegerPrice(price: number | string): number {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return Math.round(num);
}

/**
 * Crea un pedido en Dropi.
 * Todos los precios se envian como enteros (pesos colombianos).
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
    total_order: toIntegerPrice(orderData.total_order),
    shop_order_id: orderData.shop_order_id,
    products: orderData.products.map((p) => ({
      id: p.id,
      price: toIntegerPrice(p.price),
      variation_id: p.variation_id,
      quantity: p.quantity
    }))
  };

  return dropiRequest('/orders/myorders', 'POST', payload, token, environment);
}

/**
 * Lista pedidos en Dropi.
 * Segun la doc oficial, usa GET con body params:
 * result_number, start, textToSearch, from, untill, status,
 * filter_date_by (REQUERIDO: "FECHA DE CREADO")
 */
export async function getDropiOrders(
  params: Record<string, any>,
  token: string,
  environment: string
): Promise<any> {
  // Dropi GET /orders/myorders acepta params en query string
  const queryParams: Record<string, string> = {};
  if (params.result_number) queryParams.result_number = String(params.result_number);
  if (params.start) queryParams.start = String(params.start);
  if (params.textToSearch) queryParams.textToSearch = params.textToSearch;
  if (params.from) queryParams.from = params.from;
  if (params.untill) queryParams.untill = params.untill;
  if (params.status) queryParams.status = params.status;
  if (params.filter_date_by) queryParams.filter_date_by = params.filter_date_by;
  if (params.orderBy) queryParams.orderBy = params.orderBy;
  if (params.orderDirection) queryParams.orderDirection = params.orderDirection;
  if (params.filter_by) queryParams.filter_by = params.filter_by;
  if (params.value_filter_by) queryParams.value_filter_by = params.value_filter_by;

  const queryString = new URLSearchParams(queryParams).toString();
  const endpoint = queryString
    ? `/orders/myorders?${queryString}`
    : '/orders/myorders';
  return dropiRequest(endpoint, 'GET', null, token, environment);
}

/**
 * Genera guia para un pedido en Dropi.
 * PUT /orders/myorders/:idOrden con body {"status": "GUIA_GENERADA"}
 */
export async function generateDropiGuide(
  dropiOrderId: string | number,
  token: string,
  environment: string
): Promise<any> {
  return dropiRequest(
    `/orders/myorders/${dropiOrderId}`,
    'PUT',
    { status: 'GUIA_GENERADA' },
    token,
    environment
  );
}

/**
 * Obtiene un producto especifico de Dropi por ID.
 * GET /products/v2/:idProducto
 */
export async function getDropiProductById(
  productId: number | string,
  token: string,
  environment: string
): Promise<any> {
  return dropiRequest(
    `/products/v2/${productId}`,
    'GET',
    null,
    token,
    environment
  );
}

/**
 * Obtiene una orden especifica por numero de guia.
 * GET /orders/myorderbyguide/:guia
 */
export async function getDropiOrderByGuide(
  guideNumber: string,
  token: string,
  environment: string
): Promise<any> {
  return dropiRequest(
    `/orders/myorderbyguide/${guideNumber}`,
    'GET',
    null,
    token,
    environment
  );
}

/**
 * Genera guias de forma masiva.
 * POST /orders/myorder/masive con array de {id, status: "GUIA_GENERADA"}
 */
export async function generateDropiGuidesMassive(
  orderIds: number[],
  token: string,
  environment: string
): Promise<any> {
  const body = orderIds.map((id) => ({
    id,
    status: 'GUIA_GENERADA'
  }));
  return dropiRequest('/orders/myorder/masive', 'POST', body as any, token, environment);
}

/**
 * Lista categorias de Dropi.
 * GET /categories
 */
export async function getDropiCategories(
  token: string,
  environment: string
): Promise<any> {
  return dropiRequest('/categories', 'GET', null, token, environment);
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

/**
 * Lista las transportadoras/empresas de envio disponibles en Dropi.
 */
export async function getShippingCompanies(
  token: string,
  environment: string
): Promise<any> {
  return dropiRequest('/shipping-companies', 'GET', null, token, environment);
}
