import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckoutFormData {
  full_name: string;
  telephone: string;
  email: string;
  country: string;
  province: string;
  city: string;
  address_1: string;
  postcode: string;
}

interface UseOneStepCheckoutOptions {
  /** Product SKU to add to the cart */
  sku: string;
}

interface CheckoutResult {
  /** Order UUID returned by the server */
  orderUuid: string;
  /** Numeric order number (e.g. 10001) */
  orderNumber: number;
}

interface CartApiResponse {
  data?: {
    cartId?: string;
    uuid?: string;
    items?: unknown[];
    count?: number;
  };
  error?: {
    message?: string;
    status?: number;
  };
}

interface ShippingMethod {
  id: string;
  code: string;
  name: string;
  cost: number;
}

interface CheckoutApiResponse {
  data?: {
    uuid?: string;
    order_number?: number;
    [key: string]: unknown;
  };
  error?: {
    message?: string;
    status?: number;
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Custom hook that orchestrates the one-step checkout flow.
 *
 * The EverShop checkout API requires several sequential steps:
 *
 * 1. **Create a cart** – `POST /api/carts` with at least one item (`{ sku, qty }`).
 *    The response includes `data.cartId` which is the cart UUID.
 *
 * 2. **Add shipping address** – `POST /api/carts/:cart_id/addresses` with
 *    `{ address: { full_name, address_1, city, province, country, postcode, telephone }, type: "shipping" }`.
 *    Address validation requires: full_name, address_1, province, country, postcode.
 *
 * 3. **Add billing address** – Same endpoint with `type: "billing"`. The order
 *    creator always reads the billing address, so it cannot be omitted. We reuse
 *    the shipping address data.
 *
 * 4. **Fetch available shipping methods** – The checkout service validates that a
 *    shipping method is set on the cart. We query the GraphQL endpoint to find the
 *    first available method after the shipping address has been saved.
 *
 * 5. **Set shipping method** – `POST /api/carts/:cart_id/shippingMethods` with
 *    `{ method_code: <uuid> }`.
 *
 * 6. **Set payment method** – `POST /api/carts/:cart_id/paymentMethods` with
 *    `{ method_code: "cod" }`.
 *
 * 7. **Place the order** – `POST /api/carts/:cart_id/checkout` which runs order
 *    validation, creates the order, and disables the cart.
 */
export function useOneStepCheckout({ sku }: UseOneStepCheckoutOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Execute the full checkout flow.
   *
   * @param formData - Customer & shipping information collected from the form.
   * @param qty      - Number of units to purchase (defaults to 1).
   * @returns The created order identifiers or `null` if any step failed.
   */
  async function submitCheckout(
    formData: CheckoutFormData,
    qty: number = 1
  ): Promise<CheckoutResult | null> {
    setLoading(true);
    setError(null);

    try {
      // ------------------------------------------------------------------
      // Step 1: Create a cart with the product
      // ------------------------------------------------------------------
      // Route: POST /carts  (packages/evershop/.../checkout/api/createCart)
      // Payload schema requires `items` array with `{ sku: string, qty: integer }`.
      // Optional: customer_full_name, customer_email.
      // Response: { data: { cartId: <uuid>, items: [...], count: N } }
      // ------------------------------------------------------------------
      // Use customer email if provided, otherwise generate a placeholder
      // based on the phone number. The domain is used internally only for
      // EverShop's required email field and never for actual communications.
      const email = formData.email || `cod.${formData.telephone.replace(/[^\d]/g, '')}@placeholder.local`;

      const cartRes = await fetch('/api/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ sku, qty }],
          customer_full_name: formData.full_name,
          customer_email: email
        })
      });

      if (!cartRes.ok) {
        const cartErr: CartApiResponse = await cartRes.json().catch(() => ({}));
        throw new Error(cartErr.error?.message || 'Error al crear el carrito');
      }

      const cartData: CartApiResponse = await cartRes.json();
      const cartId = cartData.data?.cartId;

      if (!cartId) {
        throw new Error('No se recibio el identificador del carrito');
      }

      // ------------------------------------------------------------------
      // Step 2: Add shipping address
      // ------------------------------------------------------------------
      // Route: POST /carts/:cart_id/addresses
      // Payload: { address: Address, type: "shipping" | "billing" }
      // Address validation (addressValidators.ts) requires:
      //   full_name, address_1, province, country, postcode
      // ------------------------------------------------------------------
      const addressPayload = {
        full_name: formData.full_name,
        telephone: formData.telephone,
        address_1: formData.address_1,
        city: formData.city,
        province: formData.province,
        country: formData.country,
        postcode: formData.postcode || '000000'
      };

      const shippingAddrRes = await fetch(`/api/carts/${cartId}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addressPayload,
          type: 'shipping'
        })
      });

      if (!shippingAddrRes.ok) {
        const addrErr = await shippingAddrRes.json().catch(() => ({}));
        throw new Error(
          addrErr.error?.message || 'Error al guardar la direccion de envio'
        );
      }

      // ------------------------------------------------------------------
      // Step 3: Add billing address (reuse shipping address data)
      // ------------------------------------------------------------------
      // The orderCreator reads billing_address_id without a null guard, so
      // billing address is mandatory for order creation.
      // ------------------------------------------------------------------
      const billingAddrRes = await fetch(`/api/carts/${cartId}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addressPayload,
          type: 'billing'
        })
      });

      if (!billingAddrRes.ok) {
        const addrErr = await billingAddrRes.json().catch(() => ({}));
        throw new Error(
          addrErr.error?.message || 'Error al guardar la direccion de facturacion'
        );
      }

      // ------------------------------------------------------------------
      // Step 4: Fetch available shipping methods via GraphQL
      // ------------------------------------------------------------------
      // After the shipping address is saved on the cart, the
      // getAvailableShippingMethods service can look up the zone-based methods.
      // We pick the first available method.
      // ------------------------------------------------------------------
      let shippingMethodCode: string | null = null;

      try {
        const shippingMethodsQuery = `
          query ShippingMethods($cartId: String!) {
            cart(id: $cartId) {
              shippingMethodList {
                code
                name
                cost {
                  value
                  text
                }
              }
            }
          }
        `;

        const gqlRes = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: shippingMethodsQuery,
            variables: { cartId: cartId }
          })
        });

        if (gqlRes.ok) {
          const gqlData = await gqlRes.json();
          const methods: ShippingMethod[] =
            gqlData?.data?.cart?.shippingMethodList || [];
          if (methods.length > 0) {
            shippingMethodCode = methods[0].code;
          }
        }
      } catch {
        // If GraphQL fails we still try to proceed; the shipping method might
        // not be required if the product has no_shipping_required set.
      }

      // ------------------------------------------------------------------
      // Step 5: Set shipping method on the cart
      // ------------------------------------------------------------------
      // Route: POST /carts/:cart_id/shippingMethods
      // Payload: { method_code: string }
      // The order validator checks that shipping_method is set on the cart
      // (unless no_shipping_required is true).
      // ------------------------------------------------------------------
      if (shippingMethodCode) {
        const shipMethodRes = await fetch(
          `/api/carts/${cartId}/shippingMethods`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method_code: shippingMethodCode })
          }
        );

        if (!shipMethodRes.ok) {
          const methodErr = await shipMethodRes.json().catch(() => ({}));
          throw new Error(
            methodErr.error?.message || 'Error al establecer el metodo de envio'
          );
        }
      }

      // ------------------------------------------------------------------
      // Step 6: Set payment method (COD - Cash on Delivery)
      // ------------------------------------------------------------------
      // Route: POST /carts/:cart_id/paymentMethods
      // Payload: { method_code: string }
      // The COD module registers payment method with code "cod".
      // ------------------------------------------------------------------
      const payMethodRes = await fetch(
        `/api/carts/${cartId}/paymentMethods`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method_code: 'cod' })
        }
      );

      if (!payMethodRes.ok) {
        const payErr = await payMethodRes.json().catch(() => ({}));
        throw new Error(
          payErr.error?.message || 'Error al establecer el metodo de pago'
        );
      }

      // ------------------------------------------------------------------
      // Step 7: Place the order
      // ------------------------------------------------------------------
      // Route: POST /carts/:cart_id/checkout
      // The checkout service (checkout.ts) receives cartId from URL params
      // and checkout data from the body. It:
      //   - Loads the cart by UUID
      //   - Optionally sets customer info, addresses, payment & shipping methods
      //     (we already set them via the individual APIs above)
      //   - Saves the cart and calls createOrder
      // The handler wraps the response with order data + links.
      // Response: { data: { uuid, order_number, ... } }
      // ------------------------------------------------------------------
      const checkoutRes = await fetch(`/api/carts/${cartId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            email,
            fullName: formData.full_name
          }
        })
      });

      if (!checkoutRes.ok) {
        const checkoutErr: CheckoutApiResponse = await checkoutRes
          .json()
          .catch(() => ({}));
        throw new Error(
          checkoutErr.error?.message || 'Error al procesar el pedido'
        );
      }

      const orderData: CheckoutApiResponse = await checkoutRes.json();

      const orderUuid = orderData.data?.uuid;
      const orderNumber = orderData.data?.order_number;

      if (!orderUuid) {
        throw new Error('No se recibio la confirmacion del pedido');
      }

      return {
        orderUuid,
        orderNumber: orderNumber ?? 0
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error inesperado al procesar el pedido';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { submitCheckout, loading, error };
}
