import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { menuService } from '@/services';
import { MenuState, Category, Food, PaginatedResponse } from '@/types';

// Initial state
const initialState: MenuState = {
  categories: [],
  foods: [],
  currentCategory: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchCategories = createAsyncThunk(
  'menu/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await menuService.getCategories();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchFoods = createAsyncThunk(
  'menu/fetchFoods',
  async ({ page = 1, category }: { page?: number; category?: number }, { rejectWithValue }) => {
    try {
      return await menuService.getFoods(page, category);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchFoodsByCategory = createAsyncThunk(
  'menu/fetchFoodsByCategory',
  async ({ categoryId, page = 1 }: { categoryId: number; page?: number }, { rejectWithValue }) => {
    try {
      return await menuService.getFoodsByCategory(categoryId, page);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentCategory: (state, action) => {
      state.currentCategory = action.payload;
    },
    clearFoods: (state) => {
      state.foods = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch foods
      .addCase(fetchFoods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFoods.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload as PaginatedResponse<Food>;
        // If it's the first page, replace foods, otherwise append
        if (action.meta.arg.page === 1) {
          state.foods = response.results;
        } else {
          state.foods = [...state.foods, ...response.results];
        }
        state.error = null;
      })
      .addCase(fetchFoods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch foods by category
      .addCase(fetchFoodsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFoodsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload as PaginatedResponse<Food>;
        // If it's the first page, replace foods, otherwise append
        if (action.meta.arg.page === 1) {
          state.foods = response.results;
        } else {
          state.foods = [...state.foods, ...response.results];
        }
        state.error = null;
      })
      .addCase(fetchFoodsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentCategory, clearFoods } = menuSlice.actions;
export default menuSlice.reducer;

