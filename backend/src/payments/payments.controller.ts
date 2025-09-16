import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Param,
  Query,
  BadRequestException,
  Headers,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { TransactionsService } from './transactions.service';
import { PaymentSchedulerService } from './payment-scheduler.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEmail,
  IsObject,
} from 'class-validator';

class StudentInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEmail()
  email: string;
}

class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  school_id: string;

  @IsString()
  @IsNotEmpty()
  trustee_id: string;

  @IsObject()
  student_info: StudentInfoDto;

  @IsNumber()
  amount: number;

  @IsString()
  gateway_name?: string;

  @IsString()
  description?: string;
}

@Controller()
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private transactionsService: TransactionsService,
    private paymentSchedulerService: PaymentSchedulerService,
  ) {}

  @Post('create-payment')
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: any,
  ) {
    const userId = req.user._id || req.user.id;
    
    const paymentData = {
      ...createPaymentDto,
      trustee_id: userId,
    };
    return this.paymentsService.createPayment(paymentData);
  }

  @Post('webhook')
  async handleWebhook(@Body() webhookData: any) {
    return this.paymentsService.handleWebhook(webhookData);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactions(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sort') sort: string = 'createdAt',
    @Query('order') order: string = 'desc',
    @Query('status') status?: string,
    @Query('school_id') schoolId?: string,
    @Query('gateway') gateway?: string,
  ) {
    const userId = req.user._id || req.user.id;
    
    return this.transactionsService.getTransactions({
      page: Number(page),
      limit: Number(limit),
      sort,
      order,
      status,
      schoolId,
      gateway,
      userId, // Add user filtering
    });
  }

  @Get('transactions/school/:schoolId')
  @UseGuards(JwtAuthGuard)
  async getTransactionsBySchool(
    @Param('schoolId') schoolId: string,
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user._id || req.user.id;
    return this.transactionsService.getTransactionsBySchool(schoolId, {
      page: Number(page),
      limit: Number(limit),
      userId, // Add user filtering
    });
  }

  @Get('transaction-status/:customOrderId')
  @UseGuards(JwtAuthGuard)
  async getTransactionStatus(
    @Param('customOrderId') customOrderId: string,
    @Req() req: any,
  ) {
    const userId = req.user._id || req.user.id;
    return this.transactionsService.getTransactionStatus(customOrderId, userId);
  }

  @Get('payment-status/:collectRequestId')
  @UseGuards(JwtAuthGuard)
  async checkPaymentStatus(
    @Param('collectRequestId') collectRequestId: string,
    @Query('school_id') schoolId: string,
  ) {
    if (!schoolId) {
      throw new BadRequestException('school_id is required');
    }
    return this.paymentsService.checkPaymentStatus(collectRequestId, schoolId);
  }

  @Post('cancel-abandoned-payments')
  @UseGuards(JwtAuthGuard)
  async cancelAbandonedPayments(
    @Query('timeout_minutes') timeoutMinutes: number = 30,
  ) {
    return this.paymentsService.cancelAbandonedPayments(Number(timeoutMinutes));
  }

  @Post('cancel-payment/:customOrderId')
  @UseGuards(JwtAuthGuard)
  async cancelPaymentByOrderId(
    @Param('customOrderId') customOrderId: string,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.cancelPaymentByOrderId(customOrderId, reason);
  }

  @Get('debug-pending-payments')
  @UseGuards(JwtAuthGuard)
  async debugPendingPayments(
    @Query('timeout_minutes') timeoutMinutes: number = 30,
  ) {
    return this.paymentsService.debugPendingPayments(Number(timeoutMinutes));
  }

  @Post('force-cancel-abandoned')
  @UseGuards(JwtAuthGuard)
  async forceCancelAbandoned(
    @Query('timeout_minutes') timeoutMinutes: number = 5,
  ) {
    return this.paymentsService.forceCancelAbandonedPayments(
      Number(timeoutMinutes),
    );
  }

  @Post('trigger-scheduler')
  @UseGuards(JwtAuthGuard)
  async triggerScheduler(
    @Query('timeout_minutes') timeoutMinutes: number = 30,
  ) {
    return this.paymentSchedulerService.triggerManualCleanup(
      Number(timeoutMinutes),
    );
  }

  @Get('payment-callback')
  async handlePaymentCallback(
    @Query('EdvironCollectRequestId') collectRequestId: string,
    @Query('status') status: string,
    @Query() allParams: any,
  ) {
    try {
      if (!collectRequestId) {
        throw new BadRequestException('EdvironCollectRequestId is required');
      }

      if (status === 'SUCCESS') {
        try {
          const order =
            await this.paymentsService.findOrderByCollectRequestId(
              collectRequestId,
            );
          let fallbackAmount = 0;

          if (order) {
            fallbackAmount = order.order_amount || 0;
          }

          const transactionAmount =
            parseFloat(allParams.amount) ||
            parseFloat(allParams.transaction_amount) ||
            parseFloat(allParams.order_amount) ||
            parseFloat(allParams.total_amount) ||
            fallbackAmount;

          await this.transactionsService.updateTransactionStatusByCollectId(
            collectRequestId,
            'SUCCESS',
            transactionAmount,
            {
              callback_received: true,
              callback_time: new Date().toISOString(),
              payment_details: {
                EdvironCollectRequestId: allParams.EdvironCollectRequestId,
                status: allParams.status,
                amount: allParams.amount,
                transaction_amount: allParams.transaction_amount,
                order_amount: allParams.order_amount,
                total_amount: allParams.total_amount,
                callback_timestamp: new Date().toISOString(),
                // Store all parameters for debugging
                all_callback_params: allParams,
              },
            },
          );
        } catch (updateError) {
          // Continue with success page even if update fails
        }

        // Redirect to dashboard with success status
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const successUrl = `${frontendUrl}/?message=Payment successful&collect_id=${collectRequestId}&status=success`;

        return `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Payment Successful</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: green; font-size: 24px; }
                .details { margin: 20px 0; padding: 20px; background: #f0f8f0; border-radius: 8px; }
              </style>
            </head>
            <body>
              <h1 class="success">✅ Payment Successful!</h1>
              <div class="details">
                <p><strong>Collection Request ID:</strong> ${collectRequestId}</p>
                <p><strong>Status:</strong> ${status}</p>
                <p>Your payment has been processed successfully.</p>
              </div>
              <p>Redirecting to application...</p>
              <script>
                setTimeout(() => {
                  window.location.href = '${successUrl}';
                }, 3000);
              </script>
            </body>
          </html>
        `;
      } else if (status === 'FAILED' || status === 'cancelled') {
        const order =
          await this.paymentsService.findOrderByCollectRequestId(
            collectRequestId,
          );
        const transactionAmount = 0;
        const finalStatus = 'FAILED';

        await this.transactionsService.updateTransactionStatusByCollectId(
          collectRequestId,
          finalStatus,
          transactionAmount,
          {
            callback_received: true,
            callback_time: new Date().toISOString(),
            payment_details: {
              EdvironCollectRequestId: allParams.EdvironCollectRequestId,
              original_edviron_status: status, // Keep original EDVIRON status
              classified_status: finalStatus, // Our classified status
              error_reason:
                allParams.error_reason ||
                allParams.reason ||
                'Payment not completed',
              reason: allParams.reason,
              classification_logic:
                'Both FAILED and cancelled from EDVIRON marked as FAILED',
              callback_timestamp: new Date().toISOString(),
            },
          },
        );

        // Redirect to dashboard with failed status
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const failureReason = allParams.reason || 'Payment failed';
        const failedUrl = `${frontendUrl}/?message=Payment ${status}&collect_id=${collectRequestId}&status=failed&reason=${encodeURIComponent(failureReason)}`;

        return `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Payment Failed</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: red; font-size: 24px; }
                .details { margin: 20px 0; padding: 20px; background: #f8f0f0; border-radius: 8px; }
              </style>
            </head>
            <body>
              <h1 class="error">❌ Payment ${status === 'cancelled' ? 'Cancelled' : 'Failed'}</h1>
              <div class="details">
                <p><strong>Collection Request ID:</strong> ${collectRequestId}</p>
                <p><strong>Status:</strong> ${status}</p>
                ${allParams.reason ? `<p><strong>Reason:</strong> ${allParams.reason}</p>` : ''}
                <p>Your payment could not be processed. Please try again.</p>
              </div>
              <p>Redirecting to dashboard...</p>
              <script>
                setTimeout(() => {
                  window.location.href = '${failedUrl}';
                }, 3000);
              </script>
            </body>
          </html>
        `;
      } else {
        // Handle other statuses (PENDING, etc.)
        let finalStatus = status.toUpperCase();
        let statusMessage = status;
        let statusColor = '#2196F3';

        // Classify the status
        if (
          status.toLowerCase().includes('pending') ||
          status.toLowerCase().includes('processing')
        ) {
          finalStatus = 'PENDING';
          statusMessage = 'Pending';
          statusColor = '#FF9800';
        } else {
          // For any unknown status, default to CANCELLED
          finalStatus = 'CANCELLED';
          statusMessage = 'Cancelled';
          statusColor = '#757575';
        }

        // Update transaction status
        await this.transactionsService.updateTransactionStatusByCollectId(
          collectRequestId,
          finalStatus,
          0, // No transaction amount for non-successful payments
          {
            callback_received: true,
            callback_time: new Date().toISOString(),
            payment_details: {
              EdvironCollectRequestId: allParams.EdvironCollectRequestId,
              original_edviron_status: status,
              classified_status: finalStatus,
              status_message: statusMessage,
              callback_timestamp: new Date().toISOString(),
            },
          },
        );

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const statusUrl = `${frontendUrl}/?message=Payment ${statusMessage}&collect_id=${collectRequestId}&status=${finalStatus.toLowerCase()}`;

        return `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Payment ${statusMessage}</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .status { color: ${statusColor}; font-size: 24px; }
                .details { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
              </style>
            </head>
            <body>
              <h1 class="status">ℹ️ Payment ${statusMessage}</h1>
              <div class="details">
                <p><strong>Collection Request ID:</strong> ${collectRequestId}</p>
                <p><strong>Status:</strong> ${finalStatus}</p>
                <p>Your payment status has been updated.</p>
              </div>
              <p>Redirecting to dashboard...</p>
              <script>
                setTimeout(() => {
                  window.location.href = '${statusUrl}';
                }, 3000);
              </script>
            </body>
          </html>
        `;
      }
    } catch (error) {
      console.error('Payment callback error:', error);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const errorUrl = `${frontendUrl}/?message=Payment error&error=${encodeURIComponent(error.message)}`;

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; font-size: 24px; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Payment Error</h1>
            <p>There was an error processing your payment callback.</p>
            <p>Error: ${error.message}</p>
            <p>Redirecting to dashboard...</p>
            <script>
              setTimeout(() => {
                window.location.href = '${errorUrl}';
              }, 3000);
            </script>
          </body>
        </html>
      `;
    }
  }
}
