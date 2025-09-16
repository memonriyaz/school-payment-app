#!/usr/bin/env node

/**
 * Decode EDVIRON API Key to find the correct school_id
 */

const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './.env' });

const API_KEY = process.env.API_KEY;

console.log('🔍 EDVIRON API Key Analysis');
console.log('============================');

if (!API_KEY) {
  console.error('❌ API_KEY not found in environment variables');
  process.exit(1);
}

console.log('API_KEY preview:', API_KEY.substring(0, 50) + '...');

try {
  // Decode the JWT without verification to see its payload
  const decoded = jwt.decode(API_KEY);

  if (decoded) {
    console.log('\n✅ API Key decoded successfully!');
    console.log('Decoded payload:', JSON.stringify(decoded, null, 2));

    // Extract useful information
    if (decoded.trusteeId) {
      console.log(`\n🏫 Trustee ID found: ${decoded.trusteeId}`);
      console.log('   This is likely the trustee_id to use in requests');
    }

    if (decoded.schoolId) {
      console.log(`🏫 School ID found: ${decoded.schoolId}`);
      console.log('   This is likely the school_id to use in requests');
    }

    if (decoded.iat) {
      const issuedAt = new Date(decoded.iat * 1000);
      console.log(`📅 Token issued at: ${issuedAt.toISOString()}`);
    }

    if (decoded.exp) {
      const expiresAt = new Date(decoded.exp * 1000);
      const now = new Date();
      console.log(`⏰ Token expires at: ${expiresAt.toISOString()}`);

      if (expiresAt < now) {
        console.log(
          "❌ TOKEN IS EXPIRED! This is likely why you're getting 500 errors.",
        );
      } else {
        console.log('✅ Token is still valid');
      }
    }

    // Suggest test values
    console.log('\n💡 Suggested test values for payment requests:');
    if (decoded.trusteeId) {
      console.log(`   trustee_id: "${decoded.trusteeId}"`);
    }
    if (decoded.schoolId) {
      console.log(`   school_id: "${decoded.schoolId}"`);
    } else {
      console.log(
        '   school_id: Try using a real school ID from the EDVIRON system',
      );
    }
  } else {
    console.log('❌ Could not decode API key - it might not be a JWT');
  }
} catch (error) {
  console.error('❌ Error decoding API key:', error.message);
  console.log('\n💡 The API key might be:');
  console.log('   - Not a JWT token');
  console.log('   - Corrupted');
  console.log('   - In a different format than expected');
}

console.log('\n🏁 Analysis complete');
