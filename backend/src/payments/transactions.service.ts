import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import {
  OrderStatus,
  OrderStatusDocument,
} from '../schemas/order-status.schema';

// Payment Status Classification
export enum PaymentStatusCategory {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// Helper function to classify payment statuses
export function classifyPaymentStatus(
  rawStatus: string,
): PaymentStatusCategory {
  if (!rawStatus) return PaymentStatusCategory.PENDING;

  const status = rawStatus.toUpperCase();

  console.log(
    `[STATUS_CLASSIFICATION] Raw: "${rawStatus}" → Normalized: "${status}"`,
  );

  switch (status) {
    case 'SUCCESS':
    case 'SUCCESSFUL':
    case 'COMPLETED':
    case 'PAID':
      console.log(`[STATUS_CLASSIFICATION] "${rawStatus}" → SUCCESS`);
      return PaymentStatusCategory.SUCCESS;

    case 'FAILED':
    case 'FAILURE':
    case 'FAILED_PAYMENT':
    case 'ERROR':
      console.log(`[STATUS_CLASSIFICATION] "${rawStatus}" → FAILED`);
      return PaymentStatusCategory.FAILED;

    case 'CANCELLED':
    case 'CANCELED':
    case 'CANCELLED_BY_USER':
    case 'USER_CANCELLED':
    case 'PAYMENT_CANCELLED':
    case 'USER_DROPPED': 
    case 'DROPPED':
    case 'ABANDONED':
    case 'TIMEOUT':
      console.log(`[STATUS_CLASSIFICATION] "${rawStatus}" → CANCELLED`);
      return PaymentStatusCategory.CANCELLED;

    case 'PENDING':
    case 'PROCESSING':
    case 'INITIATED':
    case 'IN_PROGRESS':
    case 'AWAITING_PAYMENT':
    case 'RETRY_CREATED':
      console.log(
        `[STATUS_CLASSIFICATION] "${rawStatus}" → PENDING (explicit)`,
      );
    default:
      console.log(
        `[STATUS_CLASSIFICATION] "${rawStatus}" → PENDING (default/unknown)`,
      );
      return PaymentStatusCategory.PENDING;
  }
}

interface TransactionQueryParams {
  page: number;
  limit: number;
  sort?: string;
  order?: string;
  status?: string;
  schoolId?: string;
  gateway?: string;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(OrderStatus.name)
    private orderStatusModel: Model<OrderStatusDocument>,
  ) {}

  async getTransactions(params: TransactionQueryParams) {
    try {
      const {
        page,
        limit,
        sort = 'createdAt',
        order = 'desc',
        status,
        schoolId,
        gateway,
      } = params;
      const skip = (page - 1) * limit;

      // Build match conditions
      const matchConditions: any = {};
      if (status) {
        matchConditions['orderStatus.status'] = status;
      }
      if (schoolId) {
        matchConditions['order.school_id'] = schoolId;
      }
      if (gateway) {
        matchConditions['order.gateway_name'] = gateway;
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sort] = order === 'desc' ? -1 : 1;

      // Aggregation pipeline to join Order and OrderStatus
      const pipeline = [
        {
          $lookup: {
            from: 'orderstatuses',
            localField: '_id',
            foreignField: 'collect_id',
            as: 'orderStatus',
          },
        },
        {
          $unwind: {
            path: '$orderStatus',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $addFields: {
            order: '$$ROOT',
            collect_id: '$_id',
            school_id: '$school_id',
            gateway: '$gateway_name',
            order_amount: '$orderStatus.order_amount',
            transaction_amount: '$orderStatus.transaction_amount',
            status: '$orderStatus.status',
            raw_status: '$orderStatus.status', // Keep original status
            custom_order_id: '$custom_order_id',
            payment_time: '$orderStatus.payment_time',
            payment_mode: '$orderStatus.payment_mode',
            createdAt: '$createdAt',
          },
        },
        ...(Object.keys(matchConditions).length > 0
          ? [{ $match: matchConditions }]
          : []),
        { $sort: sortObj },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  collect_id: 1,
                  school_id: 1,
                  gateway: 1,
                  order_amount: 1,
                  transaction_amount: 1,
                  status: 1,
                  raw_status: 1,
                  custom_order_id: 1,
                  payment_time: 1,
                  payment_mode: 1,
                  student_name: '$student_info.name',
                  student_email: '$student_info.email',
                  createdAt: 1,
                },
              },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ];

      const result = await this.orderModel.aggregate(pipeline as any).exec();

      const rawData = result[0]?.data || [];
      // Classify payment statuses
      const data = rawData.map((transaction) => ({
        ...transaction,
        status_category: classifyPaymentStatus(transaction.status),
        original_status: transaction.status,
      }));

      const totalCount = result[0]?.totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching transactions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getTransactionsBySchool(
    schoolId: string,
    params: { page: number; limit: number },
  ) {
    try {
      const { page, limit } = params;
      const skip = (page - 1) * limit;

      const pipeline = [
        { $match: { school_id: schoolId } },
        {
          $lookup: {
            from: 'orderstatuses',
            localField: '_id',
            foreignField: 'collect_id',
            as: 'orderStatus',
          },
        },
        {
          $unwind: {
            path: '$orderStatus',
            preserveNullAndEmptyArrays: false,
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  collect_id: '$_id',
                  school_id: 1,
                  gateway: '$gateway_name',
                  order_amount: '$orderStatus.order_amount',
                  transaction_amount: '$orderStatus.transaction_amount',
                  status: '$orderStatus.status',
                  custom_order_id: 1,
                  payment_time: '$orderStatus.payment_time',
                  payment_mode: '$orderStatus.payment_mode',
                  student_name: '$student_info.name',
                  student_email: '$student_info.email',
                  createdAt: 1,
                },
              },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ];

      const result = await this.orderModel.aggregate(pipeline as any).exec();

      const rawData = result[0]?.data || [];
      // Classify payment statuses
      const data = rawData.map((transaction) => ({
        ...transaction,
        status_category: classifyPaymentStatus(transaction.status),
        original_status: transaction.status,
      }));

      const totalCount = result[0]?.totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        data,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching transactions for school ${schoolId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getTransactionStatus(customOrderId: string) {
    try {
      const order = await this.orderModel
        .findOne({ custom_order_id: customOrderId })
        .exec();

      if (!order) {
        throw new NotFoundException('Transaction not found');
      }

      const orderStatus = await this.orderStatusModel
        .findOne({ collect_id: order._id })
        .exec();

      if (!orderStatus) {
        throw new NotFoundException('Transaction status not found');
      }

      return {
        custom_order_id: customOrderId,
        collect_id: order._id,
        school_id: order.school_id,
        student_info: order.student_info,
        gateway: order.gateway_name,
        order_amount: orderStatus.order_amount,
        transaction_amount: orderStatus.transaction_amount,
        status: orderStatus.status,
        payment_mode: orderStatus.payment_mode,
        payment_time: orderStatus.payment_time,
        payment_message: orderStatus.payment_message,
        error_message: orderStatus.error_message,
        bank_reference: orderStatus.bank_reference,
        createdAt: (order as any).createdAt,
        updatedAt: (orderStatus as any).updatedAt,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching transaction status for ${customOrderId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getSchoolIds() {
    try {
      const schoolIds = await this.orderModel.distinct('school_id').exec();
      return schoolIds;
    } catch (error) {
      this.logger.error(
        `Error fetching school IDs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createTransaction(transactionData: any) {
    try {
      // Create the order first
      const order = new this.orderModel({
        school_id: transactionData.school_id,
        gateway_name: transactionData.gateway,
        student_info: {
          name: transactionData.student_name,
          email: transactionData.student_email,
        },
        custom_order_id: transactionData.custom_order_id,
        description: transactionData.description,
      });

      const savedOrder = await order.save();

      // Create the order status
      const orderStatus = new this.orderStatusModel({
        collect_id: savedOrder._id,
        order_amount: transactionData.order_amount,
        transaction_amount: transactionData.transaction_amount,
        status: transactionData.status,
      });

      await orderStatus.save();

      this.logger.log(`Transaction created with ID: ${savedOrder._id}`);
      return savedOrder;
    } catch (error) {
      this.logger.error(
        `Error creating transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateTransactionStatus(
    orderId: string,
    status: string,
    transactionAmount: number,
    additionalData?: any,
  ) {
    try {
      // Find the order by custom_order_id or _id
      const order = await this.orderModel
        .findOne({
          $or: [{ custom_order_id: orderId }, { _id: orderId }],
        })
        .exec();

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Update the order status
      const updateData: any = {
        status,
        transaction_amount: transactionAmount,
        updatedAt: new Date(),
      };

      if (additionalData) {
        if (additionalData.payment_method)
          updateData.payment_mode = additionalData.payment_method;
        if (additionalData.bank_reference)
          updateData.bank_reference = additionalData.bank_reference;
        if (additionalData.payment_time)
          updateData.payment_time = new Date(additionalData.payment_time);
        if (additionalData.error_message)
          updateData.error_message = additionalData.error_message;
        if (additionalData.failure_reason)
          updateData.payment_message = additionalData.failure_reason;
        if (additionalData.callback_received)
          updateData.callback_received = additionalData.callback_received;
        if (additionalData.callback_time)
          updateData.callback_time = additionalData.callback_time;
        if (additionalData.payment_details) {
          try {
            if (typeof additionalData.payment_details === 'string') {
              updateData.payment_details = JSON.parse(
                additionalData.payment_details,
              );
            } else if (typeof additionalData.payment_details === 'object') {
              updateData.payment_details = additionalData.payment_details;
            } else {
              updateData.payment_details = {
                raw: String(additionalData.payment_details),
              };
            }
          } catch (parseError) {
            this.logger.warn(
              `Failed to parse payment_details: ${parseError.message}`,
            );
            updateData.payment_details = {
              raw: additionalData.payment_details,
            };
          }
        }
      }

      const updatedStatus = await this.orderStatusModel
        .findOneAndUpdate({ collect_id: order._id }, updateData, {
          new: true,
          upsert: true,
        })
        .exec();

      if (updatedStatus) {
        this.logger.log(
          `Transaction status updated for order ${orderId}: ${status}`,
        );
        return updatedStatus;
      } else {
        this.logger.error(`Failed to update order status for order ${orderId}`);
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      this.logger.error(
        `Error updating transaction status for ${orderId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateTransactionStatusByCollectId(
    collectRequestId: string,
    status: string,
    transactionAmount: number,
    additionalData?: any,
  ) {
    try {
      this.logger.log(`=== UPDATING TRANSACTION STATUS ===`);
      this.logger.log(`Collect Request ID: ${collectRequestId}`);
      this.logger.log(`New Status: ${status}`);
      this.logger.log(`Transaction Amount: ${transactionAmount}`);

      // Find the order by gateway_reference_id (which stores the collect_request_id from EDVIRON)
      let order = await this.orderModel
        .findOne({
          gateway_reference_id: collectRequestId,
        })
        .exec();

      if (!order) {
        this.logger.warn(
          `Order with gateway_reference_id '${collectRequestId}' not found`,
        );

        // Log recent orders to help debug
        const recentOrders = await this.orderModel
          .find({})
          .select('custom_order_id gateway_reference_id _id createdAt')
          .sort({ createdAt: -1 })
          .limit(5)
          .exec();

        this.logger.log(
          'Recent orders:',
          recentOrders.map((o) => ({
            _id: o._id,
            custom_order_id: o.custom_order_id,
            gateway_reference_id: (o as any).gateway_reference_id,
            createdAt: (o as any).createdAt,
          })),
        );

        // TEMPORARY FIX: Try to update status by finding a matching OrderStatus record
        this.logger.warn(
          'Attempting fallback: updating status without order reference',
        );

        try {
          // Find the most recent PENDING status that might match this payment
          const recentPendingStatus = await this.orderStatusModel
            .findOne({
              status: 'PENDING',
              order_amount:
                transactionAmount > 0 ? transactionAmount : { $exists: true },
            })
            .sort({ createdAt: -1 })
            .exec();

          if (recentPendingStatus) {
            this.logger.log(
              `Found recent pending status: ${recentPendingStatus._id}`,
            );

            const updateData: any = {
              status,
              transaction_amount: transactionAmount,
              updatedAt: new Date(),
            };

            if (additionalData) {
              if (additionalData.callback_received)
                updateData.callback_received = additionalData.callback_received;
              if (additionalData.callback_time)
                updateData.callback_time = additionalData.callback_time;
              if (additionalData.payment_details) {
                this.logger.log(
                  `[FALLBACK] Setting payment_details:`,
                  additionalData.payment_details,
                );
                this.logger.log(
                  `[FALLBACK] Type of payment_details:`,
                  typeof additionalData.payment_details,
                );

                // Ensure payment_details is properly handled as an object
                try {
                  if (typeof additionalData.payment_details === 'string') {
                    // If it's a string, try to parse it as JSON
                    updateData.payment_details = JSON.parse(
                      additionalData.payment_details,
                    );
                  } else if (
                    typeof additionalData.payment_details === 'object'
                  ) {
                    // If it's already an object, use it directly
                    updateData.payment_details = additionalData.payment_details;
                  } else {
                    // For any other type, convert to string representation
                    updateData.payment_details = {
                      raw: String(additionalData.payment_details),
                    };
                  }

                  this.logger.log(
                    `[FALLBACK] Final payment_details object:`,
                    updateData.payment_details,
                  );
                } catch (parseError) {
                  this.logger.warn(
                    `[FALLBACK] Failed to parse payment_details as JSON: ${parseError.message}`,
                  );
                  // Fallback: wrap the raw value in an object
                  updateData.payment_details = {
                    raw: additionalData.payment_details,
                  };
                }
              }
            }

            const updatedStatus = await this.orderStatusModel
              .findByIdAndUpdate(recentPendingStatus._id, updateData, {
                new: true,
              })
              .exec();

            if (updatedStatus) {
              this.logger.log(
                `FALLBACK SUCCESS: Updated status ${updatedStatus._id} to ${status}`,
              );
              return updatedStatus;
            } else {
              this.logger.error(
                'FALLBACK FAILED: Updated status returned null',
              );
              throw new Error('Failed to update order status');
            }
          }
        } catch (fallbackError) {
          this.logger.error('Fallback update failed:', fallbackError.message);
        }

        throw new NotFoundException(
          `Order with collect_request_id ${collectRequestId} not found`,
        );
      }

      this.logger.log(`Found matching order: ${order._id}`);
      this.logger.log(`Order custom_order_id: ${order.custom_order_id}`);
      this.logger.log(
        `Order gateway_reference_id: ${(order as any).gateway_reference_id}`,
      );

      // Update the order status directly using the order's ObjectId
      const updateData: any = {
        status,
        transaction_amount: transactionAmount,
        updatedAt: new Date(),
      };

      if (additionalData) {
        if (additionalData.payment_method)
          updateData.payment_mode = additionalData.payment_method;
        if (additionalData.bank_reference)
          updateData.bank_reference = additionalData.bank_reference;
        if (additionalData.payment_time)
          updateData.payment_time = new Date(additionalData.payment_time);
        if (additionalData.error_message)
          updateData.error_message = additionalData.error_message;
        if (additionalData.failure_reason)
          updateData.payment_message = additionalData.failure_reason;
        if (additionalData.callback_received)
          updateData.callback_received = additionalData.callback_received;
        if (additionalData.callback_time)
          updateData.callback_time = additionalData.callback_time;
        if (additionalData.payment_details) {
          this.logger.log(
            `Setting payment_details:`,
            additionalData.payment_details,
          );
          this.logger.log(
            `Type of payment_details:`,
            typeof additionalData.payment_details,
          );

          // Ensure payment_details is properly handled as an object
          try {
            if (typeof additionalData.payment_details === 'string') {
              // If it's a string, try to parse it as JSON
              updateData.payment_details = JSON.parse(
                additionalData.payment_details,
              );
            } else if (typeof additionalData.payment_details === 'object') {
              // If it's already an object, use it directly
              updateData.payment_details = additionalData.payment_details;
            } else {
              // For any other type, convert to string representation
              updateData.payment_details = {
                raw: String(additionalData.payment_details),
              };
            }

            this.logger.log(
              `Final payment_details object:`,
              updateData.payment_details,
            );
          } catch (parseError) {
            this.logger.warn(
              `Failed to parse payment_details as JSON: ${parseError.message}`,
            );
            // Fallback: wrap the raw value in an object
            updateData.payment_details = {
              raw: additionalData.payment_details,
            };
          }
        }
      }

      const updatedStatus = await this.orderStatusModel
        .findOneAndUpdate({ collect_id: order._id }, updateData, {
          new: true,
          upsert: true,
        })
        .exec();

      if (updatedStatus) {
        this.logger.log(`Transaction status updated successfully:`);
        this.logger.log(`- Order ID: ${order._id}`);
        this.logger.log(`- New Status: ${updatedStatus.status}`);
        this.logger.log(
          `- Transaction Amount: ${updatedStatus.transaction_amount}`,
        );

        return updatedStatus;
      } else {
        this.logger.error(
          `Failed to update order status for order ${order._id}`,
        );
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      this.logger.error(`ERROR updating transaction status:`);
      this.logger.error(`- Collect Request ID: ${collectRequestId}`);
      this.logger.error(`- Error Message: ${error.message}`);
      this.logger.error(`- Stack Trace: ${error.stack}`);
      throw error;
    }
  }
}
