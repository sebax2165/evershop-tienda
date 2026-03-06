import React, { useState, useMemo } from 'react';
import './OneStepCheckout.scss';
import {
  LATAM_COUNTRIES,
  getProvincesByCountryCode
} from '../../../data/latamCountries.js';
import { useOneStepCheckout } from './useOneStepCheckout.js';

interface ProductPrice {
  value: number;
  text: string;
}

interface ProductImage {
  alt: string;
  url: string;
}

interface ProductInventory {
  isInStock: boolean;
  qty: number;
}

interface Product {
  productId: number;
  sku: string;
  name: string;
  price: {
    regular: ProductPrice;
    special: ProductPrice;
  };
  image: ProductImage;
  inventory: ProductInventory;
}

interface OneStepCheckoutProps {
  product: Product;
}

interface FormData {
  full_name: string;
  telephone: string;
  email: string;
  country: string;
  province: string;
  city: string;
  address_1: string;
  postcode: string;
  quantity: number;
}

export default function OneStepCheckout({ product }: OneStepCheckoutProps) {
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    telephone: '',
    email: '',
    country: 'CO',
    province: '',
    city: '',
    address_1: '',
    postcode: '',
    quantity: 1
  });

  const { submitCheckout, loading: isSubmitting, error: checkoutError } = useOneStepCheckout({ sku: product?.sku || '' });
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  const provinces = useMemo(
    () => getProvincesByCountryCode(formData.country),
    [formData.country]
  );

  const selectedCountry = useMemo(
    () => LATAM_COUNTRIES.find((c) => c.code === formData.country),
    [formData.country]
  );

  const displayPrice = product?.price?.special?.text || product?.price?.regular?.text;
  const priceValue = product?.price?.special?.value || product?.price?.regular?.value;
  const hasDiscount = product?.price?.special?.value && product?.price?.special?.value < product?.price?.regular?.value;

  const updateField = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Reset province when country changes
      if (field === 'country') {
        updated.province = '';
      }
      return updated;
    });
  };

  const incrementQty = () => {
    if (!product?.inventory?.qty || formData.quantity < product.inventory.qty) {
      updateField('quantity', formData.quantity + 1);
    }
  };

  const decrementQty = () => {
    if (formData.quantity > 1) {
      updateField('quantity', formData.quantity - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await submitCheckout(
      {
        full_name: formData.full_name,
        telephone: `${selectedCountry?.phonePrefix || ''}${formData.telephone}`,
        email: formData.email,
        country: formData.country,
        province: formData.province,
        city: formData.city,
        address_1: formData.address_1,
        postcode: formData.postcode
      },
      formData.quantity
    );

    if (result) {
      setOrderSuccess(true);
      setOrderNumber(result.orderNumber);
    }
  };

  if (!product) {
    return (
      <div className="osc-loading flex items-center justify-center py-20">
        <div className="text-muted-foreground">Cargando producto...</div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="osc-wrapper">
        <div className="osc-container">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-foreground font-bold text-2xl mb-2">
              ¡Pedido Confirmado!
            </h1>
            {orderNumber && (
              <p className="text-muted-foreground mb-4">
                Orden #{orderNumber}
              </p>
            )}
            <p className="text-muted-foreground mb-6">
              Tu pedido ha sido recibido. Te contactaremos al{' '}
              <strong className="text-foreground">{formData.telephone}</strong>{' '}
              para coordinar la entrega.
            </p>
            <p className="text-muted-foreground text-sm">
              Pago contra entrega — pagas cuando recibas tu producto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="osc-wrapper">
      <div className="osc-container">
        {/* Product Section */}
        <div className="osc-product">
          <div className="osc-product__image">
            <img
              src={product.image?.url}
              alt={product.image?.alt || product.name}
              loading="eager"
            />
          </div>
          <div className="osc-product__info">
            <h1 className="text-foreground font-semibold text-lg md:text-xl leading-tight">
              {product.name}
            </h1>
            <div className="osc-product__price mt-2">
              {hasDiscount && (
                <span className="text-muted-foreground line-through text-sm mr-2">
                  {product.price.regular.text}
                </span>
              )}
              <span className="text-foreground font-bold text-xl">
                {displayPrice}
              </span>
            </div>
            {/* Quantity Selector */}
            <div className="osc-qty mt-3">
              <span className="text-muted-foreground text-sm mr-3">Cantidad:</span>
              <div className="osc-qty__controls">
                <button
                  type="button"
                  className="osc-qty__btn"
                  onClick={decrementQty}
                  disabled={formData.quantity <= 1}
                  aria-label="Reducir cantidad"
                >
                  -
                </button>
                <span className="osc-qty__value text-foreground">
                  {formData.quantity}
                </span>
                <button
                  type="button"
                  className="osc-qty__btn"
                  onClick={incrementQty}
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
        <form className="osc-form" onSubmit={handleSubmit} noValidate>
          <h2 className="text-foreground font-semibold text-base mb-4">
            Datos de envio
          </h2>

          {/* Full Name */}
          <div className="osc-field">
            <label htmlFor="osc-full_name" className="osc-label">
              Nombre Completo
            </label>
            <input
              id="osc-full_name"
              type="text"
              className="osc-input"
              placeholder="Juan Perez"
              value={formData.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          {/* Telephone */}
          <div className="osc-field">
            <label htmlFor="osc-telephone" className="osc-label">
              Telefono
            </label>
            <div className="osc-phone-group">
              <span className="osc-phone-prefix">
                {selectedCountry?.phonePrefix || '+57'}
              </span>
              <input
                id="osc-telephone"
                type="tel"
                className="osc-input osc-input--phone"
                placeholder="300 123 4567"
                value={formData.telephone}
                onChange={(e) => updateField('telephone', e.target.value)}
                required
                autoComplete="tel-national"
              />
            </div>
          </div>

          {/* Email */}
          <div className="osc-field">
            <label htmlFor="osc-email" className="osc-label">
              Correo Electronico
              <span className="text-muted-foreground text-xs ml-1">(opcional)</span>
            </label>
            <input
              id="osc-email"
              type="email"
              className="osc-input"
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* Country */}
          <div className="osc-field">
            <label htmlFor="osc-country" className="osc-label">
              Pais
            </label>
            <select
              id="osc-country"
              className="osc-select"
              value={formData.country}
              onChange={(e) => updateField('country', e.target.value)}
              required
            >
              {LATAM_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Province */}
          <div className="osc-field">
            <label htmlFor="osc-province" className="osc-label">
              Departamento / Provincia
            </label>
            <select
              id="osc-province"
              className="osc-select"
              value={formData.province}
              onChange={(e) => updateField('province', e.target.value)}
              required
            >
              <option value="">Seleccionar...</option>
              {provinces.map((province) => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div className="osc-field">
            <label htmlFor="osc-city" className="osc-label">
              Ciudad
            </label>
            <input
              id="osc-city"
              type="text"
              className="osc-input"
              placeholder="Ciudad"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              required
              autoComplete="address-level2"
            />
          </div>

          {/* Address */}
          <div className="osc-field">
            <label htmlFor="osc-address_1" className="osc-label">
              Direccion
            </label>
            <input
              id="osc-address_1"
              type="text"
              className="osc-input"
              placeholder="Calle, numero, apartamento..."
              value={formData.address_1}
              onChange={(e) => updateField('address_1', e.target.value)}
              required
              autoComplete="street-address"
            />
          </div>

          {/* Postcode */}
          <div className="osc-field">
            <label htmlFor="osc-postcode" className="osc-label">
              Codigo Postal
              <span className="text-muted-foreground text-xs ml-1">(opcional)</span>
            </label>
            <input
              id="osc-postcode"
              type="text"
              className="osc-input"
              placeholder="110111"
              value={formData.postcode}
              onChange={(e) => updateField('postcode', e.target.value)}
              autoComplete="postal-code"
            />
          </div>

          {/* Payment Badge - Contra Entrega */}
          <div className="osc-payment-badge">
            <div className="osc-payment-badge__icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div className="osc-payment-badge__text">
              <span className="font-medium text-foreground">Pago Contra Entrega</span>
              <span className="text-muted-foreground text-xs">
                Pagas cuando recibas tu pedido
              </span>
            </div>
          </div>

          {/* Order Total */}
          <div className="osc-total">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">
                {selectedCountry?.currencySymbol}
                {((priceValue || 0) * formData.quantity).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-muted-foreground text-sm">Envio</span>
              <span className="text-muted-foreground text-sm">Calculado al confirmar</span>
            </div>
            <div className="osc-total__divider" />
            <div className="flex justify-between items-center">
              <span className="text-foreground font-semibold">Total</span>
              <span className="text-foreground font-bold text-lg">
                {selectedCountry?.currencySymbol}
                {((priceValue || 0) * formData.quantity).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {checkoutError && (
            <div className="osc-error text-destructive text-sm text-center py-2 px-3 rounded-md mb-3" style={{ backgroundColor: 'var(--destructive)', opacity: 0.1 }}>
              {checkoutError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="osc-submit"
            disabled={isSubmitting || !product.inventory?.isInStock}
          >
            {isSubmitting ? 'Procesando...' : 'Completar Pedido'}
          </button>

          {!product.inventory?.isInStock && (
            <p className="text-destructive text-sm text-center mt-2">
              Producto agotado
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    product: currentProduct {
      productId
      sku
      name
      price {
        regular { value text }
        special { value text }
      }
      image { alt url }
      inventory { isInStock qty }
    }
  }
`;
