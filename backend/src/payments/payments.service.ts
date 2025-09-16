import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { Order, OrderDocument } from '../schemas/order.schema';
import {
  OrderStatus,
  OrderStatusDocument,
} from '../schemas/order-status.schema';
import {
  WebhookLogs,
  WebhookLogsDocument,
} from '../schemas/webhook-logs.schema';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(OrderStatus.name)
    private orderStatusModel: Model<OrderStatusDocument>,
    @InjectModel(WebhookLogs.name)
    private webhookLogsModel: Model<WebhookLogsDocument>,
    private configService: ConfigService,
  ) {}

  async createPayment(paymentData: any) {
    try {
      // Generate unique custom_order_id
      const customOrderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // Create order in database
      
      const order = new this.orderModel({
        school_id: paymentData.school_id,
        trustee_id: paymentData.trustee_id,
        student_info: paymentData.student_info,
        gateway_name: paymentData.gateway_name || 'edviron',
        custom_order_id: customOrderId,
      });

      const savedOrder = await order.save();

      // Create initial order status
      const orderStatus = new this.orderStatusModel({
        collect_id: order._id,
        order_amount: paymentData.amount,
        status: 'PENDING',
      });

      await orderStatus.save();

      // Get configuration values
      const apiKey = this.configService.get<string>('API_KEY');
      const pgSecret = this.configService.get<string>('PG_SECRET');
      const gatewayUrl = this.configService.get<string>('PAYMENT_GATEWAY_URL');
      const callbackUrl =
        this.configService.get<string>('CALLBACK_URL')

      if (!apiKey || !pgSecret || !gatewayUrl) {
        throw new Error(
          'Required EDVIRON configuration missing: API_KEY, PG_SECRET, and PAYMENT_GATEWAY_URL are required',
        );
      }

      this.logger.log('EDVIRON Configuration:');
      this.logger.log(`- Gateway URL: ${gatewayUrl}`);
      this.logger.log(`- Callback URL: ${callbackUrl}`);
      this.logger.log(
        `- API Key: ${apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT SET'}`,
      );
      this.logger.log(`- PG Secret: ${pgSecret ? 'SET' : 'NOT SET'}`);
      this.logger.log(
        `- Payment Data: School ID: ${paymentData.school_id}, Amount: ${paymentData.amount}`,
      );

      const jwtPayload = {
        school_id: paymentData.school_id,
        amount: paymentData.amount.toString(),
        callback_url: callbackUrl,
      };

      this.logger.log('JWT Payload before signing:', jwtPayload);

      const signedJWT = jwt.sign(jwtPayload, pgSecret);
      this.logger.log(`Signed JWT length: ${signedJWT.length}`);

      const requestBody = {
        school_id: paymentData.school_id,
        amount: paymentData.amount.toString(),
        callback_url: callbackUrl,
        sign: signedJWT,
        trustee_id: paymentData.trustee_id,
        student_info: paymentData.student_info,
        description: paymentData.description || 'School fee payment',
      };

      const apiUrl = gatewayUrl.endsWith('/')
        ? `${gatewayUrl}create-collect-request`
        : `${gatewayUrl}/create-collect-request`;

      this.logger.log(`Making API call to: ${apiUrl}`);
      this.logger.log(`Request body:`, { ...requestBody, sign: '[HIDDEN]' });

      let response;

      try {
        this.logger.log('Attempting EDVIRON API call with full payload...');
        response = await axios.post(apiUrl, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 30000,
        });
      } catch (firstError) {
        this.logger.warn(
          'First attempt failed, trying with minimal payload...',
        );

        const minimalBody = {
          school_id: paymentData.school_id,
          amount: paymentData.amount.toString(),
          callback_url: callbackUrl,
          sign: signedJWT,
        };

        try {
          response = await axios.post(apiUrl, minimalBody, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 30000,
          });
        } catch (secondError) {
          this.logger.warn(
            'Second attempt failed, trying with different headers...',
          );

          try {
            response = await axios.post(apiUrl, minimalBody, {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'User-Agent': 'School-Payment-App/1.0',
              },
              timeout: 30000,
            });
          } catch (thirdError) {
            this.logger.error('All EDVIRON API attempts failed');
            throw firstError;
          }
        }
      }

      this.logger.log(
        `Payment created successfully for order: ${customOrderId}`,
      );
      this.logger.log(`EDVIRON Response Status: ${response.status}`);
      this.logger.log(`EDVIRON Response:`, response.data);

      if (!response.data) {
        throw new Error('Empty response from EDVIRON API');
      }

      if (response.data.collect_request_id) {
        order.gateway_reference_id = response.data.collect_request_id;
        await order.save();
      }

      const paymentUrl =
        response.data.Collect_request_url ||
        response.data.collect_request_url ||
        response.data.payment_url;
      if (!paymentUrl) {
        this.logger.error(
          'No payment URL found in EDVIRON response:',
          response.data,
        );
        throw new Error('Payment URL not provided by EDVIRON gateway');
      }

      this.logger.log(`Payment URL generated: ${paymentUrl}`);

      return {
        success: true,
        order_id: customOrderId,
        collect_id: order._id,
        collect_request_id: response.data.collect_request_id,
        payment_url: paymentUrl,
        gateway_sign: response.data.sign,
        message: 'Payment request created successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error creating payment: ${error.message}`,
        error.stack,
      );

      if (error.response) {
        this.logger.error(`Gateway Error Response:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      if (error.response?.status === 500) {
        this.logger.error(
          'EDVIRON API returned 500 error. This might be due to wrong school_id.',
        );
        this.logger.error(`Current school_id: ${paymentData.school_id}`);
        this.logger.error(
          'Make sure you are using a valid school_id that exists in EDVIRON system.',
        );
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Unknown error occurred';

      // Provide more helpful error message
      if (error.response?.status === 500) {
        const helpMessage =
          'EDVIRON API server error. This might be due to: ' +
          '(1) Invalid school_id in their system, ' +
          '(2) Expired/invalid API key, ' +
          '(3) Their server being down. ' +
          'Please contact EDVIRON support or try again later.';
        throw new BadRequestException(helpMessage);
      }

      throw new BadRequestException(
        `Failed to create payment request: ${errorMessage}`,
      );
    }
  }

  async handleWebhook(webhookData: any) {
    try {
      // Log webhook payload
      const webhookLog = new this.webhookLogsModel({
        payload: webhookData,
        source: 'payment_gateway',
        status: 'RECEIVED',
      });
      await webhookLog.save();

      // Extract payment information from webhook according to specified format
      const orderInfo = webhookData.order_info;

      if (!orderInfo || !orderInfo.order_id) {
        throw new BadRequestException(
          'Missing order_info or order_id in webhook payload',
        );
      }

      // Find and update order status using order_id as collect_id
      const orderStatus = await this.orderStatusModel
        .findOne({ collect_id: orderInfo.order_id })
        .exec();

      if (!orderStatus) {
        this.logger.warn(
          `Order status not found for order_id: ${orderInfo.order_id}`,
        );
        webhookLog.status = 'FAILED';
        webhookLog.error_message = 'Order not found';
        await webhookLog.save();
        return { success: false, message: 'Order not found' };
      }

      // Update order status with webhook data according to specified format
      orderStatus.status = orderInfo.status || orderStatus.status;
      orderStatus.transaction_amount = orderInfo.transaction_amount;
      orderStatus.payment_mode = orderInfo.payment_mode;
      orderStatus.bank_reference = orderInfo.bank_reference;
      orderStatus.payment_message = orderInfo.Payment_message; // Note: capital P in Payment_message
      orderStatus.payment_time = orderInfo.payment_time
        ? new Date(orderInfo.payment_time)
        : new Date();
      orderStatus.payment_details = orderInfo.payemnt_details; // Note: typo in payemnt_details
      orderStatus.error_message = orderInfo.error_message;

      // Update order amount if provided
      if (orderInfo.order_amount) {
        orderStatus.order_amount = orderInfo.order_amount;
      }

      await orderStatus.save();

      // Update webhook log as processed
      webhookLog.status = 'PROCESSED';
      webhookLog.processed_at = new Date();
      await webhookLog.save();

      this.logger.log(
        `Webhook processed successfully for order_id: ${orderInfo.order_id}`,
      );

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error processing webhook: ${error.message}`,
        error.stack,
      );

      // Update webhook log with error
      if (webhookData) {
        const webhookLog = new this.webhookLogsModel({
          payload: webhookData,
          source: 'payment_gateway',
          status: 'FAILED',
          error_message: error.message,
        });
        await webhookLog.save();
      }

      throw new BadRequestException('Failed to process webhook');
    }
  }

  async checkPaymentStatus(collectRequestId: string, schoolId: string) {
    try {
      const pgSecret = this.configService.get<string>('PG_SECRET');
      const gatewayUrl = this.configService.get<string>('PAYMENT_GATEWAY_URL');

      if (!pgSecret) {
        throw new Error('PG_SECRET is not defined in environment variables');
      }

      // Prepare JWT payload for signing according to EDVIRON specs
      const jwtPayload = {
        school_id: schoolId,
        collect_request_id: collectRequestId,
      };

      // Sign payload with PG Secret Key
      const signedJWT = jwt.sign(jwtPayload, pgSecret);

      // Call EDVIRON payment status API
      const response = await axios.get(
        `${gatewayUrl}collect-request/${collectRequestId}?school_id=${schoolId}&sign=${signedJWT}`,
      );

      this.logger.log(
        `Payment status checked for collect_request_id: ${collectRequestId}`,
      );

      return {
        success: true,
        status: response.data.status,
        amount: response.data.amount,
        details: response.data.details,
        jwt: response.data.jwt,
      };
    } catch (error) {
      this.logger.error(
        `Error checking payment status: ${error.message}`,
        error.stack,
      );
      if (error.response) {
        this.logger.error(`Gateway response:`, error.response.data);
      }
      throw new BadRequestException(
        `Failed to check payment status: ${error.message}`,
      );
    }
  }

  async findOrderByCollectRequestId(collectRequestId: string) {
    try {
      // Find the order by gateway_reference_id (which stores the collect_request_id from EDVIRON)
      const order = await this.orderModel
        .findOne({
          gateway_reference_id: collectRequestId,
        })
        .exec();

      if (!order) {
        this.logger.warn(
          `Order with gateway_reference_id '${collectRequestId}' not found`,
        );
        return null;
      }

      // Get the order status to get the amounts
      const orderStatus = await this.orderStatusModel
        .findOne({
          collect_id: order._id,
        })
        .exec();

      return {
        order_id: order._id,
        custom_order_id: order.custom_order_id,
        gateway_reference_id: order.gateway_reference_id,
        order_amount: orderStatus?.order_amount || 0,
        transaction_amount: orderStatus?.transaction_amount || 0,
        status: orderStatus?.status || 'PENDING',
      };
    } catch (error) {
      this.logger.error(
        `Error finding order by collect_request_id: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Cancel abandoned payments that are still PENDING after a specified timeout
   * This handles cases where users don't complete payment and no callback is received
   */
  async cancelAbandonedPayments(timeoutMinutes: number = 30) {
    try {
      this.logger.log(
        `Starting cancellation of abandoned payments older than ${timeoutMinutes} minutes`,
      );

      // Calculate cutoff time
      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
      this.logger.log(`Cutoff time: ${cutoffTime.toISOString()}`);

      // Find all PENDING order statuses that are older than timeout and haven't received callback
      // Handle both null/undefined and false values for callback_received
      const abandonedOrderStatuses = await this.orderStatusModel
        .find({
          status: 'PENDING',
          $or: [
            { callback_received: { $ne: true } }, // Not true
            { callback_received: { $exists: false } }, // Field doesn't exist
          ],
          createdAt: { $lt: cutoffTime }, // Older than timeout
        })
        .exec();

      this.logger.log(
        `Found ${abandonedOrderStatuses.length} abandoned payments to cancel`,
      );

      let cancelledCount = 0;

      for (const orderStatus of abandonedOrderStatuses) {
        try {
          // Update status to CANCELLED
          await this.orderStatusModel
            .findByIdAndUpdate(orderStatus._id, {
              status: 'CANCELLED',
              error_message:
                'Payment abandoned - no callback received within timeout period',
              payment_message: `Payment automatically cancelled after ${timeoutMinutes} minutes of inactivity`,
              updatedAt: new Date(),
            })
            .exec();

          cancelledCount++;

          // Log the cancellation
          const order = await this.orderModel
            .findById(orderStatus.collect_id)
            .exec();
          if (order) {
            this.logger.log(
              `Cancelled abandoned payment: ${order.custom_order_id} (collect_id: ${orderStatus.collect_id})`,
            );
          }
        } catch (updateError) {
          this.logger.error(
            `Failed to cancel order status ${orderStatus._id}: ${updateError.message}`,
          );
        }
      }

      this.logger.log(
        `Successfully cancelled ${cancelledCount} out of ${abandonedOrderStatuses.length} abandoned payments`,
      );

      return {
        success: true,
        totalFound: abandonedOrderStatuses.length,
        totalCancelled: cancelledCount,
        cutoffTime: cutoffTime.toISOString(),
        message: `Cancelled ${cancelledCount} abandoned payments`,
      };
    } catch (error) {
      this.logger.error(
        `Error cancelling abandoned payments: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to cancel abandoned payments: ${error.message}`,
      );
    }
  }

  /**
   * Cancel a specific payment by custom order ID
   * This can be called manually for specific payments
   */
  async cancelPaymentByOrderId(
    customOrderId: string,
    reason: string = 'Manual cancellation',
  ) {
    try {
      this.logger.log(`Cancelling payment with order ID: ${customOrderId}`);

      // Find the order
      const order = await this.orderModel
        .findOne({ custom_order_id: customOrderId })
        .exec();
      if (!order) {
        throw new Error(
          `Order with custom_order_id '${customOrderId}' not found`,
        );
      }

      // Find and update the order status
      const orderStatus = await this.orderStatusModel
        .findOne({ collect_id: order._id })
        .exec();
      if (!orderStatus) {
        throw new Error(`Order status for order '${customOrderId}' not found`);
      }

      // Only cancel if still PENDING
      if (orderStatus.status !== 'PENDING') {
        throw new Error(
          `Cannot cancel payment with status '${orderStatus.status}'. Only PENDING payments can be cancelled.`,
        );
      }

      // Update to CANCELLED
      await this.orderStatusModel
        .findByIdAndUpdate(orderStatus._id, {
          status: 'CANCELLED',
          error_message: reason,
          payment_message: `Payment cancelled: ${reason}`,
          updatedAt: new Date(),
        })
        .exec();

      this.logger.log(`Successfully cancelled payment: ${customOrderId}`);

      return {
        success: true,
        order_id: customOrderId,
        collect_id: order._id,
        message: `Payment ${customOrderId} has been cancelled`,
        reason: reason,
      };
    } catch (error) {
      this.logger.error(
        `Error cancelling payment ${customOrderId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to cancel payment: ${error.message}`,
      );
    }
  }

  /**
   * Debug method to check pending payments without cancelling them
   */
  async debugPendingPayments(timeoutMinutes: number = 30) {
    try {
      this.logger.log(`=== DEBUGGING PENDING PAYMENTS ===`);
      this.logger.log(
        `Looking for payments older than ${timeoutMinutes} minutes`,
      );

      // Calculate cutoff time
      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
      this.logger.log(`Current time: ${new Date().toISOString()}`);
      this.logger.log(`Cutoff time: ${cutoffTime.toISOString()}`);

      // First, let's see all PENDING payments
      const allPending = await this.orderStatusModel
        .find({
          status: 'PENDING',
        })
        .select('_id collect_id status callback_received createdAt updatedAt')
        .exec();

      this.logger.log(`Total PENDING payments: ${allPending.length}`);

      if (allPending.length > 0) {
        this.logger.log('Sample pending payments:');
        allPending.slice(0, 5).forEach((payment, index) => {
          this.logger.log(
            `${index + 1}. ID: ${payment._id}, Callback: ${payment.callback_received}, Created: ${(payment as any).createdAt}`,
          );
        });
      }

      // Now check specifically for abandoned ones using the same query as cancellation
      const abandonedPayments = await this.orderStatusModel
        .find({
          status: 'PENDING',
          $or: [
            { callback_received: { $ne: true } }, // Not true
            { callback_received: { $exists: false } }, // Field doesn't exist
          ],
          createdAt: { $lt: cutoffTime },
        })
        .select('_id collect_id status callback_received createdAt updatedAt')
        .exec();

      this.logger.log(`Abandoned payments found: ${abandonedPayments.length}`);

      if (abandonedPayments.length > 0) {
        this.logger.log('Abandoned payments details:');
        for (const payment of abandonedPayments.slice(0, 10)) {
          const order = await this.orderModel
            .findById(payment.collect_id)
            .select('custom_order_id')
            .exec();
          this.logger.log(
            `- Order: ${order?.custom_order_id || 'Unknown'}, Created: ${(payment as any).createdAt}, Callback: ${payment.callback_received}`,
          );
        }
      }

      // Also check for old payments (more than 1 hour)
      const veryOldCutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
      const veryOldPending = await this.orderStatusModel
        .find({
          status: 'PENDING',
          createdAt: { $lt: veryOldCutoff },
        })
        .countDocuments()
        .exec();

      this.logger.log(`Very old pending payments (>1 hour): ${veryOldPending}`);
      this.logger.log('==================================');

      return {
        success: true,
        currentTime: new Date().toISOString(),
        cutoffTime: cutoffTime.toISOString(),
        totalPending: allPending.length,
        abandonedFound: abandonedPayments.length,
        veryOldPending: veryOldPending,
        timeoutMinutes: timeoutMinutes,
        samplePending: allPending.slice(0, 5).map((p) => ({
          id: p._id,
          callback_received: p.callback_received,
          created: (p as any).createdAt,
          age_minutes: Math.round(
            (Date.now() - new Date((p as any).createdAt).getTime()) /
              (1000 * 60),
          ),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Error debugging pending payments: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to debug pending payments: ${error.message}`,
      );
    }
  }

  
  async forceCancelAbandonedPayments(timeoutMinutes: number = 5) {
    try {
      this.logger.log(`=== FORCE CANCELLING ABANDONED PAYMENTS ===`);
      this.logger.log(
        `Forcing cancellation of payments older than ${timeoutMinutes} minutes`,
      );

      // Calculate cutoff time
      const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
      this.logger.log(`Current time: ${new Date().toISOString()}`);
      this.logger.log(`Cutoff time: ${cutoffTime.toISOString()}`);

      // Simpler query - just find all PENDING payments older than cutoff
      // We'll ignore the callback_received field entirely for this force method
      const abandonedOrderStatuses = await this.orderStatusModel
        .find({
          status: 'PENDING',
          createdAt: { $lt: cutoffTime },
        })
        .exec();

      this.logger.log(
        `Found ${abandonedOrderStatuses.length} old PENDING payments to cancel`,
      );

      let cancelledCount = 0;
      let errors: string[] = [];

      for (const orderStatus of abandonedOrderStatuses) {
        try {
          // Check if it has received callback - if yes, skip cancellation
          if (orderStatus.callback_received === true) {
            this.logger.log(
              `Skipping order ${orderStatus._id} - callback already received`,
            );
            continue;
          }

          // Update status to CANCELLED
          await this.orderStatusModel
            .findByIdAndUpdate(orderStatus._id, {
              status: 'CANCELLED',
              error_message:
                'Payment abandoned - no callback received within timeout period',
              payment_message: `Payment automatically cancelled after ${timeoutMinutes} minutes of inactivity (force cancelled)`,
              updatedAt: new Date(),
            })
            .exec();

          cancelledCount++;

          // Log the cancellation
          const order = await this.orderModel
            .findById(orderStatus.collect_id)
            .exec();
          if (order) {
            this.logger.log(
              `Force cancelled abandoned payment: ${order.custom_order_id} (age: ${Math.round((Date.now() - new Date((orderStatus as any).createdAt).getTime()) / (1000 * 60))} minutes)`,
            );
          }
        } catch (updateError) {
          const errorMsg = `Failed to cancel order status ${orderStatus._id}: ${updateError.message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      this.logger.log(
        `Force cancellation completed: ${cancelledCount} out of ${abandonedOrderStatuses.length} payments cancelled`,
      );
      if (errors.length > 0) {
        this.logger.error(`Errors encountered: ${errors.length}`);
        errors.forEach((err) => this.logger.error(err));
      }
      this.logger.log('=========================================');

      return {
        success: true,
        totalFound: abandonedOrderStatuses.length,
        totalCancelled: cancelledCount,
        totalErrors: errors.length,
        cutoffTime: cutoffTime.toISOString(),
        timeoutMinutes: timeoutMinutes,
        message: `Force cancelled ${cancelledCount} abandoned payments`,
        errors: errors,
      };
    } catch (error) {
      this.logger.error(
        `Error force cancelling abandoned payments: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to force cancel abandoned payments: ${error.message}`,
      );
    }
  }
}
