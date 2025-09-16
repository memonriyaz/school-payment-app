#!/usr/bin/env node

/**
 * Check Recent Payments Script
 *
 * This script connects to the database and shows recent payments to help debug callback issues
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 Checking Recent Payments in Database');
console.log('=======================================');

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
    payment_details: Object,
  },
  { timestamps: true },
);

async function checkRecentPayments() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // List all collections
    console.log('\n📚 Available Collections:');
    console.log('=========================');
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    collections.forEach((collection) => {
      console.log(`- ${collection.name}`);
    });

    const Order = mongoose.model('Order', OrderSchema);
    const OrderStatus = mongoose.model('OrderStatus', OrderStatusSchema);

    // Get recent orders
    console.log('\n📋 Recent Orders (Last 10):');
    console.log('============================');
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    if (recentOrders.length === 0) {
      console.log('No orders found in database');
    } else {
      recentOrders.forEach((order, index) => {
        console.log(`${index + 1}. Order ID: ${order._id}`);
        console.log(`   Custom Order ID: ${order.custom_order_id}`);
        console.log(
          `   Gateway Reference ID: ${order.gateway_reference_id || 'Not set'}`,
        );
        console.log(`   School ID: ${order.school_id}`);
        console.log(`   Student: ${order.student_info?.name || 'N/A'}`);
        console.log(`   Created: ${order.createdAt}`);
        console.log('   ---');
      });
    }

    // Get recent order statuses
    console.log('\n📊 Recent Order Statuses (Last 10):');
    console.log('===================================');
    const recentStatuses = await OrderStatus.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    if (recentStatuses.length === 0) {
      console.log('No order statuses found in database');
    } else {
      for (const status of recentStatuses) {
        // Find the corresponding order
        const order = await Order.findById(status.collect_id).exec();

        console.log(`1. Status ID: ${status._id}`);
        console.log(`   Order ID: ${status.collect_id}`);
        console.log(
          `   Custom Order ID: ${order?.custom_order_id || 'Not found'}`,
        );
        console.log(
          `   Gateway Reference ID: ${order?.gateway_reference_id || 'Not set'}`,
        );
        console.log(`   Status: ${status.status}`);
        console.log(`   Order Amount: ₹${status.order_amount || 0}`);
        console.log(
          `   Transaction Amount: ₹${status.transaction_amount || 0}`,
        );
        console.log(`   Payment Mode: ${status.payment_mode || 'N/A'}`);
        console.log(
          `   Callback Received: ${status.callback_received ? 'Yes' : 'No'}`,
        );
        console.log(`   Created: ${status.createdAt}`);
        console.log(`   Updated: ${status.updatedAt}`);
        console.log('   ---');
      }
    }

    // Summary
    const totalOrders = await Order.countDocuments({});
    const totalStatuses = await OrderStatus.countDocuments({});
    const pendingPayments = await OrderStatus.countDocuments({
      status: 'PENDING',
    });
    const successfulPayments = await OrderStatus.countDocuments({
      status: 'SUCCESS',
    });
    const failedPayments = await OrderStatus.countDocuments({
      status: 'FAILED',
    });

    console.log('\n📈 Payment Statistics:');
    console.log('======================');
    console.log(`Total Orders: ${totalOrders}`);
    console.log(`Total Order Statuses: ${totalStatuses}`);
    console.log(`Pending Payments: ${pendingPayments}`);
    console.log(`Successful Payments: ${successfulPayments}`);
    console.log(`Failed Payments: ${failedPayments}`);

    console.log('\n🏁 Database check completed');
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

if (require.main === module) {
  checkRecentPayments().catch(console.error);
}

module.exports = { checkRecentPayments };
