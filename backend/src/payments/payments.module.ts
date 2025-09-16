import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TransactionsService } from './transactions.service';
import { PaymentSchedulerService } from './payment-scheduler.service';
import { Order, OrderSchema } from '../schemas/order.schema';
import { OrderStatus, OrderStatusSchema } from '../schemas/order-status.schema';
import { WebhookLogs, WebhookLogsSchema } from '../schemas/webhook-logs.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderStatus.name, schema: OrderStatusSchema },
      { name: WebhookLogs.name, schema: WebhookLogsSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, TransactionsService, PaymentSchedulerService],
  exports: [PaymentsService, TransactionsService, PaymentSchedulerService],
})
export class PaymentsModule {}
