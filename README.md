# School Payment System

A comprehensive payment management system for schools built with NestJS (backend) and React (frontend). Features EDVIRON payment gateway integration with real-time transaction tracking and automated payment lifecycle management.

## 🚀 Features

- **Payment Gateway Integration**: EDVIRON payment processing with JWT-based security
- **Real-time Transaction Tracking**: Live status updates and comprehensive reporting
- **Automated Payment Lifecycle**: Smart payment status classification and scheduled cleanup
- **Authentication System**: JWT-based secure authentication
- **Responsive Dashboard**: Modern React frontend with transaction analytics
- **School-wise Reporting**: Detailed transaction reports per school

## 🏗️ Architecture

```
school-payment-app/
├── backend/               # NestJS Backend API
│   ├── src/
│   │   ├── auth/         # Authentication module
│   │   ├── payments/     # Payment processing & scheduling
│   │   ├── schemas/      # MongoDB schemas
│   │   └── main.ts       # Application entry point
│   └── package.json
├── frontend/             # React Frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React context providers
│   │   ├── pages/        # Application pages
│   │   └── services/     # API service layer
│   └── package.json
└── README.md
```

## 🛠️ Quick Start

### Prerequisites

- Node.js 16+
- MongoDB Atlas account
- EDVIRON API credentials

### Installation

1. **Clone and setup backend:**

   ```bash
   cd backend
   npm install

   # Configure environment
   cp .env.example .env
   # Edit .env with your credentials

   # Start server
   npm run build
   npm run start:prod
   ```

2. **Setup frontend:**

   ```bash
   cd frontend
   npm install

   # Configure environment
   echo "VITE_API_URL=http://localhost:3000/api" > .env

   # Build and serve
   npm run build
   npm run preview
   ```

## 🔧 Configuration

### Backend Environment Variables (.env)

```env
# Database
MONGODB_URI=mongodb://localhost:27017/school-payment-db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=24h

# EDVIRON Payment Gateway
API_KEY=your-edviron-api-key
PG_SECRET=your-edviron-pg-secret
PAYMENT_GATEWAY_URL=https://api.edviron.com/
CALLBACK_URL=http://localhost:3000/api/payment-callback

# Server
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables (.env)

```env
VITE_API_URL=http://localhost:3000/api
```

## 📚 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Payments

- `POST /api/create-payment` - Create payment request
- `POST /api/webhook` - EDVIRON webhook handler
- `GET /api/payment-callback` - EDVIRON callback handler

### Transactions

- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/school/:schoolId` - Get school transactions
- `GET /api/transaction-status/:customOrderId` - Get payment status

### Management

- `POST /api/cancel-abandoned-payments` - Cancel old pending payments
- `POST /api/cancel-payment/:customOrderId` - Cancel specific payment

## 🔄 Payment Status Logic

- **PENDING**: Payment initiated but not completed
- **SUCCESS**: Payment completed successfully
- **FAILED**: Payment attempted but failed (user reached payment page)
- **CANCELLED**: Payment abandoned (user never completed payment process)

### Automated Cleanup

- **Every 10 minutes**: Cancel payments pending for 30+ minutes
- **Daily at 2 AM**: Clean up very old pending payments (24+ hours)

## 🚀 Deployment

### Production Environment Setup

```env
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db/school-payment-db
JWT_SECRET=your-production-jwt-secret
API_KEY=your-production-edviron-api-key
PG_SECRET=your-production-edviron-pg-secret
CALLBACK_URL=https://your-domain.com/api/payment-callback
FRONTEND_URL=https://your-frontend-domain.com
```

### Build Commands

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

## 🔐 Security Features

- JWT Authentication with configurable expiration
- Password hashing with bcryptjs
- Input validation using class-validator
- Environment-based configuration
- CORS protection
- Comprehensive error handling

## 🛡️ Error Handling

The system includes comprehensive error handling:

- API validation errors
- Database connection errors
- Payment gateway timeouts
- Authentication failures
- Graceful fallbacks for failed operations
