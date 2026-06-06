import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Banknote,
  CreditCard,
  MapPin,
  Search,
  Truck,
  LocateFixed,
  Loader2,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice, price, productImage } from '../lib/products';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import {
  getKathmanduSuggestions,
  promoCodes,
  resolvePromoCode,
} from '../lib/checkout';
import { useTranslation } from '../i18n/LocaleContext';

type PaymentMethodId = 'cod' | 'esewa' | 'khalti' | 'fonepay_qr' | 'card' | 'ime_pay';

interface PaymentFieldConfig {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel' | 'decimal';
}

interface DeliveryCalculationResponse {
  total_fee?: string | number;
  delivery_fee?: string | number;
  estimated_time?: string;
  item_deliveries?: Record<string, { fee: string; eta: string }>;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { items, totalPrice, clearCart } = useCart();
  const { token, user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('cod');
  const [deliveryEta, setDeliveryEta] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [itemDeliveries, setItemDeliveries] = useState<Record<string, {fee: string, eta: string}>>({});
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const houseDetailRef = useRef<HTMLTextAreaElement>(null);
  const instructionsRef = useRef<HTMLTextAreaElement>(null);
  const promoCodeRef = useRef<HTMLInputElement>(null);
  const [paymentDetails, setPaymentDetails] = useState<Record<string, string>>({});
  const paymentMethods = useMemo(
    () => [
      { id: 'cod' as PaymentMethodId, label: t('checkout.paymentCodLabel', { defaultValue: 'COD' }), description: t('checkout.paymentCodDescription', { defaultValue: 'Pay on delivery' }) },
      { id: 'esewa' as PaymentMethodId, label: t('checkout.paymentEsewaLabel', { defaultValue: 'eSewa' }), description: t('checkout.paymentEsewaDescription', { defaultValue: 'Wallet payment' }), logoSrc: '/payment-logos/esewa-header.webp', logoAlt: 'eSewa logo' },
      { id: 'khalti' as PaymentMethodId, label: t('checkout.paymentKhaltiLabel', { defaultValue: 'Khalti' }), description: t('checkout.paymentKhaltiDescription', { defaultValue: 'Mobile wallet checkout' }), logoSrc: '/payment-logos/khalti.png', logoAlt: 'Khalti logo' },
      { id: 'fonepay_qr' as PaymentMethodId, label: t('checkout.paymentFonepayLabel', { defaultValue: 'Fonepay QR' }), description: t('checkout.paymentFonepayDescription', { defaultValue: 'Scan and pay' }), logoSrc: '/payment-logos/fonepay-icon.png', logoAlt: 'Fonepay logo' },
      { id: 'card' as PaymentMethodId, label: t('checkout.paymentCardLabel', { defaultValue: 'Card payments' }), description: t('checkout.paymentCardDescription', { defaultValue: 'Visa, Mastercard, and debit cards' }) },
      { id: 'ime_pay' as PaymentMethodId, label: t('checkout.paymentImePayLabel', { defaultValue: 'IME Pay' }), description: t('checkout.paymentImePayDescription', { defaultValue: 'IME Pay wallet' }), logoSrc: '/payment-logos/ime-pay.svg', logoAlt: 'IME Pay logo' },
    ],
    [t]
  );
  const paymentDetailConfig = useMemo<Record<Exclude<PaymentMethodId, 'cod'>, { title: string; helper: string; fields: PaymentFieldConfig[] }>>(
    () => ({
      card: {
        title: t('checkout.cardDetailsTitle', { defaultValue: 'Card details' }),
        helper: t('checkout.cardDetailsHelper', { defaultValue: 'Use a test card or demo card details for this checkout.' }),
        fields: [
          {
            key: 'cardholderName',
            label: t('checkout.cardHolderName', { defaultValue: 'Cardholder name' }),
            placeholder: t('auth.namePlaceholder', { defaultValue: 'Ram Shah' }),
          },
          {
            key: 'cardNumber',
            label: t('checkout.cardNumber', { defaultValue: 'Card number' }),
            placeholder: '4242 4242 4242 4242',
            inputMode: 'numeric',
          },
          {
            key: 'expiry',
            label: t('checkout.expiry', { defaultValue: 'Expiry' }),
            placeholder: 'MM / YY',
          },
          {
            key: 'cvv',
            label: t('checkout.cvv', { defaultValue: 'CVV' }),
            placeholder: '123',
            type: 'password',
            inputMode: 'numeric',
          },
        ],
      },
      esewa: {
        title: t('checkout.esewaDetailsTitle', { defaultValue: 'eSewa details' }),
        helper: t('checkout.esewaDetailsHelper', { defaultValue: 'Enter the wallet number and transfer reference.' }),
        fields: [
          {
            key: 'walletNumber',
            label: t('checkout.walletNumber', { defaultValue: 'Wallet number' }),
            placeholder: '98XXXXXXXX',
            inputMode: 'tel',
          },
          {
            key: 'referenceId',
            label: t('checkout.referenceId', { defaultValue: 'Reference ID' }),
            placeholder: 'eSewa transaction id',
          },
        ],
      },
      khalti: {
        title: t('checkout.khaltiDetailsTitle', { defaultValue: 'Khalti details' }),
        helper: t('checkout.khaltiDetailsHelper', { defaultValue: 'Add the mobile wallet number and the payment reference.' }),
        fields: [
          {
            key: 'walletNumber',
            label: t('checkout.walletNumber', { defaultValue: 'Wallet number' }),
            placeholder: '98XXXXXXXX',
            inputMode: 'tel',
          },
          {
            key: 'referenceId',
            label: t('checkout.referenceId', { defaultValue: 'Reference ID' }),
            placeholder: 'Khalti transaction id',
          },
        ],
      },
      fonepay_qr: {
        title: t('checkout.fonepayDetailsTitle', { defaultValue: 'Fonepay QR details' }),
        helper: t('checkout.fonepayDetailsHelper', { defaultValue: 'Scan the QR, then paste the payment reference from the app.' }),
        fields: [
          {
            key: 'payerName',
            label: t('checkout.payerName', { defaultValue: 'Payer name' }),
            placeholder: t('auth.namePlaceholder', { defaultValue: 'Ram Shah' }),
          },
          {
            key: 'referenceId',
            label: t('checkout.referenceId', { defaultValue: 'Reference ID' }),
            placeholder: 'QR payment reference',
          },
        ],
      },
      ime_pay: {
        title: t('checkout.imePayDetailsTitle', { defaultValue: 'IME Pay details' }),
        helper: t('checkout.imePayDetailsHelper', { defaultValue: 'Enter the wallet number and payment reference.' }),
        fields: [
          {
            key: 'walletNumber',
            label: t('checkout.walletNumber', { defaultValue: 'Wallet number' }),
            placeholder: '98XXXXXXXX',
            inputMode: 'tel',
          },
          {
            key: 'referenceId',
            label: t('checkout.referenceId', { defaultValue: 'Reference ID' }),
            placeholder: 'IME Pay transaction id',
          },
        ],
      },
    }),
    [t]
  );



  const selectedPaymentConfig =
    paymentMethod === 'cod' ? null : paymentDetailConfig[paymentMethod as Exclude<PaymentMethodId, 'cod'>];
  const selectedPaymentLabel =
    paymentMethods.find((method) => method.id === paymentMethod)?.label || paymentMethod;

  const addressSuggestions = useMemo(
    () => {
      const suggestions = getKathmanduSuggestions(addressQuery).filter((item) => item.label !== addressQuery.trim());
      // Reset focus index when suggestions change
      setFocusedSuggestionIndex(-1);
      return suggestions;
    },
    [addressQuery]
  );

  useEffect(() => {
    if (focusedSuggestionIndex >= 0) {
      document.getElementById(`suggestion-${focusedSuggestionIndex}`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedSuggestionIndex]);

  useEffect(() => {
    if (!addressQuery.trim()) {
      setDeliveryFee(0);
      setDeliveryEta('');
      setItemDeliveries({});
      return;
    }

    const timer = setTimeout(async () => {
      setIsCalculatingDelivery(true);
      try {
        const payload = {
          shipping_address: addressQuery,
          items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity }))
        };
        const response = await apiRequest<DeliveryCalculationResponse>('/orders/calculate_delivery/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setDeliveryFee(Number(response.total_fee || response.delivery_fee || 0));
        setItemDeliveries(response.item_deliveries || {});
        
        // Aggregate unique ETAs for fallback/total display
        if (response.item_deliveries) {
          const etas = Object.values(response.item_deliveries).map((info) => info.eta);
          const uniqueEtas = Array.from(new Set(etas));
          setDeliveryEta(uniqueEtas.join(', '));
        } else {
          setDeliveryEta(response.estimated_time || '');
        }
      } catch (err) {
        console.error('Failed to calculate delivery fee:', err);
      } finally {
        setIsCalculatingDelivery(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [addressQuery, items]);

  const deliveryAddress = [addressQuery.trim(), addressDetail.trim()].filter(Boolean).join(', ');
  const shipping = deliveryFee;
  const promoRate = appliedPromoCode ? promoCodes[appliedPromoCode as keyof typeof promoCodes] : 0;
  const discountAmount = Math.round((totalPrice * promoRate) / 100);
  const total = Math.max(totalPrice + shipping - discountAmount, 0);

  function setPaymentField(key: string, value: string) {
    setPaymentDetails((current) => ({ ...current, [key]: value }));
  }

  async function handleGetCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setError(t('checkout.geoNotSupported', { defaultValue: 'Geolocation is not supported by your browser' }));
      return;
    }
    
    setIsLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const address = data.address;
            const area = address.suburb || address.neighbourhood || address.city_district || address.town || address.city || 'Kathmandu';
            const detail = [address.road, address.house_number].filter(Boolean).join(', ') || data.display_name;
            
            setAddressQuery(area);
            setAddressDetail(detail);
            setShowAddressSuggestions(false);
            houseDetailRef.current?.focus();
          } else {
            setError(t('checkout.geoFetchFailed', { defaultValue: 'Could not fetch address for your location' }));
          }
        } catch (err) {
          console.error(err);
          setError(t('checkout.geoReverseFailed', { defaultValue: 'Failed to reverse geocode location' }));
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setError(t('checkout.geoDenied', { defaultValue: 'Location permission denied. Please enable it in your browser settings.' }));
        } else {
          setError(t('checkout.geoError', { defaultValue: 'Unable to retrieve your location' }));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function applyPromoCode(code = promoCodeInput) {
    const next = resolvePromoCode(code);
    if (!next.code) {
      setAppliedPromoCode('');
      setPromoMessage('');
      return;
    }

    if (!next.valid) {
      setAppliedPromoCode('');
      setPromoMessage(t('checkout.promoInvalid', { defaultValue: 'Promo code is not valid.' }));
      return;
    }

    setAppliedPromoCode(next.code);
    setPromoCodeInput(next.code);
    setPromoMessage(t('checkout.promoApplied', { defaultValue: 'Promo code applied.' }));
  }

  function removePromoCode() {
    setPromoCodeInput('');
    setAppliedPromoCode('');
    setPromoMessage('');
  }

  function validatePaymentDetails() {
    if (!selectedPaymentConfig) return '';

    const missingFields = selectedPaymentConfig.fields
      .filter((field) => !paymentDetails[field.key]?.trim())
      .map((field) => field.label);

    if (missingFields.length > 0) {
      return t('checkout.pleaseCompletePaymentDetails', { fields: missingFields.join(', '), defaultValue: `Please complete ${missingFields.join(', ')}.` });
    }

    return '';
  }

  async function placeOrder() {
    if (!user || !token) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    if (!addressQuery.trim()) {
      setError(t('checkout.selectAreaFirst', { defaultValue: 'Select a delivery area in Kathmandu first.' }));
      return;
    }

    const paymentError = validatePaymentDetails();
    if (paymentError) {
      setError(paymentError);
      return;
    }

    setError('');
    try {
      await apiRequest('/orders/', {
        token,
        method: 'POST',
        body: JSON.stringify({
          payment_method: paymentMethod,
          promo_code: appliedPromoCode,
          shipping_address: deliveryAddress,
          customer_note: customerNote.trim(),
          items: items.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
        }),
      });
      setPlaced(true);
      clearCart();
      window.setTimeout(() => navigate('/dashboard/orders'), 1800);
    } catch (err) {
      setError(t('checkout.couldNotPlaceOrder', { defaultValue: 'Could not place order' }));
    }
  }

  if (items.length === 0 && !placed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black tracking-tight">{t('checkout.title', { defaultValue: 'Checkout' })}</h1>
        <p className="mt-3 text-secondary">{t('cart.emptyTitle', { defaultValue: 'Your cart is empty.' })}</p>
        <Link to="/products" className="mt-6 inline-flex rounded-md bg-accent px-5 py-3 font-semibold text-background">
          {t('cart.browseCatalog', { defaultValue: 'Browse products' })}
        </Link>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-6 text-3xl font-black tracking-tight">{t('checkout.orderPlacedTitle', { defaultValue: 'Order placed' })}</h1>
        <p className="mt-3 text-secondary">
          {t('checkout.paymentMethodLabel', { defaultValue: 'Payment method:' })} <span className="font-semibold text-primary">{selectedPaymentLabel}</span>
        </p>
        <p className="mt-2 text-secondary">{t('checkout.orderPlacedCopy', { defaultValue: 'You will be redirected to your order history.' })}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link to="/cart" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        {t('checkout.backToCart', { defaultValue: 'Back to cart' })}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-6">
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{t('checkout.title', { defaultValue: 'Checkout' })}</h1>
            <p className="mt-2 text-sm text-secondary">{t('checkout.copy', { defaultValue: 'Delivery, payment, and order review.' })}</p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              <h2 className="text-lg font-bold">{t('checkout.deliveryAddress', { defaultValue: 'Delivery address' })}</h2>
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold">{t('checkout.searchArea', { defaultValue: 'Search area' })}</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
                <input
                  value={addressQuery}
                  onChange={(event) => {
                    setAddressQuery(event.target.value);
                    setShowAddressSuggestions(true);
                  }}
                  onFocus={() => setShowAddressSuggestions(true)}
                  onBlur={() => window.setTimeout(() => setShowAddressSuggestions(false), 120)}
                  onKeyDown={(e) => {
                    if (!showAddressSuggestions || addressSuggestions.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setFocusedSuggestionIndex((prev) => (prev < addressSuggestions.length - 1 ? prev + 1 : prev));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setFocusedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
                    } else if (e.key === 'Enter') {
                      if (focusedSuggestionIndex >= 0) {
                        e.preventDefault();
                        setAddressQuery(addressSuggestions[focusedSuggestionIndex].label);
                        setShowAddressSuggestions(false);
                        houseDetailRef.current?.focus();
                      }
                    } else if (e.key === 'Tab') {
                      setShowAddressSuggestions(false);
                      setFocusedSuggestionIndex(-1);
                    }
                  }}
                  placeholder={t('checkout.searchHint', { defaultValue: 'Type Gongabu, Thamel, Gyaneshwor...' })}
                  ref={addressInputRef}
                  className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-10 text-base outline-none transition-colors focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-secondary hover:bg-accent/10 hover:text-accent disabled:opacity-50"
                  title={t('checkout.useCurrentLocation', { defaultValue: 'Use current location' })}
                >
                  {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                </button>
              </div>

              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
                  {addressSuggestions.map((item, index) => (
                    <button
                      key={`${item.label}-${item.city}`}
                      id={`suggestion-${index}`}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setAddressQuery(item.label);
                        setShowAddressSuggestions(false);
                        houseDetailRef.current?.focus();
                      }}
                      className={`flex w-full items-center justify-between gap-4 border-b border-border px-4 py-3 text-left text-base last:border-b-0 hover:bg-muted ${index === focusedSuggestionIndex ? 'bg-muted' : ''}`}
                    >
                      <span className="font-semibold text-primary">{item.label}</span>
                      <span className="text-xs text-secondary">{item.city}</span>
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-2 text-xs text-secondary">{t('checkout.deliveryHint', { defaultValue: 'Start with your area, then add the exact house or landmark below.' })}</p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">{t('checkout.houseLabel', { defaultValue: 'House, ward, landmark' })}</label>
                <textarea
                  ref={houseDetailRef}
                  value={addressDetail}
                  onChange={(event) => setAddressDetail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Tab' && !event.shiftKey) {
                      event.preventDefault();
                      instructionsRef.current?.focus();
                    }
                  }}
                  className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent"
                  placeholder={t('checkout.housePlaceholder', { defaultValue: 'House number, ward, apartment, landmark' })}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">{t('checkout.instructionsLabel', { defaultValue: 'Delivery instructions' })}</label>
                <textarea
                  ref={instructionsRef}
                  value={customerNote}
                  onChange={(event) => setCustomerNote(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Tab' && !event.shiftKey) {
                      event.preventDefault();
                      promoCodeRef.current?.focus();
                    }
                  }}
                  className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-3 text-base outline-none focus:border-accent"
                  placeholder={t('checkout.instructionsPlaceholder', { defaultValue: 'Call on arrival, leave at reception, gate code, and similar notes' })}
                />
              </div>
            </div>
          </div>



          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-bold">{t('checkout.paymentMethod', { defaultValue: 'Payment method' })}</h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {paymentMethods.map((method) => {
                const active = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      active ? 'border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(248,86,6,0.35)]' : 'border-border bg-background hover:border-accent'
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <span
                        className={`inline-flex h-12 w-fit max-w-full items-center justify-center overflow-hidden rounded-md border bg-white px-3 shadow-sm dark:bg-white ${
                          active ? 'border-accent ring-1 ring-accent/20' : 'border-border'
                        }`}
                      >
                        {method.logoSrc ? (
                          <span className="flex h-8 items-center justify-center rounded-sm bg-white px-1.5 py-1">
                            <img
                              src={method.logoSrc}
                              alt={method.logoAlt || method.label}
                              className="h-full w-auto max-w-[120px] object-contain"
                            />
                          </span>
                        ) : method.id === 'card' ? (
                          <CreditCard className={`h-7 w-7 ${active ? 'text-accent' : 'text-secondary'}`} />
                        ) : (
                          <Banknote className={`h-7 w-7 ${active ? 'text-accent' : 'text-secondary'}`} />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-primary">{method.label}</p>
                        <p className="text-xs text-secondary">{method.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedPaymentConfig && (
              <div className="mt-6 rounded-lg border border-border bg-background p-4">
                <h3 className="text-base font-bold">{selectedPaymentConfig.title}</h3>
                <p className="mt-1 text-sm text-secondary">{selectedPaymentConfig.helper}</p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedPaymentConfig.fields.map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-2 block text-sm font-semibold">{field.label}</span>
                      <input
                        value={paymentDetails[field.key] || ''}
                        onChange={(event) => setPaymentField(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        type={field.type || 'text'}
                        inputMode={field.inputMode}
                        className="h-11 w-full rounded-md border border-border bg-surface px-3 text-base outline-none transition-colors focus:border-accent"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

        </section>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">{t('checkout.orderSummary', { defaultValue: 'Order summary' })}</h2>
            <div className="mt-5 rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-primary">{t('checkout.items', { defaultValue: 'Items' })}</p>
                <p className="text-xs text-secondary">{items.length}</p>
              </div>
              <div className="mt-3 space-y-3">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex flex-col gap-2 rounded-md bg-surface p-2">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-md bg-muted">
                        {productImage(product) ? (
                          <img src={productImage(product)} alt={product.name} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{product.name}</p>
                        <p className="text-xs text-secondary">{t('cart.qty', { defaultValue: 'Qty' })} {quantity}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">{formatPrice(price(product) * quantity)}</p>
                    </div>
                    {itemDeliveries[product.id] && !isCalculatingDelivery && (
                      <div className="mt-1 flex items-center justify-between rounded bg-background px-2 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-accent">
                          <Truck className="h-3.5 w-3.5" />
                          <span className="font-medium">{itemDeliveries[product.id].eta}</span>
                        </div>
                        <span className="font-semibold text-secondary">
                          {Number(itemDeliveries[product.id].fee) === 0
                            ? t('checkout.freeDelivery', { defaultValue: 'Free' })
                            : `+ ${formatPrice(Number(itemDeliveries[product.id].fee))}`}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary">{t('checkout.subtotal', { defaultValue: 'Subtotal' })}</span>
                <span className="font-medium">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="text-secondary">{t('checkout.deliverySummary', { defaultValue: 'Delivery' })}</span>
                <span className="font-medium text-primary">
                  {isCalculatingDelivery ? (
                    <span className="text-xs text-secondary animate-pulse">{t('checkout.calculating', { defaultValue: 'Calculating...' })}</span>
                  ) : (
                    shipping === 0 ? t('checkout.freeDelivery', { defaultValue: 'Free' }) : formatPrice(shipping)
                  )}
                </span>
              </div>
              
              {!isCalculatingDelivery && deliveryEta && Object.keys(itemDeliveries).length === 0 && (
                <div className="flex justify-between py-1 text-sm bg-accent/10 rounded-md px-2 -mx-2">
                  <span className="text-accent text-xs font-semibold">{t('checkout.etaSummary', { defaultValue: 'Estimated Time' })}</span>
                  <span className="text-accent text-xs font-bold">{deliveryEta}</span>
                </div>
              )}
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  <BadgePercent className="h-4 w-4 text-accent" />
                  <h3 className="font-semibold">{t('checkout.promoCode', { defaultValue: 'Promo code' })}</h3>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    ref={promoCodeRef}
                    value={promoCodeInput}
                    onChange={(event) => setPromoCodeInput(event.target.value.toLowerCase())}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        applyPromoCode();
                      }
                    }}
                    placeholder={t('checkout.promoPlaceholder', { defaultValue: 'Enter promo code' })}
                    className="h-11 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-base outline-none transition-colors focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => applyPromoCode()}
                    className="rounded-md bg-accent px-4 text-sm font-semibold text-background transition-colors hover:bg-orange-600"
                  >
                    {t('common.apply', { defaultValue: 'Apply' })}
                  </button>
                </div>
                {promoMessage && <p className="mt-3 text-xs text-secondary">{promoMessage}</p>}
                {appliedPromoCode && (
                  <button
                    type="button"
                    onClick={removePromoCode}
                    className="mt-3 text-xs font-semibold text-accent hover:underline"
                  >
                    {t('checkout.removePromo', { defaultValue: 'Remove promo code' })}
                  </button>
                )}
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary">{t('checkout.promoDiscount', { defaultValue: 'Promo discount' })}</span>
                  <span className="font-medium text-green-500">- {formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-4">
                <span className="font-bold">{t('checkout.total', { defaultValue: 'Total' })}</span>
                <span className="text-lg font-black text-accent">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border bg-background p-4 text-sm">
              <p className="mt-1 text-secondary">
                {t('checkout.dynamicDeliveryLabel', { defaultValue: 'Dynamic Delivery' })} · {deliveryEta || t('checkout.pendingEta', { defaultValue: 'Pending...' })}
              </p>
              <p className="mt-2 text-secondary">
                {deliveryAddress || t('checkout.searchAnAreaFirst', { defaultValue: 'Search an area first to build the full delivery address.' })}
              </p>
            </div>

            <button
              type="button"
              onClick={placeOrder}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-4 text-lg font-black text-background shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!addressQuery.trim() || Boolean(validatePaymentDetails())}
            >
              {t('checkout.placeOrder', { defaultValue: 'Complete order' })} <ArrowRight className="h-5 w-5" />
            </button>
            {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <p className="mt-3 text-xs text-secondary">
              {t('checkout.selectedPayment', { defaultValue: 'Selected payment:' })} <span className="font-semibold text-primary">{selectedPaymentLabel}</span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
