import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { authService } from '@/services';
import { AuthState, User, LoginRequest, RegisterRequest, AuthTokens } from '@/types';
import { STORAGE_KEYS } from '@/constants';

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      console.log('AuthSlice: Starting login with credentials:', { email: credentials.email });
      const response = await authService.login(credentials);
      console.log('AuthSlice: Login response received:', response);
      
      // Store tokens securely
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, response.access);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, response.refresh);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(response.user));
      
      console.log('AuthSlice: Tokens and user data stored successfully');
      return response;
    } catch (error: any) {
      console.error('AuthSlice: Login error:', error);
      // Handle different error types
      if (error.message) {
        return rejectWithValue(error.message);
      } else if (typeof error === 'string') {
        return rejectWithValue(error);
      } else {
        return rejectWithValue('Đã xảy ra lỗi không xác định');
      }
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      
      // Store tokens securely
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, response.access);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, response.refresh);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(response.user));
      
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadUserFromStorage = createAsyncThunk(
  'auth/loadUserFromStorage',
  async (_, { rejectWithValue }) => {
    try {
      const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      if (accessToken && refreshToken) {
        // Fetch fresh user data from API to include any new fields
        const user = await authService.getProfile();
        return {
          user,
          tokens: { access: accessToken, refresh: refreshToken },
        };
      }
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: Partial<User>, { rejectWithValue }) => {
    try {
      const updatedUser = await authService.updateProfile(userData);
      
      // Update stored user data
      await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    // Clear stored data
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.tokens = {
          access: action.payload.access,
          refresh: action.payload.refresh,
        };
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.tokens = {
          access: action.payload.access,
          refresh: action.payload.refresh,
        };
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      
      // Load user from storage
      .addCase(loadUserFromStorage.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.tokens = action.payload.tokens;
          state.isAuthenticated = true;
        }
      })
      
      // Update profile: keep loading flag unaffected to avoid unmounting navigators
      .addCase(updateProfile.pending, (state) => {
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { clearError, setTokens } = authSlice.actions;
export default authSlice.reducer;

