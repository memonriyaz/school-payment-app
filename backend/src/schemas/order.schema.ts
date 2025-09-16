import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class StudentInfo {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  email: string;
}

export const StudentInfoSchema = SchemaFactory.createForClass(StudentInfo);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  school_id: string;

  @Prop({ required: true })
  trustee_id: string;

  @Prop({ type: StudentInfoSchema, required: true })
  student_info: StudentInfo;

  @Prop({ required: true })
  gateway_name: string;

  @Prop({ unique: true })
  custom_order_id: string;

  @Prop()
  gateway_reference_id: string;

  @Prop()
  description: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ school_id: 1 });
OrderSchema.index({ trustee_id: 1 });
