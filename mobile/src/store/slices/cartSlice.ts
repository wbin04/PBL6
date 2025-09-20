import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartService } from '@/services';
import { CartState, Cart, AddToCartRequest } from '@/types';

// Initial state
const initialState: CartState = {
  cart: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      return await cartService.getCart();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async (item: AddToCartRequest, { rejectWithValue }) => {
    try {
      // Add item
      await cartService.addToCart(item);
      // Fetch full cart to sync state
      const updatedCart = await cartService.getCart();
      return updatedCart;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
  async (
    { itemId, quantity }: { itemId: number; quantity: number },
    { rejectWithValue, dispatch }
  ) => {
    try {
      console.log('updateCartItem called with:', { itemId, quantity });
      
      // First get the cart to find the food_id for this item
      const currentCart = await cartService.getCart();
      console.log('Current cart items:', currentCart.items?.length);
      
      const item = currentCart.items?.find(item => item.id === itemId);
      if (!item) {
        console.error('Item not found in cart:', itemId);
        throw new Error('Item not found in cart');
      }
      
      console.log('Found item:', { id: item.id, foodId: item.food.id, currentQuantity: item.quantity });
      
      // Update item with correct data format using food_id
      const updateResult = await cartService.updateCartItem(item.food.id, { quantity });
      console.log('Update API result:', updateResult);
      
      // Refetch full cart to sync state
      const updatedCart = await cartService.getCart();
      console.log('Updated cart total items:', updatedCart.items?.length);
      
      return updatedCart;
    } catch (error: any) {
      console.error('updateCartItem error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (itemId: number, { rejectWithValue, dispatch }) => {
    try {
      // First get the cart to find the food_id for this item
      const currentCart = await cartService.getCart();
      const item = currentCart.items?.find(item => item.id === itemId);
      if (!item) {
        throw new Error('Item not found in cart');
      }
      
      await cartService.removeFromCart(item.food.id);
      // Fetch updated cart after removal
      dispatch(fetchCart());
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      await cartService.clearCart();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetCart: (state) => {
      state.cart = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch cart
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Add to cart
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update cart item
      .addCase(updateCartItem.pending, (state) => {
        console.log('updateCartItem.pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        console.log('updateCartItem.fulfilled', action.payload);
        state.loading = false;
  // Replace cart with updated payload to ensure accurate updates
  state.cart = action.payload;
        state.error = null;
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        console.log('updateCartItem.rejected', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Remove from cart
      .addCase(removeFromCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFromCart.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Clear cart
      .addCase(clearCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.loading = false;
        state.cart = null;
        state.error = null;
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, resetCart } = cartSlice.actions;
export default cartSlice.reducer;

