import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import {
  OrderStatus,
  OrderStatusDocument,
} from '../schemas/order-status.schema';

export enum PaymentStatusCategory {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export function classifyPaymentStatus(
  rawStatus: string,
): PaymentStatusCategory {
  if (!rawStatus) return PaymentStatusCategory.PENDING;

  const status = rawStatus.toUpperCase();

  switch (status) {
    case 'SUCCESS':
    case 'SUCCESSFUL':
    case 'COMPLETED':
    case 'PAID':
      return PaymentStatusCategory.SUCCESS;

    case 'FAILED':
    case 'FAILURE':
    case 'FAILED_PAYMENT':
    case 'ERROR':
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
      return PaymentStatusCategory.CANCELLED;

    case 'PENDING':
    case 'PROCESSING':
    case 'INITIATED':
    case 'IN_PROGRESS':
    case 'AWAITING_PAYMENT':
    case 'RETRY_CREATED':
      return PaymentStatusCategory.PENDING;

    default:
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
  userId?: string; // Add userId parameter
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
        userId,
      } = params;
      const skip = (page - 1) * limit;

      const initialMatchConditions: any = {};
      const postLookupMatchConditions: any = {};
      
      if (userId) {
        initialMatchConditions['trustee_id'] = userId.toString();
      }
      
      if (schoolId) {
        initialMatchConditions['school_id'] = schoolId;
      }
      if (gateway) {
        initialMatchConditions['gateway_name'] = gateway;
      }
      
      if (status) {
        postLookupMatchConditions['orderStatus.status'] = status;
      }

      const sortObj: any = {};
      sortObj[sort] = order === 'desc' ? -1 : 1;

      const pipeline = [
        ...(Object.keys(initialMatchConditions).length > 0
          ? [{ $match: initialMatchConditions }]
          : []),
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
        ...(Object.keys(postLookupMatchConditions).length > 0
          ? [{ $match: postLookupMatchConditions }]
          : []),
        {
          $addFields: {
            order: '$$ROOT',
            collect_id: '$_id',
            school_id: '$school_id',
            gateway: '$gateway_name',
            order_amount: '$orderStatus.order_amount',
            transaction_amount: '$orderStatus.transaction_amount',
            status: '$orderStatus.status',
            raw_status: '$orderStatus.status',
            custom_order_id: '$custom_order_id',
            payment_time: '$orderStatus.payment_time',
            payment_mode: '$orderStatus.payment_mode',
            createdAt: '$createdAt',
          },
        },
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
    params: { page: number; limit: number; userId?: string },
  ) {
    try {
      const { page, limit, userId } = params;
      const skip = (page - 1) * limit;

      const matchConditions: any = { school_id: schoolId };
      if (userId) {
        matchConditions.trustee_id = userId.toString();
      }

      const pipeline = [
        { $match: matchConditions },
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

  async getTransactionStatus(customOrderId: string, userId?: string) {
    try {
      const matchConditions: any = { custom_order_id: customOrderId };
      if (userId) {
        matchConditions.trustee_id = userId;
      }
      
      const order = await this.orderModel
        .findOne(matchConditions)
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
      let order = await this.orderModel
        .findOne({
          gateway_reference_id: collectRequestId,
        })
        .exec();

      if (!order) {
        const recentPendingStatus = await this.orderStatusModel
          .findOne({
            status: 'PENDING',
            order_amount:
              transactionAmount > 0 ? transactionAmount : { $exists: true },
          })
          .sort({ createdAt: -1 })
          .exec();

        if (recentPendingStatus) {
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
              try {
                if (typeof additionalData.payment_details === 'string') {
                  updateData.payment_details = JSON.parse(
                    additionalData.payment_details,
                  );
                } else if (
                  typeof additionalData.payment_details === 'object'
                ) {
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
            .findByIdAndUpdate(recentPendingStatus._id, updateData, {
              new: true,
            })
            .exec();

          if (updatedStatus) {
            return updatedStatus;
          }
        }

        throw new NotFoundException(
          `Order with collect_request_id ${collectRequestId} not found`,
        );
      }

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
        return updatedStatus;
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      this.logger.error(
        `Error updating transaction status for ${collectRequestId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
