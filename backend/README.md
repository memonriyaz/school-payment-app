# School Payment Backend API

NestJS-based backend API for the School Payment Dashboard application.

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- MongoDB Atlas account
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Run in development mode
npm run start:dev

# Build for production
npm run build
npm run start:prod
```

## 🔧 Environment Configuration

Ensure your `.env` file contains:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://riyazmemon:dbuser123@cluster0.mongodb.net/school-payment-db?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=thisisjwtsecret
JWT_EXPIRES_IN=24h

# Payment Gateway Configuration
PAYMENT_GATEWAY_URL=https://dev-vanilla.edviron.com/erp/
PG_KEY=edvtest01
API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0cnVzdGVlSWQiOiI2NWIwZTU1MmRkMzE5NTBhOWI0MWM1YmEiLCJJbmRleE9mQXBpS2V5Ijo2fQ.IJWTYCOurGCFdRM2xyKtw6TEcuwXxGnmINrXFfsAdt0

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

## 🔗 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Payments

- `POST /api/create-payment` - Create payment request
- `POST /api/webhook` - Handle payment webhooks

### Transactions

- `GET /api/transactions` - Get all transactions with filters
- `GET /api/transactions/school/:schoolId` - Get school transactions
- `GET /api/transaction-status/:customOrderId` - Get transaction status

## 🛠️ Development

```bash
# Development with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run tests
npm run test
```

## 📊 Database Schemas

### Order Schema

- `school_id`, `trustee_id`, `student_info`, `gateway_name`, `custom_order_id`

### Order Status Schema

- `collect_id`, `order_amount`, `transaction_amount`, `status`, `payment_details`

### Webhook Logs Schema

- `payload`, `source`, `status`, `processed_at`, `error_message`

## 🔐 Authentication

All protected endpoints require Bearer token:

```
Authorization: Bearer <jwt-token>
```

Built with NestJS for the EDVIRON Assessment.
