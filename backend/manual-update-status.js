#!/usr/bin/env node

/**
 * Manual Status Update Script
 *
 * This script manually updates the payment status for a specific collect_request_id
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔧 Manual Payment Status Update');
console.log('================================');

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Order Schema (simplified)
const OrderSchema = new mongoose.Schema(
  {
    school_id: String,
    trustee_id: String,
    student_info: {
      name: String,
      id: String,
      email: String,
    },
    gateway_name: String,
    custom_order_id: String,
    gateway_reference_id: String,
    description: String,
  },
  { timestamps: true },
);

// OrderStatus Schema (simplified)
const OrderStatusSchema = new mongoose.Schema(
  {
    collect_id: mongoose.Schema.Types.ObjectId,
    order_amount: Number,
    transaction_amount: Number,
    status: String,
    payment_mode: String,
    bank_reference: String,
    payment_message: String,
    payment_time: Date,
    error_message: String,
    callback_received: Boolean,
    callback_time: String,
    payment_details: Object, // Changed to Object type
  },
  { timestamps: true },
);

async function updatePaymentStatus(
  collectRequestId,
  newStatus = 'SUCCESS',
  transactionAmount = 1234,
) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Order = mongoose.model('Order', OrderSchema);
    const OrderStatus = mongoose.model('OrderStatus', OrderStatusSchema);

    // Find the order by gateway_reference_id
    console.log(
      `\n🔍 Looking for order with collect_request_id: ${collectRequestId}`,
    );
    const order = await Order.findOne({
      gateway_reference_id: collectRequestId,
    }).exec();

    if (!order) {
      console.log('❌ Order not found with that collect_request_id');

      // Try to update the most recent pending payment instead
      console.log('🔄 Trying to update most recent pending payment...');
      const recentPending = await OrderStatus.findOne({
        status: 'PENDING',
      })
        .sort({ createdAt: -1 })
        .exec();

      if (recentPending) {
        console.log(`✅ Found recent pending payment: ${recentPending._id}`);

        const updated = await OrderStatus.findByIdAndUpdate(
          recentPending._id,
          {
            status: newStatus,
            transaction_amount: transactionAmount,
            callback_received: true,
            callback_time: new Date().toISOString(),
            payment_details: {
              collect_request_id: collectRequestId,
              status: newStatus,
              amount: transactionAmount,
              updated_manually: true,
              updated_at: new Date().toISOString(),
            },
          },
          { new: true },
        ).exec();

        console.log(`✅ Updated payment status to ${newStatus}`);
        console.log(`   Order Status ID: ${updated._id}`);
        console.log(`   Status: ${updated.status}`);
        console.log(`   Transaction Amount: ₹${updated.transaction_amount}`);
        console.log(`   Callback Received: ${updated.callback_received}`);

        return updated;
      } else {
        console.log('❌ No pending payments found to update');
        return null;
      }
    }

    console.log(`✅ Found order: ${order._id}`);
    console.log(`   Custom Order ID: ${order.custom_order_id}`);
    console.log(`   Gateway Reference ID: ${order.gateway_reference_id}`);

    // Update the order status
    const updated = await OrderStatus.findOneAndUpdate(
      { collect_id: order._id },
      {
        status: newStatus,
        transaction_amount: transactionAmount,
        callback_received: true,
        callback_time: new Date().toISOString(),
        payment_details: {
          collect_request_id: collectRequestId,
          status: newStatus,
          amount: transactionAmount,
          updated_manually: true,
          updated_at: new Date().toISOString(),
        },
      },
      { new: true, upsert: true },
    ).exec();

    console.log(`✅ Successfully updated payment status!`);
    console.log(`   Order Status ID: ${updated._id}`);
    console.log(`   Status: ${updated.status}`);
    console.log(`   Transaction Amount: ₹${updated.transaction_amount}`);
    console.log(`   Callback Received: ${updated.callback_received}`);
    console.log(`   Payment Details:`, updated.payment_details);

    return updated;
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function main() {
  // Update the most recent payment
  const collectRequestId = '68c83663154d1bce65b47547';

  console.log(`Updating payment with collect_request_id: ${collectRequestId}`);

  try {
    const result = await updatePaymentStatus(collectRequestId, 'SUCCESS', 1234);

    if (result) {
      console.log('\n🎉 Payment status updated successfully!');
      console.log(
        'The payment should now show as SUCCESS in your application.',
      );
    } else {
      console.log('\n❌ Failed to update payment status');
    }
  } catch (error) {
    console.error('Script failed:', error.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { updatePaymentStatus };
