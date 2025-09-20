import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import menuSlice from './slices/menuSlice';
import cartSlice from './slices/cartSlice';
import ordersSlice from './slices/ordersSlice';
import storesSlice from './slices/storesSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    menu: menuSlice,
    cart: cartSlice,
    orders: ordersSlice,
    stores: storesSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

