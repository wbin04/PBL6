export interface PlaceSuggestion {
  id: string;
  description: string;
  secondaryText?: string;
  placeId: string;
}

export interface PlaceDetailsResult {
  address: string;
  latitude: number;
  longitude: number;
}

interface GooglePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

interface GoogleAutocompleteResponse {
  status: string;
  predictions: GooglePrediction[];
  error_message?: string;
}

interface GooglePlaceDetailsResponse {
  status: string;
  result?: {
    formatted_address?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
  };
  error_message?: string;
}

interface GoogleGeocodeResponse {
  status: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
  }>;
  error_message?: string;
}

interface GoogleDirectionsResponse {
  status: string;
  routes?: Array<{
    legs?: Array<{
      distance?: {
        value?: number;
        text?: string;
      };
    }>;
  }>;
  error_message?: string;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
  | string
  | undefined;
const GOOGLE_BASE_URL = "https://maps.googleapis.com/maps/api";

const ensureApiKey = () => {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error(
      "Thiếu khoá VITE_GOOGLE_MAPS_API_KEY. Vui lòng cấu hình Google Maps API key."
    );
  }
};

const buildUrl = (path: string, params: Record<string, string | number>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });
  searchParams.append("key", String(GOOGLE_MAPS_API_KEY));
  return `${GOOGLE_BASE_URL}/${path}?${searchParams.toString()}`;
};

const normalizeGoogleStatus = (status: string, errorMessage?: string) => {
  if (status === "OK" || status === "ZERO_RESULTS") {
    return;
  }
  const message = errorMessage || "Không thể kết nối tới Google Maps API";
  throw new Error(message);
};

export const locationService = {
  async autocomplete(query: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
    if (!query.trim()) {
      return [];
    }

    ensureApiKey();

    const autocompleteParams: Record<string, string | number> = {
      input: query,
      language: "vi",
      components: "country:vn",
    };

    if (sessionToken) {
      autocompleteParams.sessiontoken = sessionToken;
    }

    const url = buildUrl("place/autocomplete/json", autocompleteParams);
    const response = await fetch(url);
    const data: GoogleAutocompleteResponse = await response.json();
    normalizeGoogleStatus(data.status, data.error_message);

    if (data.status === "ZERO_RESULTS") {
      return [];
    }

    return data.predictions.map((prediction) => ({
      id: prediction.place_id,
      placeId: prediction.place_id,
      description: prediction.description,
      secondaryText: prediction.structured_formatting?.secondary_text,
    }));
  },

  async getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetailsResult> {
    if (!placeId) {
      throw new Error("Thiếu placeId để truy vấn chi tiết địa điểm");
    }

    ensureApiKey();

    const detailsParams: Record<string, string | number> = {
      place_id: placeId,
      language: "vi",
      fields: "formatted_address,geometry/location",
    };

    if (sessionToken) {
      detailsParams.sessiontoken = sessionToken;
    }

    const url = buildUrl("place/details/json", detailsParams);
    const response = await fetch(url);
    const data: GooglePlaceDetailsResponse = await response.json();
    normalizeGoogleStatus(data.status, data.error_message);

    const address = data.result?.formatted_address;
    const lat = data.result?.geometry?.location?.lat;
    const lng = data.result?.geometry?.location?.lng;

    if (!address || typeof lat !== "number" || typeof lng !== "number") {
      throw new Error("Không thể lấy thông tin vị trí từ Google Maps");
    }

    return {
      address,
      latitude: lat,
      longitude: lng,
    };
  },

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    ensureApiKey();

    const url = buildUrl("geocode/json", {
      latlng: `${latitude},${longitude}`,
      language: "vi",
    });

    const response = await fetch(url);
    const data: GoogleGeocodeResponse = await response.json();
    normalizeGoogleStatus(data.status, data.error_message);

    const address = data.results?.[0]?.formatted_address;
    if (!address) {
      throw new Error("Không tìm thấy địa chỉ cho vị trí này");
    }

    return address;
  },

  async geocodeAddress(address: string): Promise<PlaceDetailsResult> {
    if (!address || !address.trim()) {
      throw new Error("Thiếu địa chỉ để truy vấn vị trí");
    }

    ensureApiKey();

    const url = buildUrl("geocode/json", {
      address,
      language: "vi",
    });

    const response = await fetch(url);
    const data: GoogleGeocodeResponse = await response.json();
    normalizeGoogleStatus(data.status, data.error_message);

    const firstResult = data.results?.[0];
    const lat = firstResult?.geometry?.location?.lat;
    const lng = firstResult?.geometry?.location?.lng;

    if (typeof lat !== "number" || typeof lng !== "number") {
      throw new Error("Không thể lấy toạ độ từ địa chỉ này");
    }

    return {
      address: firstResult?.formatted_address || address,
      latitude: lat,
      longitude: lng,
    };
  },

  async getDrivingDistanceKm(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): Promise<number | null> {
    ensureApiKey();

    const url = buildUrl("directions/json", {
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: "driving",
      units: "metric",
    });

    const response = await fetch(url);
    const data: GoogleDirectionsResponse = await response.json();
    normalizeGoogleStatus(data.status, data.error_message);

    if (data.status === "ZERO_RESULTS") {
      return null;
    }

    const distanceMeters = data.routes?.[0]?.legs?.[0]?.distance?.value;
    if (typeof distanceMeters !== "number") {
      throw new Error("Không đọc được quãng đường di chuyển từ Google Maps");
    }

    return distanceMeters / 1000;
  },
};
