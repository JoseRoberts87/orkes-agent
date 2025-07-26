import { MongoClient } from 'mongodb';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'coo_assistant';
const ORKES_WEBHOOK_URL = process.env.ORKES_WEBHOOK_URL; // Get this from Orkes webhook setup
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';

// Express app for health checks
const app = express();
const PORT = process.env.WEBHOOK_SERVICE_PORT || 3100;

class MongoDBWebhookService {
  constructor() {
    this.client = null;
    this.db = null;
    this.changeStreams = new Map();
    this.collections = {
      reviews: process.env.MONGODB_REVIEWS_COLLECTION || 'reviews',
      metrics: process.env.MONGODB_METRICS_COLLECTION || 'metrics',
      sales: process.env.MONGODB_SALES_COLLECTION || 'sales',
      customers: process.env.MONGODB_CUSTOMERS_COLLECTION || 'customers'
    };
  }

  async initialize() {
    console.log('🚀 Starting MongoDB Webhook Service...');
    
    // Connect to MongoDB
    this.client = new MongoClient(MONGODB_URI);
    await this.client.connect();
    this.db = this.client.db(MONGODB_DATABASE);
    console.log(`✅ Connected to MongoDB: ${MONGODB_DATABASE}`);
    
    // Check webhook URL
    if (!ORKES_WEBHOOK_URL) {
      console.error('❌ ORKES_WEBHOOK_URL not set in environment variables');
      console.log('Please configure webhook in Orkes and set the URL');
      process.exit(1);
    }
    
    // Start change streams
    await this.startChangeStreams();
    
    // Start health check server
    this.startHealthServer();
    
    console.log('\n📡 MongoDB Webhook Service Active');
    console.log(`🔗 Sending webhooks to: ${ORKES_WEBHOOK_URL}`);
    console.log(`📊 Monitoring collections: ${Object.keys(this.collections).join(', ')}\n`);
  }
  
  async startChangeStreams() {
    for (const [type, collectionName] of Object.entries(this.collections)) {
      try {
        const collection = this.db.collection(collectionName);
        
        // Create change stream with resume capability
        const changeStream = collection.watch(
          [
            {
              $match: {
                operationType: { $in: ['insert', 'update', 'replace'] }
              }
            }
          ],
          { 
            fullDocument: 'updateLookup',
            resumeAfter: null // Will be set if we need to resume
          }
        );
        
        // Handle change events
        changeStream.on('change', async (change) => {
          await this.handleChange(type, collectionName, change);
        });
        
        changeStream.on('error', (error) => {
          console.error(`❌ Change stream error for ${collectionName}:`, error);
          // Attempt to recreate the stream
          this.recreateChangeStream(type, collectionName);
        });
        
        this.changeStreams.set(collectionName, changeStream);
        console.log(`✅ Change stream active for ${type} (${collectionName})`);
        
      } catch (error) {
        console.error(`Failed to create change stream for ${collectionName}:`, error);
      }
    }
  }
  
  async handleChange(type, collectionName, change) {
    try {
      console.log(`\n📝 Change detected in ${type}: ${change.operationType}`);
      
      const document = change.fullDocument || {};
      const documentId = change.documentKey?._id;
      
      // Prepare webhook payload for Orkes
      const webhookPayload = {
        // Standard webhook fields expected by Orkes
        event: `mongodb.${type}.${change.operationType}`,
        timestamp: new Date().toISOString(),
        
        // Custom data for our workflow
        data: {
          type,
          collection: collectionName,
          operation: change.operationType,
          documentId: documentId?.toString(),
          startup_id: document.startup_id || 'unknown',
          document: this.sanitizeDocument(document)
        },
        
        // Metadata
        metadata: {
          source: 'mongodb-change-stream',
          database: MONGODB_DATABASE,
          collection: collectionName
        }
      };
      
      // Send webhook to Orkes
      await this.sendWebhook(webhookPayload);
      
    } catch (error) {
      console.error('Error handling change:', error);
    }
  }
  
  async sendWebhook(payload) {
    try {
      const response = await fetch(ORKES_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': WEBHOOK_SECRET,
          'X-Event-Type': payload.event,
          'X-Timestamp': payload.timestamp
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log(`✅ Webhook sent successfully for ${payload.event}`);
        const result = await response.text();
        if (result) {
          console.log(`   Response: ${result}`);
        }
      } else {
        console.error(`❌ Webhook failed: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        if (errorText) {
          console.error(`   Error: ${errorText}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to send webhook:', error);
    }
  }
  
  sanitizeDocument(doc) {
    // Remove sensitive fields and MongoDB internals
    const { _id, ...sanitized } = doc;
    return sanitized;
  }
  
  async recreateChangeStream(type, collectionName) {
    console.log(`🔄 Attempting to recreate change stream for ${collectionName}...`);
    
    // Close existing stream
    const existingStream = this.changeStreams.get(collectionName);
    if (existingStream) {
      await existingStream.close();
    }
    
    // Wait a bit before recreating
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to recreate
    try {
      const collection = this.db.collection(collectionName);
      const changeStream = collection.watch(
        [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }],
        { fullDocument: 'updateLookup' }
      );
      
      changeStream.on('change', async (change) => {
        await this.handleChange(type, collectionName, change);
      });
      
      this.changeStreams.set(collectionName, changeStream);
      console.log(`✅ Successfully recreated change stream for ${collectionName}`);
    } catch (error) {
      console.error(`Failed to recreate change stream for ${collectionName}:`, error);
    }
  }
  
  startHealthServer() {
    app.get('/health', (req, res) => {
      const status = {
        status: 'healthy',
        service: 'mongodb-webhook-service',
        timestamp: new Date().toISOString(),
        mongodb: this.client?.topology?.isConnected() ? 'connected' : 'disconnected',
        changeStreams: Array.from(this.changeStreams.keys())
      };
      res.json(status);
    });
    
    app.listen(PORT, () => {
      console.log(`💚 Health check available at http://localhost:${PORT}/health`);
    });
  }
  
  async shutdown() {
    console.log('\nShutting down MongoDB Webhook Service...');
    
    // Close all change streams
    for (const [name, stream] of this.changeStreams) {
      await stream.close();
      console.log(`Closed change stream: ${name}`);
    }
    
    // Close MongoDB connection
    if (this.client) {
      await this.client.close();
      console.log('Closed MongoDB connection');
    }
    
    console.log('Shutdown complete');
  }
}

// Main execution
async function main() {
  const service = new MongoDBWebhookService();
  
  try {
    await service.initialize();
  } catch (error) {
    console.error('Failed to initialize service:', error);
    process.exit(1);
  }
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await service.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await service.shutdown();
    process.exit(0);
  });
}

// Run the service
main();