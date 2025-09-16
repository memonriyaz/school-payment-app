import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      message: 'School Payment System API is working successfully! 🎓',
      status: 'active',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        authentication: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login'
        },
        payments: {
          create: 'POST /api/create-payment',
          status: 'GET /api/payment-status/:collectRequestId',
          webhook: 'POST /api/webhook',
          callback: 'GET /api/payment-callback'
        },
        transactions: {
          all: 'GET /api/transactions',
          bySchool: 'GET /api/transactions/school/:schoolId',
          checkStatus: 'GET /api/transaction-status/:customOrderId'
        }
      },
      documentation: 'Visit /api for detailed endpoint information'
    };
  }
}
