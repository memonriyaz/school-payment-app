const { MongoClient } = require('mongodb');

async function fixPaymentDetailsSchema() {
  const uri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/edviron_payment_db';
  const client = new MongoClient(uri);

  try {
    console.log('🔧 Fixing payment_details schema in MongoDB...');
    await client.connect();

    const db = client.db();
    const collection = db.collection('orderstatuses');

    // First, let's see what we're working with
    console.log('\n📊 Checking current records with payment_details:');
    const recordsWithPaymentDetails = await collection
      .find({
        payment_details: { $exists: true },
      })
      .toArray();

    console.log(
      `Found ${recordsWithPaymentDetails.length} records with payment_details`,
    );

    recordsWithPaymentDetails.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record._id}`);
      console.log(`   Type: ${typeof record.payment_details}`);
      console.log(`   Value:`, record.payment_details);
    });

    // Update any string payment_details to be proper objects
    console.log('\n🔄 Converting string payment_details to objects...');

    const stringPaymentDetails = await collection
      .find({
        payment_details: { $type: 'string' },
      })
      .toArray();

    console.log(
      `Found ${stringPaymentDetails.length} records with string payment_details`,
    );

    for (const record of stringPaymentDetails) {
      try {
        let objectValue;
        try {
          objectValue = JSON.parse(record.payment_details);
        } catch {
          // If it's not valid JSON, wrap it in an object
          objectValue = { raw_value: record.payment_details };
        }

        await collection.updateOne(
          { _id: record._id },
          { $set: { payment_details: objectValue } },
        );

        console.log(`✅ Updated record ${record._id}`);
      } catch (error) {
        console.error(
          `❌ Failed to update record ${record._id}:`,
          error.message,
        );
      }
    }

    // Now let's test inserting a new record with object payment_details
    console.log('\n🧪 Testing object insertion...');
    try {
      const testRecord = {
        collect_id: new require('mongodb').ObjectId(),
        order_amount: 100,
        status: 'TEST',
        payment_details: {
          EdvironCollectRequestId: 'test_12345',
          status: 'SUCCESS',
          callback_timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(testRecord);
      console.log(
        '✅ Successfully inserted test record with object payment_details:',
        result.insertedId,
      );

      // Clean up test record
      await collection.deleteOne({ _id: result.insertedId });
      console.log('🧹 Cleaned up test record');
    } catch (error) {
      console.error('❌ Failed to insert test record:', error.message);
    }

    console.log('\n✅ Schema fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
  } finally {
    await client.close();
    console.log('📝 Database connection closed');
  }
}

// Run the fix
fixPaymentDetailsSchema().catch(console.error);
