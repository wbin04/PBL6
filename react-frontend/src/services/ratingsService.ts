import { makeRequest } from "./api";

// Interface for rating
export interface Rating {
  id: number;
  user?: {
    id: number;
    fullname: string;
  };
  food?: {
    id: number;
    title: string;
  };
  order_id?: number;
  rating: number;
  comment?: string;
  created_date?: string;
}

// Interface for creating a new rating
export interface CreateRatingRequest {
  food_id: number;
  order_id: number;
  rating: number;
  comment: string;
}

// Get ratings for a specific food item
export const getRatingsByFood = async (foodId: number): Promise<Rating[]> => {
  try {
    const result = await makeRequest(`/api/ratings/?food_id=${foodId}`);
    // Ensure we always return an array
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return [];
  }
};

// Get all ratings (with optional filters)
export const getRatings = async (params?: {
  food_id?: number;
  order_id?: number;
}): Promise<Rating[]> => {
  try {
    const query = new URLSearchParams();
    if (params?.food_id) query.append("food_id", params.food_id.toString());
    if (params?.order_id) query.append("order_id", params.order_id.toString());

    const queryString = query.toString();
    const result = await makeRequest(
      `/api/ratings/${queryString ? `?${queryString}` : ""}`
    );
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return [];
  }
};

// Create a new rating
export const createRating = async (
  rating: CreateRatingRequest
): Promise<Rating> => {
  return makeRequest("/api/ratings/", {
    method: "POST",
    body: JSON.stringify(rating),
  });
};

// Get rating detail by ID
export const getRatingDetail = async (id: number): Promise<Rating> => {
  return makeRequest(`/api/ratings/${id}/`);
};
