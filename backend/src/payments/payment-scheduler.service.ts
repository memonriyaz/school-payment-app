import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentSchedulerService {
  private readonly logger = new Logger(PaymentSchedulerService.name);

  constructor(private paymentsService: PaymentsService) {
    this.logger.log(
      'PaymentSchedulerService initialized - automatic payment cleanup is enabled',
    );
    this.logger.log('Schedule: Every 10 minutes for 30+ minute old payments');
    this.logger.log('Schedule: Daily at 2 AM for 24+ hour old payments');
  }

  /**
   * Run every 10 minutes to check for abandoned payments
   * This will cancel payments that have been PENDING for more than 30 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleAbandonedPayments() {
    try {
      this.logger.log('=== SCHEDULED PAYMENT CLEANUP ===');
      this.logger.log('Running abandoned payment cancellation job...');

      const result = await this.paymentsService.cancelAbandonedPayments(30); // 30 minutes timeout

      this.logger.log(`Cleanup completed: ${result.message}`);
      this.logger.log(
        `Total found: ${result.totalFound}, Total cancelled: ${result.totalCancelled}`,
      );
      this.logger.log('================================');
    } catch (error) {
      this.logger.error('Error in scheduled payment cleanup:', error.message);
      this.logger.error('Error details:', error);
    }
  }

  /**
   * Run once a day to clean up very old abandoned payments
   * This will cancel payments that have been PENDING for more than 24 hours
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleVeryOldAbandonedPayments() {
    try {
      this.logger.log('=== DAILY PAYMENT CLEANUP ===');
      this.logger.log(
        'Running daily cleanup for very old abandoned payments...',
      );

      const result = await this.paymentsService.cancelAbandonedPayments(1440); // 24 hours = 1440 minutes

      this.logger.log(`Daily cleanup completed: ${result.message}`);
      this.logger.log(
        `Total found: ${result.totalFound}, Total cancelled: ${result.totalCancelled}`,
      );
      this.logger.log('=============================');
    } catch (error) {
      this.logger.error('Error in daily payment cleanup:', error.message);
      this.logger.error('Error details:', error);
    }
  }

  /**
   * Manual trigger for payment cleanup (can be called via API)
   */
  async triggerManualCleanup(timeoutMinutes: number = 30) {
    try {
      this.logger.log('=== MANUAL PAYMENT CLEANUP ===');
      this.logger.log(
        `Manually triggering cleanup with ${timeoutMinutes} minutes timeout...`,
      );

      const result =
        await this.paymentsService.cancelAbandonedPayments(timeoutMinutes);

      this.logger.log(`Manual cleanup completed: ${result.message}`);
      this.logger.log('==============================');

      return result;
    } catch (error) {
      this.logger.error('Error in manual payment cleanup:', error.message);
      throw error;
    }
  }
}
