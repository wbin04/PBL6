import { apiClient } from './api';
import { FoodRating } from '@/types';

export interface RatingParams {
  food?: number;
  order?: number;
}

class RatingService {
  private baseURL = '/ratings';

  async getRatingsForFood(foodId: number): Promise<FoodRating[]> {
    try {
      const response = await apiClient.get<FoodRating[]>(`${this.baseURL}/`, {
        params: { food: foodId }
      });
      return response;
    } catch (error) {
      console.error('Error fetching ratings for food:', error);
      throw error;
    }
  }

  async getRatingsForOrder(orderId: number): Promise<FoodRating[]> {
    try {
      const response = await apiClient.get<FoodRating[]>(`${this.baseURL}/`, {
        params: { order: orderId }
      });
      return response;
    } catch (error) {
      console.error('Error fetching ratings for order:', error);
      throw error;
    }
  }

  async getAllRatings(): Promise<FoodRating[]> {
    try {
      const response = await apiClient.get<FoodRating[]>(`${this.baseURL}/`);
      return response;
    } catch (error) {
      console.error('Error fetching all ratings:', error);
      throw error;
    }
  }

  async createRating(data: {
    food: number;
    order: number;
    rating: number;
    content: string;
  }): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseURL}/`, data);
      return response;
    } catch (error) {
      console.error('Error creating rating:', error);
      throw error;
    }
  }
}

export const ratingService = new RatingService();

