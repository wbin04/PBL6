import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ordersService } from '@/services';
import { OrderState, Order, CreateOrderRequest, PaginatedResponse } from '@/types';

// Initial state
const initialState: OrderState = {
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (page: number = 1, { rejectWithValue }) => {
    try {
      return await ordersService.getOrders(page);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData: CreateOrderRequest, { rejectWithValue }) => {
    try {
      return await ordersService.createOrder(orderData);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchOrderDetail = createAsyncThunk(
  'orders/fetchOrderDetail',
  async (orderId: number, { rejectWithValue }) => {
    try {
      return await ordersService.getOrderDetail(orderId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status }: { orderId: number; status: string }, { rejectWithValue }) => {
    try {
      return await ordersService.updateOrderStatus(orderId, status);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    clearOrders: (state) => {
      state.orders = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload as PaginatedResponse<Order>;
        // If it's the first page (arg undefined or 1), replace orders; otherwise, append
        if (action.meta.arg == null || action.meta.arg === 1) {
          state.orders = response.results;
        } else {
          state.orders = [...state.orders, ...response.results];
        }
        state.error = null;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create order
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
        // Add new order to the beginning of the list
        state.orders = [action.payload, ...state.orders];
        state.error = null;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch order detail
      .addCase(fetchOrderDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update order status
      .addCase(updateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        // Update the order in the list
        const updatedOrder = action.payload;
        const index = state.orders.findIndex(order => order.id === updatedOrder.id);
        if (index !== -1) {
          state.orders[index] = updatedOrder;
        }
        // Update current order if it's the same
        if (state.currentOrder && state.currentOrder.id === updatedOrder.id) {
          state.currentOrder = updatedOrder;
        }
        state.error = null;
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentOrder, clearOrders } = ordersSlice.actions;
export default ordersSlice.reducer;

