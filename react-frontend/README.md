# FastFood React Frontend

This is the React TypeScript conversion of the FastFood application frontend, built with modern web technologies.

## 🛠 Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Router** for client-side routing
- **Lucide React** for icons

## 🚀 Features Converted

- ✅ Home page with featured categories
- ✅ Login page with authentication
- ✅ Menu page with category filtering
- ✅ Responsive navigation header
- ✅ API client with TypeScript types
- ✅ Authentication state management
- ✅ Cart count display

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   │   ├── button.tsx
│   │   └── card.tsx
│   └── Layout.tsx       # Main layout component
├── lib/
│   ├── api.ts          # API client and types
│   └── utils.ts        # Utility functions
├── pages/
│   ├── Home.tsx        # Home page
│   ├── Login.tsx       # Login page
│   └── Menu.tsx        # Menu page
├── App.tsx             # Main app with routing
└── main.tsx            # App entry point
```

## 🎨 Design System

The project uses a custom design system based on shadcn/ui with:
- **Primary Color**: Red (#ef4444) - matching the original FastFood branding
- **Typography**: Modern font stack with proper hierarchy
- **Components**: Consistent button, card, and form styles
- **Responsive**: Mobile-first design approach

## 🔧 Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## 🔗 API Integration

The application is configured to work with the existing FastFood backend API at `http://localhost:8000/api`. All original functionality including:

- User authentication (login/logout)
- Category and food item loading
- Cart management
- Order processing

## 🎯 Original vs React Comparison

| Feature | Original HTML/CSS/JS | React TypeScript |
|---------|---------------------|------------------|
| **Styling** | Custom CSS with CSS variables | Tailwind CSS with design tokens |
| **Components** | HTML templates with inline scripts | Reusable React components |
| **State Management** | DOM manipulation + localStorage | React hooks + TypeScript |
| **Routing** | Multi-page HTML files | React Router SPA |
| **Type Safety** | None | Full TypeScript coverage |
| **Dev Experience** | Basic reload | Hot module replacement |

## 📱 Pages Converted

1. **Home** (`/`) - Landing page with hero section and featured categories
2. **Login** (`/login`) - Authentication form
3. **Menu** (`/menu`) - Category browser and food items
4. **Menu Items** (`/menu/items`) - Category-filtered food items

## 🔄 Still To Convert

Additional pages from the original application that can be converted:
- Registration page
- Shopping cart
- Checkout flow
- Order history
- User account settings
- Admin panel

## 🎨 Styling Notes

- Converted all CSS classes to Tailwind utilities
- Maintained the original color scheme and branding
- Improved responsive design with Tailwind's mobile-first approach
- Added consistent spacing and typography scale
- Enhanced hover and focus states
