import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WebhookLogsDocument = WebhookLogs & Document;

@Schema({ timestamps: true })
export class WebhookLogs {
  @Prop({ type: Object, required: true })
  payload: Record<string, any>;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true, default: 'RECEIVED' })
  status: string;

  @Prop()
  processed_at: Date;

  @Prop()
  error_message: string;
}

export const WebhookLogsSchema = SchemaFactory.createForClass(WebhookLogs);

// Create index for better query performance
WebhookLogsSchema.index({ createdAt: -1 });
WebhookLogsSchema.index({ status: 1 });
