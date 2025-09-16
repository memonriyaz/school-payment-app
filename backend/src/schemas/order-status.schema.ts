import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderStatusDocument = OrderStatus & Document;

@Schema({ timestamps: true })
export class OrderStatus {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  collect_id: Types.ObjectId;

  @Prop({ required: true })
  order_amount: number;

  @Prop()
  transaction_amount: number;

  @Prop()
  payment_mode: string;

  @Prop({ type: Object, default: null })
  payment_details: Record<string, any>;

  @Prop()
  bank_reference: string;

  @Prop()
  payment_message: string;

  @Prop({ required: true, default: 'PENDING' })
  status: string;

  @Prop()
  error_message: string;

  @Prop()
  payment_time: Date;

  @Prop()
  callback_received: boolean;

  @Prop()
  callback_time: string;
}

export const OrderStatusSchema = SchemaFactory.createForClass(OrderStatus);

// Create indexes for better query performance
OrderStatusSchema.index({ collect_id: 1 });
OrderStatusSchema.index({ status: 1 });
OrderStatusSchema.index({ payment_time: -1 });
