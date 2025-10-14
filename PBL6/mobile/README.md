# FastFood Mobile App

Ứng dụng di động cho hệ thống đặt món ăn nhanh FastFood, được xây dựng bằng React Native và Expo.

## 🚀 Tính năng

### Đã hoàn thành
- ✅ Cấu trúc dự án với TypeScript
- ✅ Redux Toolkit store với các slice chính
- ✅ API client với axios và interceptors
- ✅ Authentication service với JWT
- ✅ Các component cơ bản (Button, FoodCard, CategoryCard)
- ✅ Navigation setup với React Navigation
- ✅ Constants và types definition
- ✅ Home screen và Login screen cơ bản

### Đang phát triển
- ⏳ Menu screen và Food detail screen
- ⏳ Cart và Checkout screens
- ⏳ Orders và Profile screens
- ⏳ Register và Forgot password screens
- ⏳ Push notifications
- ⏳ Offline support
- ⏳ Image caching
- ⏳ Error boundaries

## 📋 Yêu cầu hệ thống

- **Node.js:** 16.x trở lên
- **Expo CLI:** Latest version
- **React Native:** 0.72.x
- **TypeScript:** 5.x

## 🛠️ Cài đặt

### 1. Cài đặt dependencies
```bash
cd mobile
npm install
```

### 2. Cài đặt Expo CLI (nếu chưa có)
```bash
# Cài đặt Expo CLI local (recommended)
npm install expo --save-dev

# Sử dụng CLI qua npx:
npx expo <command>
```

### 2a. Thêm assets

Tạo thư mục `assets/` trong thư mục `mobile/` và thêm các file hình sau:
- `icon.png`
- `splash.png`
- `adaptive-icon.png`
- `favicon.png`

Bạn có thể sử dụng các hình mẫu trong `backend/media/assets` hoặc tự chuẩn bị các file PNG phù hợp.

### 3. Cấu hình API endpoint
Cập nhật `API_BASE_URL` trong `src/constants/index.ts`:
```typescript
export const API_CONFIG = {
  BASE_URL: 'http://YOUR_API_SERVER:8000/api', // Thay đổi địa chỉ server
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};
```

### 4. Chạy ứng dụng

#### Development với Expo
```bash
# Khởi động Expo development server
npx expo start

# Chạy trên Android
npm run android

# Chạy trên iOS
npm run ios

# Chạy trên web
npm run web
```

#### Production build
```bash
# Build cho Android
npm run build:android

# Build cho iOS
npm run build:ios
```

## 📱 Cấu trúc dự án

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── FoodCard.tsx
│   │   ├── CategoryCard.tsx
│   │   └── index.ts
│   ├── constants/           # App constants và configuration
│   │   └── index.ts
│   ├── screens/            # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── index.ts
│   ├── services/           # API services
│   │   ├── api.ts          # HTTP client
│   │   └── index.ts        # Service exports
│   ├── store/              # Redux store
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── menuSlice.ts
│   │       ├── cartSlice.ts
│   │       └── ordersSlice.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   └── utils/              # Utility functions
├── assets/                 # Static assets (images, fonts, etc.)
├── App.tsx                 # Main app component
├── app.json               # Expo configuration
├── package.json
├── tsconfig.json
└── babel.config.js
```

## 🔧 Cấu hình

### API Configuration
File: `src/constants/index.ts`
```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};
```

### Colors & Theme
```typescript
export const COLORS = {
  primary: '#FF6B35',
  secondary: '#FFA726',
  success: '#4CAF50',
  error: '#F44336',
  // ... more colors
};
```

### Navigation Types
```typescript
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  FoodDetail: { foodId: number };
  // ... more routes
};
```

## 🔐 Authentication

Ứng dụng sử dụng JWT authentication với:
- Access token (60 phút)
- Refresh token (7 ngày)
- Automatic token refresh
- Secure storage với Expo SecureStore

### Login Flow
1. User nhập email/password
2. App gọi `/api/auth/login/`
3. Server trả về access & refresh tokens
4. Tokens được lưu trong SecureStore
5. API client tự động thêm Bearer token vào headers

## 📡 API Integration

### Services Available
- `authService`: Login, register, profile management
- `menuService`: Categories, foods, food details
- `cartService`: Cart operations (add, update, remove)
- `ordersService`: Order creation and management
- `promotionsService`: Promo codes validation
- `ratingsService`: Food ratings and reviews

### Example Usage
```typescript
// In a component
import { useDispatch } from 'react-redux';
import { login } from '@/store/slices/authSlice';

const dispatch = useDispatch();

const handleLogin = async () => {
  try {
    await dispatch(login({ email, password })).unwrap();
    // Navigate to main app
  } catch (error) {
    // Handle error
  }
};
```

## 🎨 UI Components

### Button Component
```typescript
<Button
  title="Đăng nhập"
  onPress={handleLogin}
  variant="primary"
  size="large"
  fullWidth
  loading={isLoading}
/>
```

### FoodCard Component
```typescript
<FoodCard
  food={foodItem}
  onPress={() => navigateToDetail(foodItem.id)}
  onAddToCart={() => addToCart(foodItem.id)}
/>
```

## 📱 Screens

### Đã triển khai
- **HomeScreen**: Hiển thị categories và popular foods
- **LoginScreen**: Form đăng nhập với validation

### Cần triển khai
- **RegisterScreen**: Đăng ký tài khoản mới
- **MenuScreen**: Danh sách món ăn theo category
- **FoodDetailScreen**: Chi tiết món ăn với reviews
- **CartScreen**: Giỏ hàng và checkout
- **OrdersScreen**: Danh sách đơn hàng
- **ProfileScreen**: Thông tin cá nhân

## 🔄 State Management

Sử dụng Redux Toolkit với các slice:

### Auth Slice
- User authentication state
- Login/logout actions
- Profile management

### Menu Slice
- Categories và foods data
- Loading states
- Error handling

### Cart Slice
- Cart items management
- Add/update/remove operations
- Total calculations

### Orders Slice
- Order history
- Order creation
- Status tracking

## 🛡️ Error Handling

- Network errors với retry logic
- Token expiration với automatic refresh
- Form validation
- User-friendly error messages
- Global error boundaries (cần triển khai)

## 📊 Performance

### Optimization strategies
- Image lazy loading
- FlatList cho large datasets
- Redux state normalization
- Memoized selectors
- Component memoization với React.memo

### Cần triển khai
- Image caching
- Offline support
- Background sync
- Performance monitoring

## 🧪 Testing

### Setup cần thiết
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react-native jest
```

### Test structure
```
src/
├── __tests__/
│   ├── components/
│   ├── screens/
│   ├── services/
│   └── store/
```

## 📦 Build & Deployment

### Development
```bash
# Start Expo dev server
expo start

# Run on device/simulator
expo start --ios
expo start --android
```

### Production
```bash
# Build standalone app
expo build:android
expo build:ios

# Or with EAS Build
eas build --platform android
eas build --platform ios
```

## 🐛 Troubleshooting

### Common Issues

#### Metro bundler issues
```bash
# Clear cache
expo start -c
npx react-native start --reset-cache
```

#### iOS simulator issues
```bash
# Reset simulator
xcrun simctl erase all
```

#### Android build issues
```bash
# Clean gradle
cd android && ./gradlew clean
```

#### Dependencies issues
```bash
# Clear node_modules
rm -rf node_modules
npm install
```

### API Connection Issues
1. Kiểm tra `API_BASE_URL` trong constants
2. Đảm bảo backend server đang chạy
3. Kiểm tra CORS settings trong Django
4. Test API endpoints với Postman

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Native Paper](https://reactnativepaper.com/)

## 🤝 Contributing

1. Tạo feature branch từ `main`
2. Implement feature với tests
3. Update documentation
4. Create pull request
5. Code review & merge

## 📄 License

This project is private and confidential.

---

**Happy Coding! 🚀**

Để chạy ứng dụng lần đầu:
```bash
cd mobile
npm install
expo start
```
