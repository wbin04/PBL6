import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Crosshair, MapPin, Search, X } from "lucide-react";
import {
  locationService,
  type PlaceDetailsResult,
  type PlaceSuggestion,
} from "@/services/locationService";

interface AddressPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (data: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  initialAddress?: string;
  initialCoords?: { latitude: number; longitude: number } | null;
}

const DEFAULT_CENTER = { lat: 10.762622, lng: 106.660172 };
const MIN_QUERY_LENGTH = 3;

const containerStyle = { width: "100%", height: "360px" } as const;

const parseNumber = (value: unknown) => {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? parseFloat(value)
      : NaN;
  return Number.isFinite(num) ? num : null;
};

export const AddressPicker: React.FC<AddressPickerProps> = ({
  open,
  onClose,
  onSelect,
  initialAddress,
  initialCoords,
}) => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
    | string
    | undefined;

  const { isLoaded, loadError } = useJsApiLoader({
    id: "checkout-address-picker",
    googleMapsApiKey: googleMapsApiKey || "",
    libraries: ["places"],
  });

  const mapRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState(initialAddress || "");
  const [predictions, setPredictions] = useState<PlaceSuggestion[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialCoords || null);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const center = useMemo(() => {
    if (selectedCoords) {
      return { lat: selectedCoords.latitude, lng: selectedCoords.longitude };
    }
    if (initialCoords) {
      return { lat: initialCoords.latitude, lng: initialCoords.longitude };
    }
    return DEFAULT_CENTER;
  }, [selectedCoords, initialCoords]);

  useEffect(() => {
    if (!open) return;
    setSearchQuery(initialAddress || "");
    setSelectedAddress(initialAddress || "");
    setSelectedCoords(initialCoords || null);
    setPredictions([]);
    setErrorMessage(null);
  }, [open, initialAddress, initialCoords]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (value.trim().length < MIN_QUERY_LENGTH) {
      setPredictions([]);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoadingPredictions(true);
        setErrorMessage(null);
        const suggestions = await locationService.autocomplete(value.trim());
        setPredictions(suggestions);
      } catch (error: any) {
        setErrorMessage(error?.message || "Không thể tìm kiếm địa chỉ.");
      } finally {
        setLoadingPredictions(false);
      }
    }, 350);
  };

  const handlePredictionSelect = async (item: PlaceSuggestion) => {
    try {
      setLoadingPredictions(true);
      setErrorMessage(null);
      const details: PlaceDetailsResult = await locationService.getPlaceDetails(
        item.placeId
      );
      setSelectedCoords({
        latitude: details.latitude,
        longitude: details.longitude,
      });
      setSelectedAddress(details.address);
      setSearchQuery(details.address);
      setPredictions([]);
      if (mapRef.current) {
        mapRef.current.panTo({ lat: details.latitude, lng: details.longitude });
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "Không thể lấy thông tin địa điểm.");
    } finally {
      setLoadingPredictions(false);
    }
  };

  const handleMapClick = async (event: any) => {
    const lat = parseNumber(event?.latLng?.lat?.());
    const lng = parseNumber(event?.latLng?.lng?.());

    if (lat == null || lng == null) {
      setErrorMessage("Không đọc được vị trí được chọn.");
      return;
    }

    setSelectedCoords({ latitude: lat, longitude: lng });

    try {
      const address = await locationService.reverseGeocode(lat, lng);
      setSelectedAddress(address);
      setSearchQuery(address);
      setErrorMessage(null);
    } catch (error: any) {
      setErrorMessage(error?.message || "Không thể xác định địa chỉ.");
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { latitude, longitude };
        setSelectedCoords(coords);
        if (mapRef.current) {
          mapRef.current.panTo({ lat: latitude, lng: longitude });
        }
        try {
          const address = await locationService.reverseGeocode(
            latitude,
            longitude
          );
          setSelectedAddress(address);
          setSearchQuery(address);
          setErrorMessage(null);
        } catch (error: any) {
          setErrorMessage(error?.message || "Không thể lấy địa chỉ hiện tại.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setErrorMessage("Không thể lấy vị trí hiện tại.");
      }
    );
  };

  const handleConfirm = () => {
    if (!selectedCoords || !selectedAddress) {
      setErrorMessage("Vui lòng chọn một địa chỉ hợp lệ.");
      return;
    }
    onSelect({
      address: selectedAddress,
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
    });
  };

  if (!open) return null;

  if (!googleMapsApiKey) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full space-y-3 text-center">
          <p className="text-lg font-semibold text-gray-800">
            Thiếu cấu hình Google Maps API key
          </p>
          <p className="text-sm text-gray-600">
            Thêm biến môi trường VITE_GOOGLE_MAPS_API_KEY để sử dụng tính năng chọn bản đồ.
          </p>
          <button
            onClick={onClose}
            className="mt-3 inline-flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <MapPin className="text-orange-500" size={20} />
            Chọn địa chỉ trên bản đồ
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid md:grid-cols-[320px,1fr] gap-4 p-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-orange-500">
              <Search size={16} className="text-gray-500" />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Tìm kiếm địa điểm, đường, phường..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {loadingPredictions && (
                <div className="text-xs text-gray-500">...</div>
              )}
            </div>

            <button
              onClick={handleUseCurrentLocation}
              className="w-full inline-flex items-center gap-2 justify-center px-3 py-2 border rounded-lg text-sm hover:border-orange-400"
              disabled={locating}
            >
              {locating ? (
                <span className="text-gray-600">Đang lấy vị trí...</span>
              ) : (
                <>
                  <Crosshair size={16} className="text-orange-500" />
                  Sử dụng vị trí hiện tại
                </>
              )}
            </button>

            {predictions.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                {predictions.map((item) => (
                  <button
                    key={item.id}
                    className="w-full text-left px-3 py-2 hover:bg-orange-50 flex items-start gap-2"
                    onClick={() => handlePredictionSelect(item)}
                  >
                    <MapPin size={16} className="text-orange-500 mt-1" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {item.description}
                      </div>
                      {item.secondaryText && (
                        <div className="text-xs text-gray-600">
                          {item.secondaryText}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border">
              {selectedAddress ? (
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-800">Địa chỉ đã chọn</p>
                    <p className="text-sm text-gray-700">{selectedAddress}</p>
                  </div>
                </div>
              ) : (
                <p>Chọn điểm trên bản đồ hoặc nhập địa chỉ để gợi ý.</p>
              )}
              {errorMessage && (
                <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
              >
                Huỷ
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedCoords || !selectedAddress}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-60"
              >
                Xác nhận
              </button>
            </div>
          </div>

          <div className="min-h-[360px]">
            {!isLoaded || loadError ? (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm border rounded-lg">
                {!isLoaded ? "Đang tải bản đồ..." : "Không thể tải Google Maps"}
              </div>
            ) : (
              <GoogleMap
                onLoad={(map) => (mapRef.current = map)}
                mapContainerStyle={containerStyle}
                center={center}
                zoom={14}
                onClick={handleMapClick}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                }}
              >
                {selectedCoords && (
                  <Marker
                    position={{
                      lat: selectedCoords.latitude,
                      lng: selectedCoords.longitude,
                    }}
                  />
                )}
              </GoogleMap>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressPicker;
