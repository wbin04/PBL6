import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storesService } from '@/services';
import { Store } from '@/types';

// Store State Interface
export interface StoresState {
  stores: Store[];
  currentStore: Store | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: StoresState = {
  stores: [],
  currentStore: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchStores = createAsyncThunk(
  'stores/fetchStores',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching stores from API...');
      return await storesService.getStores();
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchStoresWithStats = createAsyncThunk(
  'stores/fetchStoresWithStats',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching stores with stats from API...');
      const stores = await storesService.getStores();
      
      // Fetch stats for each store
      const storesWithStats = await Promise.all(
        stores.map(async (store) => {
          try {
            const stats = await storesService.getStoreStats(store.id);
            return {
              ...store,
              average_rating: stats.average_rating,
              total_ratings: stats.total_ratings,
              total_foods: stats.total_foods,
              total_orders: stats.total_orders,
            };
          } catch (error) {
            console.error(`Error fetching stats for store ${store.id}:`, error);
            // Return store without stats if error
            return store;
          }
        })
      );
      
      console.log('Stores with stats fetched successfully:', storesWithStats.length);
      return storesWithStats;
    } catch (error: any) {
      console.error('Error fetching stores with stats:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchStoreDetail = createAsyncThunk(
  'stores/fetchStoreDetail',
  async (storeId: number, { rejectWithValue }) => {
    try {
      return await storesService.getStoreDetail(storeId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const storesSlice = createSlice({
  name: 'stores',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentStore: (state, action) => {
      state.currentStore = action.payload;
    },
    clearStores: (state) => {
      state.stores = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch stores
      .addCase(fetchStores.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStores.fulfilled, (state, action) => {
        state.loading = false;
        state.stores = action.payload;
        state.error = null;
        console.log('Stores fetched successfully:', action.payload.length);
      })
      .addCase(fetchStores.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error('Failed to fetch stores:', action.payload);
      })
      
      // Fetch stores with stats
      .addCase(fetchStoresWithStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStoresWithStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stores = action.payload;
        state.error = null;
        console.log('Stores with stats fetched successfully:', action.payload.length);
      })
      .addCase(fetchStoresWithStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error('Failed to fetch stores with stats:', action.payload);
      })
      
      // Fetch store detail
      .addCase(fetchStoreDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStoreDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStore = action.payload;
        state.error = null;
      })
      .addCase(fetchStoreDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentStore, clearStores } = storesSlice.actions;
export default storesSlice.reducer;