# 🎓 School Payment System

A modern, full-stack payment management system for educational institutions built with **NestJS** (backend) and **React + TypeScript** (frontend). Features seamless EDVIRON payment gateway integration with real-time transaction tracking, automated payment lifecycle management, and comprehensive analytics.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)

## 🌟 Features

### 💳 Payment Processing
- **EDVIRON Gateway Integration**: Secure payment processing with JWT-based API authentication
- **Real-time Transaction Tracking**: Live status updates with comprehensive payment lifecycle management
- **Multiple Payment Status Classifications**: PENDING, SUCCESS, FAILED, CANCELLED with intelligent status mapping
- **Automated Payment Callbacks**: Seamless webhook handling for payment status updates

### 🔐 Security & Authentication
- **JWT-based Authentication**: Secure user sessions with configurable token expiration
- **Password Encryption**: bcryptjs hashing with salt rounds
- **Data Isolation**: User-specific transaction filtering ensures privacy
- **Input Validation**: Comprehensive validation using class-validator and DTOs

### 📊 Dashboard & Analytics
- **Transaction Overview**: Complete payment history with advanced filtering
- **School-wise Reports**: Detailed transaction analytics per educational institution
- **Payment Status Tracking**: Real-time status monitoring with visual indicators
- **Responsive Design**: Mobile-first design with Tailwind CSS

### ⚙️ Automated Management
- **Scheduled Payment Cleanup**: Automated cancellation of abandoned payments
  - Every 10 minutes: Cancel payments pending for 30+ minutes
  - Daily at 2 AM: Clean up very old pending payments (24+ hours)
- **Transaction Status Classification**: Intelligent mapping of payment gateway statuses
- **Error Recovery**: Fallback mechanisms for payment status updates

## 🏗️ Architecture

```
school-payment-app/
├── backend/                 # NestJS Backend API
│   ├── src/
│   │   ├── auth/           # Authentication module (JWT, guards, strategies)
│   │   ├── payments/       # Payment processing & transaction management
│   │   │   ├── payments.service.ts        # EDVIRON gateway integration
│   │   │   ├── transactions.service.ts    # Transaction CRUD & analytics
│   │   │   ├── payment-scheduler.service.ts # Automated cleanup
│   │   │   └── payments.controller.ts     # Payment endpoints
│   │   ├── schemas/        # MongoDB schemas & models
│   │   │   ├── user.schema.ts             # User authentication
│   │   │   ├── order.schema.ts            # Payment orders
│   │   │   ├── order-status.schema.ts     # Transaction status
│   │   │   └── webhook-logs.schema.ts     # Webhook audit trail
│   │   └── main.ts         # Application bootstrap
│   ├── package.json        # Backend dependencies
│   └── nest-cli.json       # NestJS configuration
├── frontend/               # React TypeScript Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── Layout.tsx  # Main application layout
│   │   ├── contexts/       # React context providers
│   │   │   └── AuthContext.tsx # Authentication state management
│   │   ├── pages/          # Application pages/routes
│   │   │   ├── Home.tsx                    # Dashboard homepage
│   │   │   ├── Login.tsx & Register.tsx    # Authentication
│   │   │   ├── MakePayment.tsx            # Payment creation
│   │   │   ├── TransactionsOverview.tsx   # Transaction analytics
│   │   │   ├── TransactionsBySchool.tsx   # School-specific reports
│   │   │   └── TransactionStatusCheck.tsx # Payment status lookup
│   │   ├── services/       # API service layer
│   │   │   └── api.ts      # Axios HTTP client with interceptors
│   │   ├── types/          # TypeScript type definitions
│   │   └── App.tsx         # Root component with routing
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.ts      # Vite configuration
│   └── tailwind.config.js  # Tailwind CSS configuration
└── README.md               # This documentation
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MongoDB** database (local or MongoDB Atlas)
- **EDVIRON API** credentials (API key & PG secret)
- **Git** for version control

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd school-payment-app
   ```

2. **Setup Backend:**

   ```bash
   cd backend
   npm install
   
   # Configure environment variables
   cp .env.example .env
   # Edit .env with your MongoDB URI, JWT secret, and EDVIRON credentials
   
   # Start development server
   npm run start:dev
   ```

3. **Setup Frontend:**

   ```bash
   cd ../frontend
   npm install
   
   # Configure environment variables
   echo "VITE_API_URL=http://localhost:3000/api" > .env
   
   # Start development server
   npm run dev
   ```

4. **Access the application:**
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3000/api
   - **API Documentation**: Available via NestJS built-in endpoints

## ⚙️ Configuration

### Backend Environment Variables (`.env`)

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/school-payment-db
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/school-payment-db

# JWT Authentication
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=24h

# EDVIRON Payment Gateway
API_KEY=your-edviron-api-key
PG_SECRET=your-edviron-pg-secret-key
PAYMENT_GATEWAY_URL=https://api.edviron.com
CALLBACK_URL=http://localhost:3000/api/payment-callback

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Optional: Enable detailed logging
LOG_LEVEL=debug
```

### Frontend Environment Variables (`.env`)

```env
# Backend API Configuration
VITE_API_URL=http://localhost:3000/api

# Optional: Environment-specific settings
VITE_APP_TITLE="School Payment System"
VITE_PAYMENT_TIMEOUT=300000
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | User authentication | ❌ |

**Registration Request:**
```json
{
  "email": "user@school.edu",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Login Request:**
```json
{
  "email": "user@school.edu",
  "password": "securePassword123"
}
```

### Payment Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `POST` | `/api/create-payment` | Create new payment request | ✅ |
| `POST` | `/api/webhook` | EDVIRON webhook handler | ❌ |
| `GET` | `/api/payment-callback` | EDVIRON callback handler | ❌ |
| `GET` | `/api/payment-status/:collectRequestId` | Check payment status | ✅ |

**Create Payment Request:**
```json
{
  "school_id": "65b0e6293e9f76a9694d84b4",
  "student_info": {
    "name": "Jane Smith",
    "id": "STU123456",
    "email": "jane.smith@student.school.edu"
  },
  "amount": 1500.00,
  "description": "Semester fee payment",
  "gateway_name": "edviron"
}
```

### Transaction Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `GET` | `/api/transactions` | Get user transactions with filtering | ✅ |
| `GET` | `/api/transactions/school/:schoolId` | Get school-specific transactions | ✅ |
| `GET` | `/api/transaction-status/:customOrderId` | Get specific transaction status | ✅ |

**Transaction Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10)
- `sort`: Sort field (default: 'createdAt')
- `order`: Sort order 'asc'/'desc' (default: 'desc')
- `status`: Filter by status (PENDING/SUCCESS/FAILED/CANCELLED)
- `school_id`: Filter by school
- `gateway`: Filter by payment gateway

### Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `POST` | `/api/cancel-abandoned-payments` | Cancel old pending payments | ✅ |
| `POST` | `/api/cancel-payment/:customOrderId` | Cancel specific payment | ✅ |
| `POST` | `/api/trigger-scheduler` | Manually trigger payment cleanup | ✅ |

## 🔄 Payment Status Flow

```mermaid
graph TD
    A[Payment Initiated] --> B[PENDING]
    B --> C{User Action}
    C -->|Completes Payment| D[SUCCESS]
    C -->|Payment Fails| E[FAILED]
    C -->|Abandons Payment| F[CANCELLED]
    B -->|30+ minutes| G[Auto-Cancel to CANCELLED]
    B -->|24+ hours| H[Scheduled Cleanup to CANCELLED]
```

### Status Definitions

- **PENDING**: Payment request created, awaiting user action
- **SUCCESS**: Payment completed successfully by user
- **FAILED**: Payment attempted but failed (technical error, insufficient funds, etc.)
- **CANCELLED**: Payment abandoned or automatically cancelled due to timeout

## 🛠️ Development

### Backend Development

```bash
cd backend

# Development with hot reload
npm run start:dev

# Debug mode
npm run start:debug

# Run tests
npm run test
npm run test:watch
npm run test:e2e

# Linting and formatting
npm run lint
npm run format

# Production build
npm run build
npm run start:prod
```

### Frontend Development

```bash
cd frontend

# Development server
npm run dev

# Type checking
npm run build

# Linting
npm run lint

# Production build
npm run build
npm run preview
```

### Database Scripts

The project includes utility scripts in the backend directory:

- `check-recent-payments.js`: Analyze recent payment patterns
- `manual-update-status.js`: Manually update payment statuses
- `fix-payment-details-schema.js`: Database migration utility

## 🚀 Production Deployment

### Environment Setup

```env
# Production Backend (.env)
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/school-payment-db
JWT_SECRET=your-production-jwt-secret-64-characters-minimum
API_KEY=your-production-edviron-api-key
PG_SECRET=your-production-edviron-pg-secret
PAYMENT_GATEWAY_URL=https://api.edviron.com
CALLBACK_URL=https://yourdomain.com/api/payment-callback
FRONTEND_URL=https://yourfrontend.com
PORT=3000
```

```env
# Production Frontend (.env.production)
VITE_API_URL=https://yourdomain.com/api
VITE_APP_TITLE="School Payment System"
```

### Build Commands

```bash
# Backend production build
cd backend
npm ci --only=production
npm run build

# Frontend production build
cd frontend
npm ci
npm run build
```

### Docker Deployment (Optional)

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/main"]
```

## 🔐 Security Best Practices

- **Environment Variables**: Never commit `.env` files to version control
- **JWT Secrets**: Use cryptographically strong secrets (64+ characters)
- **Database Access**: Use connection strings with authentication
- **HTTPS**: Always use HTTPS in production environments
- **Input Validation**: All endpoints include comprehensive validation
- **Error Handling**: Sensitive information is never exposed in error messages

## 🛡️ Error Handling & Monitoring

### Error Types Handled

- **Authentication Errors**: Invalid credentials, expired tokens
- **Validation Errors**: Invalid input data, missing required fields
- **Database Errors**: Connection failures, constraint violations
- **Payment Gateway Errors**: API timeouts, invalid responses
- **Network Errors**: Request timeouts, connection failures

### Monitoring Features

- **Webhook Logging**: All payment callbacks are logged with timestamps
- **Transaction Audit Trail**: Complete history of status changes
- **Error Logging**: Comprehensive error tracking with stack traces
- **Payment Analytics**: Detailed reporting on payment success rates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style Guidelines

- **Backend**: Follow NestJS conventions, use TypeScript strict mode
- **Frontend**: Use React functional components with hooks, follow React best practices
- **Formatting**: Use Prettier for consistent code formatting
- **Linting**: Use ESLint with TypeScript support
- **Testing**: Write unit tests for business logic, integration tests for API endpoints

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. **Documentation**: Check this README and inline code comments
2. **Issues**: Create a GitHub issue with detailed description
3. **API Issues**: Check EDVIRON API documentation and credentials
4. **Database Issues**: Verify MongoDB connection and permissions

---

**Built with ❤️ for educational institutions**
