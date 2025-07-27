import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'hackathon-07-26-2025';

async function checkMongoDB() {
  console.log('🔍 MongoDB Database Inspector\n');
  
  let client;
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected successfully\n');
    
    // Get database
    const db = client.db(MONGODB_DB_NAME);
    console.log(`📊 Database: ${MONGODB_DB_NAME}\n`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Found ${collections.length} collections:\n`);
    
    // Check each collection
    for (const collInfo of collections) {
      const collection = db.collection(collInfo.name);
      const count = await collection.countDocuments();
      const sample = await collection.findOne();
      
      console.log(`📋 ${collInfo.name}`);
      console.log(`   Documents: ${count}`);
      
      if (sample) {
        const fields = Object.keys(sample);
        console.log(`   Fields: ${fields.join(', ')}`);
        
        // Check for startup_id field
        if (sample.startup_id) {
          console.log(`   ✓ Has startup_id field`);
        }
      } else {
        console.log(`   (empty collection)`);
      }
      console.log('');
    }
    
    // Collections expected by the webhook service
    const expectedCollections = ['reviews', 'metrics', 'sales', 'customers'];
    console.log('🎯 Expected collections for webhook monitoring:');
    
    for (const name of expectedCollections) {
      const exists = collections.some(c => c.name === name);
      console.log(`   ${name}: ${exists ? '✅ exists' : '❌ missing'}`);
    }
    
    // Database stats
    console.log('\n📈 Database Stats:');
    const stats = await db.stats();
    console.log(`   Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Storage: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n👋 Disconnected from MongoDB');
    }
  }
}

// Run the check
checkMongoDB();