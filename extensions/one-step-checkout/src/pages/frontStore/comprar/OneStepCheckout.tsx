import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import './OneStepCheckout.scss';
import {
  LATAM_COUNTRIES,
  getProvincesByCountryCode
} from '../../../data/latamCountries.js';
import { useOneStepCheckout } from './useOneStepCheckout.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  gallery?: ProductImage[];
  inventory: ProductInventory;
}

interface QuantityOffer {
  qty: number;
  label: string;
  discountPercent: number;
  badge?: string;
}

interface UpsellItem {
  id: string;
  sku: string;
  name: string;
  image: string;
  price: number;
  priceText: string;
}

interface PostPurchaseUpsell {
  id: string;
  sku: string;
  name: string;
  image: string;
  price: number;
  priceText: string;
  originalPrice: number;
  originalPriceText: string;
  headline: string;
  description: string;
  timerSeconds: number;
}

interface OneStepCheckoutProps {
  product: Product;
  formMode?: 'popup' | 'embedded';
  quantityOffers?: QuantityOffer[];
  upsells?: UpsellItem[];
  postPurchaseUpsell?: PostPurchaseUpsell;
  shippingCost?: number;
  codFee?: number;
  urgencyTimerMinutes?: number;
  variantInfo?: string;
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
  notes: string;
  discountCode: string;
}

interface FormErrors {
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// Country flag emoji map
// ---------------------------------------------------------------------------

const FLAG_EMOJI: Record<string, string> = {
  CO: '\u{1F1E8}\u{1F1F4}',
  MX: '\u{1F1F2}\u{1F1FD}',
  CL: '\u{1F1E8}\u{1F1F1}',
  EC: '\u{1F1EA}\u{1F1E8}',
  PE: '\u{1F1F5}\u{1F1EA}',
  AR: '\u{1F1E6}\u{1F1F7}',
  PA: '\u{1F1F5}\u{1F1E6}',
  ES: '\u{1F1EA}\u{1F1F8}',
  PT: '\u{1F1F5}\u{1F1F9}'
};

// ---------------------------------------------------------------------------
// Default mock data
// ---------------------------------------------------------------------------

const DEFAULT_QTY_OFFERS: QuantityOffer[] = [
  { qty: 1, label: 'Comprar 1 unidad', discountPercent: 0 },
  { qty: 2, label: 'Comprar 2 - Ahorra 10%', discountPercent: 10, badge: 'Popular' },
  { qty: 3, label: 'Comprar 3 - Ahorra 20%', discountPercent: 20, badge: 'Mejor Oferta' }
];

const DEFAULT_UPSELLS: UpsellItem[] = [];
const DEFAULT_POST_PURCHASE: PostPurchaseUpsell | undefined = undefined;

// ---------------------------------------------------------------------------
// Urgency Timer Hook
// ---------------------------------------------------------------------------

function useUrgencyTimer(minutes: number | undefined) {
  const [secondsLeft, setSecondsLeft] = useState(() => (minutes ?? 0) * 60);

  useEffect(() => {
    if (!minutes || minutes <= 0) return;
    setSecondsLeft(minutes * 60);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [minutes]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return { secondsLeft, display: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OneStepCheckout({
  product,
  formMode = 'embedded',
  quantityOffers,
  upsells,
  postPurchaseUpsell,
  shippingCost = 0,
  codFee = 0,
  urgencyTimerMinutes,
  variantInfo
}: OneStepCheckoutProps) {
  // --- State ---
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    telephone: '',
    email: '',
    country: 'CO',
    province: '',
    city: '',
    address_1: '',
    postcode: '',
    notes: '',
    discountCode: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedOfferIdx, setSelectedOfferIdx] = useState(0);
  const [selectedUpsells, setSelectedUpsells] = useState<Set<string>>(new Set());
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isPopupOpen, setIsPopupOpen] = useState(formMode === 'embedded');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [showPostPurchase, setShowPostPurchase] = useState(false);
  const [postPurchaseTimer, setPostPurchaseTimer] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const { submitCheckout, loading: isSubmitting, error: checkoutError } = useOneStepCheckout({
    sku: product?.sku || ''
  });

  const offers = quantityOffers && quantityOffers.length > 0 ? quantityOffers : DEFAULT_QTY_OFFERS;
  const upsellItems = upsells && upsells.length > 0 ? upsells : DEFAULT_UPSELLS;
  const ppUpsell = postPurchaseUpsell || DEFAULT_POST_PURCHASE;

  const urgency = useUrgencyTimer(urgencyTimerMinutes);

  // --- Derived data ---
  const provinces = useMemo(
    () => getProvincesByCountryCode(formData.country),
    [formData.country]
  );

  const selectedCountry = useMemo(
    () => LATAM_COUNTRIES.find((c) => c.code === formData.country),
    [formData.country]
  );

  const basePrice = product?.price?.special?.value || product?.price?.regular?.value || 0;
  const hasDiscount = product?.price?.special?.value && product?.price?.special?.value < product?.price?.regular?.value;
  const selectedOffer = offers[selectedOfferIdx] || offers[0];
  const quantity = selectedOffer?.qty || 1;

  // Price calculations
  const subtotalBeforeOffer = basePrice * quantity;
  const offerDiscount = subtotalBeforeOffer * (selectedOffer?.discountPercent || 0) / 100;
  const subtotalAfterOffer = subtotalBeforeOffer - offerDiscount;

  const upsellTotal = useMemo(() => {
    let total = 0;
    upsellItems.forEach((item) => {
      if (selectedUpsells.has(item.id)) {
        total += item.price;
      }
    });
    return total;
  }, [selectedUpsells, upsellItems]);

  const subtotalWithUpsells = subtotalAfterOffer + upsellTotal;
  const couponDiscount = discountApplied ? subtotalWithUpsells * discountPercent / 100 : 0;
  const subtotalAfterCoupon = subtotalWithUpsells - couponDiscount;
  const totalBeforeFees = subtotalAfterCoupon;
  const grandTotal = totalBeforeFees + shippingCost + codFee;

  const currencySymbol = selectedCountry?.currencySymbol || '$';

  const formatPrice = useCallback(
    (value: number) => `${currencySymbol}${Math.round(value).toLocaleString()}`,
    [currencySymbol]
  );

  // --- Helpers ---
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'country') {
        updated.province = '';
      }
      return updated;
    });
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleUpsell = (id: string) => {
    setSelectedUpsells((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyDiscount = () => {
    const code = formData.discountCode.trim().toUpperCase();
    if (!code) return;
    // Mock discount logic - in production, validate against server
    if (code === 'DESCUENTO10') {
      setDiscountPercent(10);
      setDiscountApplied(true);
    } else if (code === 'DESCUENTO20') {
      setDiscountPercent(20);
      setDiscountApplied(true);
    } else {
      setErrors((prev) => ({ ...prev, discountCode: 'Codigo no valido' }));
    }
  };

  const removeDiscount = () => {
    setDiscountApplied(false);
    setDiscountPercent(0);
    setFormData((prev) => ({ ...prev, discountCode: '' }));
  };

  // --- Validation ---
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Ingresa tu nombre completo';
    }
    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Ingresa tu numero de telefono';
    } else if (formData.telephone.replace(/\D/g, '').length < 7) {
      newErrors.telephone = 'Numero de telefono invalido';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Correo electronico invalido';
    }
    if (!formData.country) {
      newErrors.country = 'Selecciona un pais';
    }
    if (!formData.province) {
      newErrors.province = 'Selecciona departamento/provincia';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'Ingresa tu ciudad';
    }
    if (!formData.address_1.trim()) {
      newErrors.address_1 = 'Ingresa tu direccion';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Scroll to first error
      const firstErrorField = formRef.current?.querySelector('.osc-field--error');
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

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
      quantity
    );

    if (result) {
      setOrderNumber(result.orderNumber);
      if (ppUpsell) {
        setShowPostPurchase(true);
        setPostPurchaseTimer(ppUpsell.timerSeconds);
      } else {
        setOrderSuccess(true);
      }
    }
  };

  // --- Post-purchase timer ---
  useEffect(() => {
    if (!showPostPurchase || postPurchaseTimer <= 0) return;
    const interval = setInterval(() => {
      setPostPurchaseTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowPostPurchase(false);
          setOrderSuccess(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showPostPurchase, postPurchaseTimer]);

  const acceptPostPurchase = () => {
    // In production, add the upsell to the order via API
    setShowPostPurchase(false);
    setOrderSuccess(true);
  };

  const declinePostPurchase = () => {
    setShowPostPurchase(false);
    setOrderSuccess(true);
  };

  // --- Popup open/close ---
  const openPopup = () => setIsPopupOpen(true);
  const closePopup = () => {
    if (formMode === 'popup') {
      setIsPopupOpen(false);
    }
  };

  // Close popup on Escape
  useEffect(() => {
    if (formMode !== 'popup' || !isPopupOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopup();
    };
    document.addEventListener('keydown', handleEsc);
    // Prevent body scroll when popup is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [formMode, isPopupOpen]);

  // --- Loading state ---
  if (!product) {
    return (
      <div className="osc-loading">
        <div className="osc-spinner" />
        <span>Cargando producto...</span>
      </div>
    );
  }

  // --- Post-purchase upsell overlay ---
  if (showPostPurchase && ppUpsell) {
    const ppMins = Math.floor(postPurchaseTimer / 60);
    const ppSecs = postPurchaseTimer % 60;
    return (
      <div className="osc-pp-overlay">
        <div className="osc-pp-card">
          <div className="osc-pp-timer">
            Oferta expira en {String(ppMins).padStart(2, '0')}:{String(ppSecs).padStart(2, '0')}
          </div>
          <h2 className="osc-pp-headline">{ppUpsell.headline}</h2>
          <div className="osc-pp-product">
            <img src={ppUpsell.image} alt={ppUpsell.name} className="osc-pp-image" />
            <div className="osc-pp-info">
              <h3>{ppUpsell.name}</h3>
              <p className="osc-pp-description">{ppUpsell.description}</p>
              <div className="osc-pp-pricing">
                <span className="osc-pp-original">{ppUpsell.originalPriceText}</span>
                <span className="osc-pp-price">{ppUpsell.priceText}</span>
              </div>
            </div>
          </div>
          <button className="osc-pp-accept" onClick={acceptPostPurchase}>
            Agregar a mi pedido - {ppUpsell.priceText}
          </button>
          <button className="osc-pp-decline" onClick={declinePostPurchase}>
            No gracias, continuar
          </button>
        </div>
      </div>
    );
  }

  // --- Order success ---
  if (orderSuccess) {
    return (
      <div className="osc-wrapper osc-wrapper--embedded">
        <div className="osc-container">
          <div className="osc-success">
            <div className="osc-success__icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="osc-success__title">Pedido Confirmado</h1>
            {orderNumber && (
              <p className="osc-success__order">Orden #{orderNumber}</p>
            )}
            <p className="osc-success__message">
              Tu pedido ha sido recibido. Te contactaremos al{' '}
              <strong>{selectedCountry?.phonePrefix}{formData.telephone}</strong>{' '}
              para coordinar la entrega.
            </p>
            <div className="osc-success__cod">
              Pago contra entrega -- pagas cuando recibas tu producto.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main form content ---
  const formContent = (
    <div className={`osc-wrapper ${formMode === 'popup' ? 'osc-wrapper--popup' : 'osc-wrapper--embedded'}`}>
      {/* Popup close button */}
      {formMode === 'popup' && (
        <button className="osc-popup-close" onClick={closePopup} aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      <div className="osc-container">
        {/* ================================================================
            1. Product Header
        ================================================================ */}
        <div className="osc-product">
          <div className="osc-product__image">
            <img
              src={product.image?.url}
              alt={product.image?.alt || product.name}
              loading="eager"
            />
          </div>
          <div className="osc-product__info">
            <h1 className="osc-product__name">{product.name}</h1>
            {variantInfo && (
              <span className="osc-product__variant">{variantInfo}</span>
            )}
            <div className="osc-product__price">
              {hasDiscount && (
                <span className="osc-product__price-original">
                  {product.price.regular.text}
                </span>
              )}
              <span className="osc-product__price-current">
                {product.price?.special?.text || product.price?.regular?.text}
              </span>
              {hasDiscount && (
                <span className="osc-product__price-badge">
                  -{Math.round(100 - (product.price.special.value / product.price.regular.value) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================
            2. Quantity Offers
        ================================================================ */}
        {offers.length > 1 && (
          <div className="osc-offers">
            <h2 className="osc-section-title">Selecciona tu oferta</h2>
            <div className="osc-offers__list">
              {offers.map((offer, idx) => (
                <label
                  key={idx}
                  className={`osc-offer-card ${selectedOfferIdx === idx ? 'osc-offer-card--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="qty-offer"
                    className="osc-offer-card__radio"
                    checked={selectedOfferIdx === idx}
                    onChange={() => setSelectedOfferIdx(idx)}
                  />
                  <div className="osc-offer-card__check">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="osc-offer-card__content">
                    <span className="osc-offer-card__label">{offer.label}</span>
                    <span className="osc-offer-card__price">
                      {formatPrice(basePrice * offer.qty * (1 - offer.discountPercent / 100))}
                    </span>
                  </div>
                  {offer.badge && (
                    <span className="osc-offer-card__badge">{offer.badge}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            3. 1-Tick Upsells
        ================================================================ */}
        {upsellItems.length > 0 && (
          <div className="osc-upsells">
            <h2 className="osc-section-title">Completa tu compra</h2>
            <div className="osc-upsells__list">
              {upsellItems.map((item) => (
                <label
                  key={item.id}
                  className={`osc-upsell-card ${selectedUpsells.has(item.id) ? 'osc-upsell-card--selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="osc-upsell-card__checkbox"
                    checked={selectedUpsells.has(item.id)}
                    onChange={() => toggleUpsell(item.id)}
                  />
                  <div className="osc-upsell-card__check">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <img src={item.image} alt={item.name} className="osc-upsell-card__image" />
                  <div className="osc-upsell-card__content">
                    <span className="osc-upsell-card__name">{item.name}</span>
                    <span className="osc-upsell-card__price">+ {item.priceText}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            4. Form Fields
        ================================================================ */}
        <form className="osc-form" onSubmit={handleSubmit} noValidate ref={formRef}>
          <h2 className="osc-section-title">Datos de envio</h2>

          {/* Full Name */}
          <div className={`osc-field ${errors.full_name ? 'osc-field--error' : ''}`}>
            <label htmlFor="osc-full_name" className="osc-label">
              Nombre Completo *
            </label>
            <input
              id="osc-full_name"
              type="text"
              className="osc-input"
              placeholder="Juan Perez"
              value={formData.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              autoComplete="name"
            />
            {errors.full_name && <span className="osc-field__error">{errors.full_name}</span>}
          </div>

          {/* Telephone */}
          <div className={`osc-field ${errors.telephone ? 'osc-field--error' : ''}`}>
            <label htmlFor="osc-telephone" className="osc-label">
              Telefono *
            </label>
            <div className="osc-phone-group">
              <span className="osc-phone-prefix">
                {FLAG_EMOJI[formData.country] || ''} {selectedCountry?.phonePrefix || '+57'}
              </span>
              <input
                id="osc-telephone"
                type="tel"
                className="osc-input osc-input--phone"
                placeholder="300 123 4567"
                value={formData.telephone}
                onChange={(e) => updateField('telephone', e.target.value)}
                autoComplete="tel-national"
              />
            </div>
            {errors.telephone && <span className="osc-field__error">{errors.telephone}</span>}
          </div>

          {/* Email */}
          <div className={`osc-field ${errors.email ? 'osc-field--error' : ''}`}>
            <label htmlFor="osc-email" className="osc-label">
              Correo Electronico <span className="osc-label__optional">(opcional)</span>
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
            {errors.email && <span className="osc-field__error">{errors.email}</span>}
          </div>

          {/* Country */}
          <div className={`osc-field ${errors.country ? 'osc-field--error' : ''}`}>
            <label htmlFor="osc-country" className="osc-label">
              Pais *
            </label>
            <select
              id="osc-country"
              className="osc-select"
              value={formData.country}
              onChange={(e) => updateField('country', e.target.value)}
            >
              {LATAM_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {FLAG_EMOJI[country.code] || ''} {country.name}
                </option>
              ))}
            </select>
            {errors.country && <span className="osc-field__error">{errors.country}</span>}
          </div>

          {/* Province */}
          <div className={`osc-field ${errors.province ? 'osc-field--error' : ''}`}>
            <label htmlFor="osc-province" className="osc-label">
              Departamento / Provincia *
            </label>
            <select
              id="osc-province"
              className="osc-select"
              value={formData.province}
              onChange={(e) => updateField('province', e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {provinces.map((province) => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
            {errors.province && <span className="osc-field__error">{errors.province}</span>}
          </div>

          {/* City */}
          <div className={`osc-field ${errors.city ? 'osc-field--error' : ''}`}>
            <label htmlFor="osc-city" className="osc-label">
              Ciudad *
            </label>
            <input
              id="osc-city"
              type="text"
              className="osc-input"
              placeholder="Ciudad"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              autoComplete="address-level2"
            />
            {errors.city && <span className="osc-field__error">{errors.city}</span>}
          </div>

          {/* Address */}
          <div className={`osc-field ${errors.address_1 ? 'osc-field--error' : ''}`}>
            <label htmlFor="osc-address_1" className="osc-label">
              Direccion *
            </label>
            <input
              id="osc-address_1"
              type="text"
              className="osc-input"
              placeholder="Calle, numero, apartamento..."
              value={formData.address_1}
              onChange={(e) => updateField('address_1', e.target.value)}
              autoComplete="street-address"
            />
            {errors.address_1 && <span className="osc-field__error">{errors.address_1}</span>}
          </div>

          {/* Postcode */}
          <div className="osc-field">
            <label htmlFor="osc-postcode" className="osc-label">
              Codigo Postal <span className="osc-label__optional">(opcional)</span>
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

          {/* Notes */}
          <div className="osc-field">
            <label htmlFor="osc-notes" className="osc-label">
              Notas del pedido <span className="osc-label__optional">(opcional)</span>
            </label>
            <textarea
              id="osc-notes"
              className="osc-textarea"
              placeholder="Instrucciones especiales de entrega..."
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
            />
          </div>

          {/* Discount Code */}
          <div className="osc-field">
            <label htmlFor="osc-discount" className="osc-label">
              Codigo de descuento
            </label>
            {discountApplied ? (
              <div className="osc-discount-applied">
                <span className="osc-discount-applied__code">{formData.discountCode.toUpperCase()}</span>
                <span className="osc-discount-applied__amount">-{discountPercent}%</span>
                <button type="button" className="osc-discount-applied__remove" onClick={removeDiscount}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="osc-discount-group">
                <input
                  id="osc-discount"
                  type="text"
                  className="osc-input osc-input--discount"
                  placeholder="CODIGO"
                  value={formData.discountCode}
                  onChange={(e) => updateField('discountCode', e.target.value)}
                />
                <button
                  type="button"
                  className="osc-discount-btn"
                  onClick={applyDiscount}
                  disabled={!formData.discountCode.trim()}
                >
                  Aplicar
                </button>
              </div>
            )}
            {errors.discountCode && <span className="osc-field__error">{errors.discountCode}</span>}
          </div>

          {/* ================================================================
              5. Shipping & COD Fee + Payment Badge
          ================================================================ */}
          <div className="osc-payment-badge">
            <div className="osc-payment-badge__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div className="osc-payment-badge__text">
              <span className="osc-payment-badge__title">Pago Contra Entrega</span>
              <span className="osc-payment-badge__subtitle">
                Pagas cuando recibas tu pedido
              </span>
            </div>
          </div>

          {/* ================================================================
              6. Price Summary
          ================================================================ */}
          <div className="osc-summary">
            <div className="osc-summary__row">
              <span>Subtotal ({quantity} {quantity === 1 ? 'unidad' : 'unidades'})</span>
              <span>{formatPrice(subtotalBeforeOffer)}</span>
            </div>

            {offerDiscount > 0 && (
              <div className="osc-summary__row osc-summary__row--discount">
                <span>Descuento de oferta (-{selectedOffer.discountPercent}%)</span>
                <span>-{formatPrice(offerDiscount)}</span>
              </div>
            )}

            {upsellTotal > 0 && (
              <div className="osc-summary__row">
                <span>Productos adicionales</span>
                <span>+{formatPrice(upsellTotal)}</span>
              </div>
            )}

            {couponDiscount > 0 && (
              <div className="osc-summary__row osc-summary__row--discount">
                <span>Cupon (-{discountPercent}%)</span>
                <span>-{formatPrice(couponDiscount)}</span>
              </div>
            )}

            <div className="osc-summary__row">
              <span>Envio</span>
              <span>{shippingCost > 0 ? formatPrice(shippingCost) : 'Gratis'}</span>
            </div>

            {codFee > 0 && (
              <div className="osc-summary__row">
                <span>Recargo contra entrega</span>
                <span>{formatPrice(codFee)}</span>
              </div>
            )}

            <div className="osc-summary__divider" />

            <div className="osc-summary__row osc-summary__row--total">
              <span>TOTAL</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {/* Error Message */}
          {checkoutError && (
            <div className="osc-error-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{checkoutError}</span>
            </div>
          )}

          {/* ================================================================
              7. Submit Button
          ================================================================ */}
          <button
            type="submit"
            className="osc-submit"
            disabled={isSubmitting || !product.inventory?.isInStock}
          >
            {isSubmitting ? (
              <>
                <div className="osc-spinner osc-spinner--sm" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Confirmar Pedido - {formatPrice(grandTotal)}</span>
              </>
            )}
          </button>

          {!product.inventory?.isInStock && (
            <p className="osc-out-of-stock">Producto agotado</p>
          )}

          {/* ================================================================
              8. Urgency Timer
          ================================================================ */}
          {urgencyTimerMinutes && urgencyTimerMinutes > 0 && urgency.secondsLeft > 0 && (
            <div className="osc-urgency">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Esta oferta expira en <strong>{urgency.display}</strong></span>
            </div>
          )}

          {/* ================================================================
              9. Trust Badges
          ================================================================ */}
          <div className="osc-trust">
            <div className="osc-trust__item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Compra Segura</span>
            </div>
            <div className="osc-trust__item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span>Envio a todo el pais</span>
            </div>
            <div className="osc-trust__item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12" />
                <rect x="2" y="7" width="20" height="5" />
                <line x1="12" y1="22" x2="12" y2="7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
              <span>Pago al recibir</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  // --- Render based on mode ---
  if (formMode === 'popup') {
    return (
      <>
        {/* Sticky mobile button to open popup */}
        {!isPopupOpen && (
          <button className="osc-sticky-btn" onClick={openPopup}>
            <span>Comprar Ahora - {product.price?.special?.text || product.price?.regular?.text}</span>
          </button>
        )}

        {/* Popup overlay */}
        {isPopupOpen && (
          <div className="osc-popup-backdrop" onClick={closePopup}>
            <div className="osc-popup-panel" onClick={(e) => e.stopPropagation()}>
              {formContent}
            </div>
          </div>
        )}
      </>
    );
  }

  // Embedded mode
  return formContent;
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
      gallery { alt url }
      inventory { isInStock qty }
    }
  }
`;
