import { API } from "../api";

export interface FoodDetail {
  id: number;
  title: string;
  description: string;
  price: string;
  image: string;
  image_url: string;
  category: {
    id: number;
    cate_name: string;
    image: string;
    image_url: string;
    foods_count: number;
  };
  store: {
    id: number;
    store_name: string;
    address: string;
  };
  availability: string;
  sizes: Array<{
    id: number;
    size_name: string;
    price: string;
  }>;
  average_rating: number;
  rating_count: number;
}

export interface FoodReview {
  id: number;
  user?: {
    id: number;
    fullname: string;
  } | null;
  food?: {
    id: number;
    title: string;
  } | null;
  order_id?: number;
  rating: number;
  comment?: string;
  created_date: string;
}

export class FoodService {
  // Lấy chi tiết món ăn
  static async getFoodDetail(foodId: number): Promise<FoodDetail> {
    try {
      const response = await API.get<FoodDetail>(`/menu/items/${foodId}/`);
      return response;
    } catch (error) {
      console.error("Error fetching food detail:", error);
      throw new Error("Không thể tải chi tiết món ăn");
    }
  }

  // Lấy reviews của món ăn
  static async getFoodReviews(foodId: number): Promise<FoodReview[]> {
    try {
      console.log("Fetching reviews for food ID:", foodId);
      const response = await API.get<FoodReview[]>(
        `/ratings/?food_id=${foodId}`
      );

      console.log("Raw reviews response:", response);

      // Xử lý trường hợp API trả về array trực tiếp hoặc wrapped trong object
      const rawReviews = Array.isArray(response) ? response : [];

      console.log("Raw reviews array:", rawReviews);

      // Validate và clean data - không override dữ liệu có sẵn
      const reviews = rawReviews.map(
        (review: Partial<FoodReview> & { id?: number }, index: number) => {
          console.log(`Processing review ${index}:`, review);
          return {
            id: review.id ?? index + 1, // Sử dụng nullish coalescing thay vì ||
            user: review.user ?? null,
            food: review.food ?? null,
            order_id: review.order_id ?? 0,
            rating: review.rating ?? 0,
            comment: review.comment ?? "",
            created_date: review.created_date ?? new Date().toISOString(),
          };
        }
      );

      console.log("Processed reviews:", reviews);
      return reviews;
    } catch (error) {
      console.error("Error fetching food reviews:", error);
      // Trả về mảng rỗng thay vì throw error để không làm crash modal
      return [];
    }
  } // Lấy chi tiết món ăn kèm reviews
  static async getFoodWithReviews(foodId: number): Promise<{
    food: FoodDetail;
    reviews: FoodReview[];
  }> {
    try {
      const [food, reviews] = await Promise.all([
        this.getFoodDetail(foodId),
        this.getFoodReviews(foodId),
      ]);

      return { food, reviews };
    } catch (error) {
      console.error("Error fetching food with reviews:", error);
      throw new Error("Không thể tải thông tin món ăn");
    }
  }
}
