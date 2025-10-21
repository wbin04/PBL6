import { makeRequest } from "./api";

// Interface for detailed food item from API
export interface DetailedFood {
  id: number;
  title: string;
  description: string;
  price: string;
  image: string;
  image_url: string;
  category?: {
    id: number;
    cate_name: string;
    image: string;
    image_url: string;
    foods_count: number;
  };
  store?: {
    id: number;
    store_name: string;
    image?: string;
    description?: string;
    manager?: string;
  };
  availability: string;
  sizes?: Array<{
    id: number;
    size_name: string;
    price: string;
  }>;
  average_rating?: number;
  rating_count?: number;
}

// Interface for search results
export interface SearchFoodResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: DetailedFood[];
}

// Get detailed food item by ID
export const getFoodDetail = async (id: number): Promise<DetailedFood> => {
  try {
    const result = await makeRequest(`/api/menu/items/${id}/`);
    if (!result || typeof result !== "object") {
      throw new Error("Invalid food data received");
    }
    return result;
  } catch (error) {
    console.error("Error fetching food detail:", error);
    throw error; // Re-throw to let component handle the error
  }
};

// Search food items
export const searchFoodItems = async (
  searchQuery: string
): Promise<SearchFoodResult> => {
  try {
    const encodedQuery = encodeURIComponent(searchQuery);
    const result = await makeRequest(`/api/menu/items/?search=${encodedQuery}`);
    if (!result || typeof result !== "object") {
      throw new Error("Invalid search results received");
    }

    // Filter out invalid results and ensure data integrity
    const validResults = (result.results || []).filter((food: unknown) => {
      const f = food as Partial<DetailedFood>;
      return f && f.id && f.title && f.price && f.image_url;
    });

    return {
      ...result,
      results: validResults,
    };
  } catch (error) {
    console.error("Error searching food items:", error);
    throw error;
  }
};
