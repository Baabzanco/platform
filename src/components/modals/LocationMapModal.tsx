import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Check,
  Clock,
  Compass,
  Crosshair,
  Edit3,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  X,
} from 'lucide-react';
import { Order } from '../../types/order';
import { calculateDistanceKm } from '../../utils/formatters';
import { toPersianDigits } from '../../utils/jalaliCalendar';

export type LocationModalMode = 'pick' | 'navigate';

interface LocationMapModalProps {
  open: boolean;
  order: Order | null;
  mode: LocationModalMode;
  onChangeMode: (nextMode: LocationModalMode) => void;
  onClose: () => void;
  onSaveLocation: (
    orderId: string,
    location: { lat: number; lng: number; note?: string }
  ) => void;
}

const DEFAULT_TEHRAN_CENTER: { lat: number; lng: number } = {
  lat: 35.7219,
  lng: 51.3347,
};

const DISTRICT_FALLBACK_CENTERS: Array<{
  keyword: string;
  lat: number;
  lng: number;
}> = [
  { keyword: 'فتح', lat: 35.6768, lng: 51.2896 },
  { keyword: 'سیمین', lat: 35.6915, lng: 51.1488 },
  { keyword: 'اوین', lat: 35.7908, lng: 51.3917 },
  { keyword: 'سعادت', lat: 35.7785, lng: 51.3748 },
  { keyword: 'وزرا', lat: 35.7365, lng: 51.4152 },
  { keyword: 'ولیعصر', lat: 35.7346, lng: 51.4106 },
  { keyword: 'صادقیه', lat: 35.7241, lng: 51.3318 },
  { keyword: 'خاوران', lat: 35.6238, lng: 51.4867 },
  { keyword: 'جردن', lat: 35.7642, lng: 51.4165 },
  { keyword: 'فرشته', lat: 35.7929, lng: 51.4258 },
  { keyword: 'نیاوران', lat: 35.8142, lng: 51.4667 },
  { keyword: 'اقدسیه', lat: 35.8021, lng: 51.4855 },
  { keyword: 'میرداماد', lat: 35.7596, lng: 51.4342 },
];

function getInitialCenterForOrder(order: Order): { lat: number; lng: number } {
  if (order.customerLocation) {
    return {
      lat: order.customerLocation.lat,
      lng: order.customerLocation.lng,
    };
  }
  const combined = `${order.district} ${order.address}`;
  const found = DISTRICT_FALLBACK_CENTERS.find((entry) =>
    combined.includes(entry.keyword)
  );
  return found ? { lat: found.lat, lng: found.lng } : DEFAULT_TEHRAN_CENTER;
}

function createCustomerPinIcon(isNavigate: boolean): L.DivIcon {
  const fill = isNavigate ? '#059669' : '#0f5864';
  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
        <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${fill};border:3px solid #ffffff;box-shadow:0 6px 14px rgba(15,23,42,0.35);display:flex;align-items:center;justify-content:center;">
          <div style="width:10px;height:10px;border-radius:9999px;background:#ffffff;transform:rotate(45deg);"></div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createDriverGpsIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-driver-gps-pin',
    html: `
      <div style="width:20px;height:20px;border-radius:9999px;background:#2563eb;border:3px solid #ffffff;box-shadow:0 0 0 5px rgba(37,99,235,0.22);transform:translate(-50%,-50%);"></div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  open,
  order,
  mode,
  onChangeMode,
  onClose,
  onSaveLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  }>(DEFAULT_TEHRAN_CENTER);
  const [locationNote, setLocationNote] = useState('');
  const [driverCoords, setDriverCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');

  // Initialize coordinates and note whenever modal opens for an order
  useEffect(() => {
    if (!open || !order) return;
    const initial = getInitialCenterForOrder(order);
    setSelectedCoords(initial);
    setLocationNote(order.customerLocation?.note ?? '');
    setGpsStatus('');
    setGpsLoading(false);
  }, [open, order?.id, mode]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Initialize and tear down Leaflet map
  useEffect(() => {
    if (!open || !order || !mapContainerRef.current) return;

    const initial = getInitialCenterForOrder(order);
    const map = L.map(mapContainerRef.current, {
      center: [initial.lat, initial.lng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const marker = L.marker([initial.lat, initial.lng], {
      draggable: mode === 'pick',
      icon: createCustomerPinIcon(mode === 'navigate'),
    }).addTo(map);

    if (mode === 'pick') {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setSelectedCoords({
          lat: Number(pos.lat.toFixed(6)),
          lng: Number(pos.lng.toFixed(6)),
        });
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setSelectedCoords({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
        });
      });
    }

    mapInstanceRef.current = map;
    customerMarkerRef.current = marker;

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 180);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      customerMarkerRef.current = null;
      driverMarkerRef.current = null;
      routeLineRef.current = null;
    };
  }, [open, order?.id, mode]);

  // Update driver live GPS marker & route preview line in navigate mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !open || !order) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (driverCoords) {
      const dMarker = L.marker([driverCoords.lat, driverCoords.lng], {
        icon: createDriverGpsIcon(),
      }).addTo(map);
      driverMarkerRef.current = dMarker;

      if (mode === 'navigate' && order.customerLocation) {
        const line = L.polyline(
          [
            [driverCoords.lat, driverCoords.lng],
            [order.customerLocation.lat, order.customerLocation.lng],
          ],
          {
            color: '#0f5864',
            weight: 4,
            dashArray: '8 8',
            opacity: 0.85,
          }
        ).addTo(map);
        routeLineRef.current = line;

        map.fitBounds(line.getBounds(), { padding: [44, 44], maxZoom: 16 });
      }
    }
  }, [driverCoords, open, order, mode]);

  const activeCoords = useMemo(() => {
    if (mode === 'navigate' && order?.customerLocation) {
      return {
        lat: order.customerLocation.lat,
        lng: order.customerLocation.lng,
      };
    }
    return selectedCoords;
  }, [mode, order, selectedCoords]);

  const estimatedDistanceKm = useMemo(() => {
    if (!driverCoords) return null;
    return calculateDistanceKm(
      driverCoords.lat,
      driverCoords.lng,
      activeCoords.lat,
      activeCoords.lng
    );
  }, [driverCoords, activeCoords]);

  if (!open || !order) return null;

  const handleDetectCurrentGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('مرورگر شما از موقعیت‌یاب GPS پشتیبانی نمی‌کند. موقعیت را روی نقشه انتخاب کنید.');
      return;
    }

    setGpsLoading(true);
    setGpsStatus('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setDriverCoords({ lat, lng });
        setGpsLoading(false);

        if (mode === 'pick') {
          setSelectedCoords({ lat, lng });
          customerMarkerRef.current?.setLatLng([lat, lng]);
          mapInstanceRef.current?.setView([lat, lng], 16, { animate: true });
          setGpsStatus('موقعیت فعلی شما روی نقشه ثبت شد. در صورت نیاز پین را جابه‌جا کنید.');
        } else {
          setGpsStatus('موقعیت فعلی شما دریافت شد و فاصله تا مشتری محاسبه گردید.');
        }
      },
      () => {
        setGpsLoading(false);
        setGpsStatus(
          'دسترسی به GPS ممکن نیست. می‌توانید موقعیت دقیق را مستقیماً روی نقشه لمس کنید.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSave = () => {
    onSaveLocation(order.id, {
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      note: locationNote,
    });
    onClose();
  };

  const { lat, lng } = activeCoords;
  const neshanUrl = `https://neshan.org/maps/routing/car/destination/${lat},${lng}`;
  const baladUrl = `https://balad.ir/directions/driving?destination=${lng},${lat}`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const geoIntentUrl = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(
    `${order.code} - ${order.district}`
  )})`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === 'navigate'
          ? `مسیریابی سفارش ${order.code}`
          : `ثبت لوکیشن سفارش ${order.code}`
      }
      className="no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1.5px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-[680px] rounded-t-2xl sm:rounded-xl border-t sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh]">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-slate-50 shrink-0">
          <span className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
              {mode === 'navigate' ? (
                <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 text-[#0f5864] shrink-0" />
              )}
              <span className="truncate">
                {mode === 'navigate'
                  ? `مسیریابی به سمت مشتری — سفارش ${order.code}`
                  : order.customerLocation
                    ? `ویرایش لوکیشن مشتری — سفارش ${order.code}`
                    : `ثبت لوکیشن مشتری روی نقشه — سفارش ${order.code}`}
              </span>
            </h3>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
              <span>{order.district}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                بازه ارسال {order.deliverySlot}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="بستن نقشه"
            className="w-10 h-10 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {/* Address Strip */}
          <div className="px-4 sm:px-5 py-3 bg-white flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700 leading-relaxed min-w-0">
              <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-900">{order.address}</p>
                {mode === 'navigate' && order.customerLocation?.note && (
                  <p className="text-xs text-[#0f5864] font-medium">
                    توضیح محل تحویل: {order.customerLocation.note}
                  </p>
                )}
              </div>
            </div>

            {mode === 'navigate' && (
              <button
                type="button"
                onClick={() => onChangeMode('pick')}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                ویرایش پین
              </button>
            )}
          </div>

          {/* Interactive Map Canvas */}
          <div className="p-4 sm:p-5 bg-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 font-medium">
                {mode === 'pick'
                  ? 'روی نقشه لمس کنید یا پین را بکشید تا موقعیت دقیق مشتری مشخص شود:'
                  : 'موقعیت ثبت‌شده مشتری روی نقشه:'}
              </span>

              <button
                type="button"
                disabled={gpsLoading}
                onClick={handleDetectCurrentGps}
                className="min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-xl sm:rounded-lg text-xs font-bold bg-[#0f5864]/10 text-[#0f5864] hover:bg-[#0f5864] hover:text-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {gpsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5" />
                )}
                {mode === 'pick' ? 'ثبت با موقعیت فعلی (GPS)' : 'نمایش موقعیت من و فاصله'}
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-300 bg-slate-100 h-[270px] sm:h-[320px] z-0">
              <div ref={mapContainerRef} className="w-full h-full z-0" />
            </div>

            {/* Coordinates & GPS Feedback */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#0f5864] shrink-0" />
                <span>مختصات مقصد:</span>
                <span dir="ltr" className="tabular-nums font-bold text-slate-900">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
              </div>

              {estimatedDistanceKm !== null && (
                <span className="tabular-nums font-bold text-emerald-700">
                  فاصله هوایی تقریبی:{' '}
                  {estimatedDistanceKm < 1
                    ? `${toPersianDigits(Math.round(estimatedDistanceKm * 1000))} متر`
                    : `${toPersianDigits(Number(estimatedDistanceKm.toFixed(1)))} کیلومتر`}
                </span>
              )}
            </div>

            {gpsStatus && (
              <p className="text-xs text-[#0f5864] bg-[#0f5864]/8 border border-[#0f5864]/20 rounded-xl px-3 py-2 leading-relaxed">
                {gpsStatus}
              </p>
            )}

            {/* Pick Mode: Optional Access Note */}
            {mode === 'pick' && (
              <div className="space-y-1.5 pt-1">
                <label
                  htmlFor="location-access-note"
                  className="block text-xs font-semibold text-slate-700"
                >
                  توضیح محل تحویل / نشانه دسترسی (اختیاری):
                </label>
                <input
                  id="location-access-note"
                  type="text"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  placeholder="مثلاً: درب ورودی انبار از کوچه پشتی، پلاک ۱۴..."
                  className="w-full h-11 px-3.5 text-sm sm:text-xs bg-white border border-slate-300 rounded-xl sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f5864]/25 focus:border-[#0f5864]"
                />
              </div>
            )}

            {/* Navigate Mode: Turn-by-Turn Navigation App Launchers */}
            {mode === 'navigate' && (
              <div className="space-y-2.5 pt-1">
                <div className="text-xs font-bold text-slate-800">
                  انتخاب مسیریاب برای حرکت به سمت مشتری:
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={neshanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[48px] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all whitespace-nowrap"
                  >
                    <Navigation className="w-4 h-4 shrink-0" />
                    مسیریابی با نشان
                  </a>

                  <a
                    href={baladUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[48px] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] transition-all whitespace-nowrap"
                  >
                    <Navigation className="w-4 h-4 shrink-0" />
                    مسیریابی با بلد
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Google Maps
                  </a>

                  <a
                    href={wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    Waze
                  </a>

                  <a
                    href={geoIntentUrl}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-[#0f5864] border border-slate-200 hover:bg-[#0f5864] hover:text-white transition-colors whitespace-nowrap"
                  >
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    اپ گوشی
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-4 sm:px-5 pt-3.5 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pb-modal-safe shrink-0">
          {mode === 'pick' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-white bg-[#0f5864] rounded-xl sm:rounded-lg hover:bg-[#0b434d] active:scale-[0.99] transition-all"
              >
                <Check className="w-4 h-4" />
                ذخیره لوکیشن مشتری
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2.5 sm:py-2 text-sm sm:text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 transition-colors"
            >
              بستن
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
