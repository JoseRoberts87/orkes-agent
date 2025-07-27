import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'hackathon-07-26-2025';
const ORKES_WEBHOOK_URL = process.env.ORKES_WEBHOOK_URL;

// Sample data generators
const generateReview = (startupId) => ({
  startup_id: startupId,
  customer_name: `Customer ${Math.floor(Math.random() * 1000)}`,
  rating: Math.floor(Math.random() * 5) + 1,
  comment: `This is a test review generated at ${new Date().toISOString()}`,
  product: `Product ${Math.floor(Math.random() * 10)}`,
  sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
  created_at: new Date(),
  source: 'test-trigger'
});

const generateMetrics = (startupId) => ({
  startup_id: startupId,
  date: new Date(),
  revenue: Math.floor(Math.random() * 100000) + 10000,
  orders: Math.floor(Math.random() * 1000) + 100,
  conversion_rate: (Math.random() * 5 + 1).toFixed(2),
  avg_order_value: Math.floor(Math.random() * 500) + 50,
  customer_acquisition_cost: Math.floor(Math.random() * 200) + 20,
  churn_rate: (Math.random() * 10).toFixed(2),
  source: 'test-trigger'
});

const generateSales = (startupId) => ({
  startup_id: startupId,
  order_id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  customer_id: `CUST-${Math.floor(Math.random() * 10000)}`,
  amount: Math.floor(Math.random() * 1000) + 50,
  products: [
    {
      name: `Product ${Math.floor(Math.random() * 10)}`,
      quantity: Math.floor(Math.random() * 5) + 1,
      price: Math.floor(Math.random() * 100) + 10
    }
  ],
  status: 'completed',
  created_at: new Date(),
  source: 'test-trigger'
});

const generateCustomer = (startupId) => ({
  startup_id: startupId,
  customer_id: `CUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  name: `Test Customer ${Math.floor(Math.random() * 1000)}`,
  email: `customer${Math.floor(Math.random() * 10000)}@test.com`,
  lifetime_value: Math.floor(Math.random() * 10000) + 100,
  total_orders: Math.floor(Math.random() * 50) + 1,
  first_purchase_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
  last_purchase_date: new Date(),
  status: 'active',
  source: 'test-trigger'
});

// Function to manually send webhook for testing
async function sendManualWebhook(data) {
  if (!ORKES_WEBHOOK_URL) {
    console.log('⚠️  No ORKES_WEBHOOK_URL configured, skipping manual webhook');
    return;
  }
  
  const webhookPayload = {
    event: `mongodb.${data.type}.insert`,
    timestamp: new Date().toISOString(),
    data: {
      type: data.type,
      collection: data.collection,
      operation: 'insert',
      documentId: data.id.toString(),
      startup_id: data.startup_id,
      document: data.document
    },
    metadata: {
      source: 'manual-trigger',
      database: MONGODB_DB_NAME,
      collection: data.collection
    }
  };
  
  try {
    console.log(`\n📤 Sending manual webhook to Orkes...`);
    const response = await fetch(ORKES_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.WEBHOOK_SECRET || '',
        'X-Event-Type': webhookPayload.event,
        'X-Timestamp': webhookPayload.timestamp
      },
      body: JSON.stringify(webhookPayload)
    });
    
    if (response.ok) {
      console.log(`✅ Manual webhook sent successfully`);
      const result = await response.text();
      if (result) {
        console.log(`   Response: ${result}`);
      }
    } else {
      console.error(`❌ Manual webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error sending manual webhook:', error.message);
  }
}

async function triggerWorkflow() {
  console.log('🚀 MongoDB Workflow Trigger Tool\n');
  
  const args = process.argv.slice(2);
  const type = args[0] || 'all';
  const startupId = args[1] || 'test-startup-001';
  const sendWebhook = args.includes('--webhook');
  
  let client;
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    console.log(`✅ Connected to database: ${MONGODB_DB_NAME}\n`);
    
    // Insert data based on type
    const results = [];
    
    if (type === 'review' || type === 'all') {
      console.log('📝 Inserting review...');
      const review = generateReview(startupId);
      const result = await db.collection('reviews').insertOne(review);
      results.push({ type: 'review', id: result.insertedId, data: review, collection: 'reviews', startup_id: startupId, document: review });
      console.log(`✅ Review inserted with ID: ${result.insertedId}`);
    }
    
    if (type === 'metrics' || type === 'all') {
      console.log('📊 Inserting metrics...');
      const metrics = generateMetrics(startupId);
      const result = await db.collection('metrics').insertOne(metrics);
      results.push({ type: 'metrics', id: result.insertedId, data: metrics, collection: 'metrics', startup_id: startupId, document: metrics });
      console.log(`✅ Metrics inserted with ID: ${result.insertedId}`);
    }
    
    if (type === 'sales' || type === 'all') {
      console.log('💰 Inserting sales data...');
      const sales = generateSales(startupId);
      const result = await db.collection('sales').insertOne(sales);
      results.push({ type: 'sales', id: result.insertedId, data: sales, collection: 'sales', startup_id: startupId, document: sales });
      console.log(`✅ Sales data inserted with ID: ${result.insertedId}`);
    }
    
    if (type === 'customer' || type === 'all') {
      console.log('👤 Inserting customer...');
      const customer = generateCustomer(startupId);
      const result = await db.collection('customers').insertOne(customer);
      results.push({ type: 'customer', id: result.insertedId, data: customer, collection: 'customers', startup_id: startupId, document: customer });
      console.log(`✅ Customer inserted with ID: ${result.insertedId}`);
    }
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`- Startup ID: ${startupId}`);
    console.log(`- Documents inserted: ${results.length}`);
    console.log('- Types:', results.map(r => r.type).join(', '));
    
    // Send manual webhooks if requested
    if (sendWebhook) {
      console.log('\n🔄 Sending manual webhooks to Orkes...');
      for (const result of results) {
        await sendManualWebhook(result);
        // Small delay between webhooks
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('\n🎯 Next steps:');
    if (!sendWebhook) {
      console.log('1. Make sure the webhook service is running: npm run webhook:mongo');
      console.log('2. The webhook service will detect these changes and trigger workflows');
      console.log('3. Or run with --webhook flag to send webhooks directly');
    } else {
      console.log('1. Check Orkes dashboard for workflow executions');
      console.log('2. Webhooks were sent directly to Orkes');
    }
    console.log('3. Check Orkes dashboard at: https://developer.orkescloud.com');
    
    // Show sample data
    if (args.includes('--show-data')) {
      console.log('\n📄 Inserted Data:');
      results.forEach(result => {
        console.log(`\n${result.type.toUpperCase()}:`);
        console.log(JSON.stringify(result.data, null, 2));
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n👋 Disconnected from MongoDB');
    }
  }
}

// Show usage if --help
if (process.argv.includes('--help')) {
  console.log(`
MongoDB Workflow Trigger Tool

Usage: npm run trigger-workflow [type] [startup-id] [options]

Arguments:
  type        Type of data to insert: review, metrics, sales, customer, or all (default: all)
  startup-id  Startup ID to use for the data (default: test-startup-001)
  
Options:
  --show-data  Display the inserted data
  --webhook    Send webhooks directly to Orkes (bypasses MongoDB change streams)
  --help       Show this help message

Examples:
  npm run trigger-workflow                         # Insert all types for test-startup-001
  npm run trigger-workflow review                  # Insert only a review
  npm run trigger-workflow metrics startup-123     # Insert metrics for startup-123
  npm run trigger-workflow all startup-456 --show-data  # Insert all types and show data
  npm run trigger-workflow all test-001 --webhook  # Insert data and send webhooks directly
`);
  process.exit(0);
}

// Run the trigger
triggerWorkflow();