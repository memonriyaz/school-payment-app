# School Payment Dashboard Frontend

React-based frontend application for the School Payment Dashboard system.

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
echo "VITE_API_URL=http://localhost:3000/api" > .env

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔧 Environment Configuration

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000/api
```

## 🎯 Features

### Pages

- **All Transactions**: Paginated table with filtering and sorting
- **Transactions by School**: School-specific transaction views
- **Transaction Status Check**: Check status by custom order ID
- **Authentication**: Login/logout functionality

### Key Components

- Responsive dashboard layout with navigation
- Modern UI with TailwindCSS styling
- Real-time data fetching with Axios
- TypeScript for type safety
- Error handling and loading states

## 🛠️ Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check
```

## 📱 Responsive Design

The application is fully responsive and works on:

- Desktop computers
- Tablets
- Mobile devices

## 🔐 Authentication

The app uses JWT tokens for authentication:

- Login page with form validation
- Automatic token management
- Protected routes with authentication guards
- Automatic logout on token expiration

## 🎨 UI Components

Built with modern design principles:

- Clean and intuitive interface
- Hover effects and transitions
- Loading indicators
- Error messages and validation
- Responsive tables and forms

## 📊 Data Management

- Efficient API calls with Axios interceptors
- Automatic token attachment
- Error handling and retry logic
- Pagination and filtering support
- Real-time data updates

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Netlify/Vercel

1. Connect your repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables

## 🔧 Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React hooks
- **Type Safety**: TypeScript

Built for the EDVIRON Software Developer Assessment.
