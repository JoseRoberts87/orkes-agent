import { MongoClient } from 'mongodb';
import { EventEmitter } from 'events';
import { COOAssistantOrchestrator } from '../index.js';
import dotenv from 'dotenv';

dotenv.config();

export class MongoDBMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      database: process.env.MONGODB_DATABASE || 'coo_assistant',
      collections: {
        reviews: process.env.MONGODB_REVIEWS_COLLECTION || 'reviews',
        metrics: process.env.MONGODB_METRICS_COLLECTION || 'metrics',
        sales: process.env.MONGODB_SALES_COLLECTION || 'sales',
        customers: process.env.MONGODB_CUSTOMERS_COLLECTION || 'customers'
      },
      pollInterval: 5000, // Check for changes every 5 seconds
      batchDelay: 3000, // Wait 3 seconds to batch changes
      useChangeStreams: true, // Use MongoDB change streams if available
      ...options
    };
    
    this.client = null;
    this.db = null;
    this.orchestrator = null;
    this.changeStreams = new Map();
    this.pendingChanges = new Map();
    this.batchTimer = null;
    this.lastProcessedTimestamps = new Map();
  }
  
  async initialize() {
    console.log('🚀 Initializing MongoDB Monitor...');
    
    try {
      // Connect to MongoDB
      this.client = new MongoClient(this.options.uri);
      await this.client.connect();
      this.db = this.client.db(this.options.database);
      console.log(`✅ Connected to MongoDB: ${this.options.database}`);
      
      // Initialize orchestrator
      this.orchestrator = new COOAssistantOrchestrator();
      await this.orchestrator.initialize();
      console.log('✅ Orchestrator initialized');
      
      // Initialize last processed timestamps
      await this.initializeTimestamps();
      
      // Start monitoring
      if (this.options.useChangeStreams) {
        await this.startChangeStreams();
      } else {
        await this.startPolling();
      }
      
      console.log(`\n📊 MongoDB Monitor Active`);
      console.log(`🗄️  Database: ${this.options.database}`);
      console.log(`📁 Collections: ${Object.keys(this.options.collections).join(', ')}`);
      console.log(`\n💡 Insert or update documents to trigger analysis\n`);
      
    } catch (error) {
      console.error('Failed to initialize MongoDB monitor:', error);
      throw error;
    }
  }
  
  async initializeTimestamps() {
    // Get the latest document timestamp from each collection
    for (const [type, collectionName] of Object.entries(this.options.collections)) {
      try {
        const collection = this.db.collection(collectionName);
        const latest = await collection.findOne(
          {},
          { sort: { updatedAt: -1, createdAt: -1, _id: -1 } }
        );
        
        if (latest) {
          const timestamp = latest.updatedAt || latest.createdAt || latest._id.getTimestamp();
          this.lastProcessedTimestamps.set(collectionName, timestamp);
          console.log(`📅 Starting from ${type}: ${timestamp}`);
        }
      } catch (error) {
        console.warn(`Could not get initial timestamp for ${collectionName}:`, error.message);
      }
    }
  }
  
  async startChangeStreams() {
    console.log('🔄 Starting MongoDB Change Streams...');
    
    for (const [type, collectionName] of Object.entries(this.options.collections)) {
      try {
        const collection = this.db.collection(collectionName);
        
        // Create change stream
        const changeStream = collection.watch(
          [
            {
              $match: {
                operationType: { $in: ['insert', 'update', 'replace'] }
              }
            }
          ],
          { fullDocument: 'updateLookup' }
        );
        
        // Handle changes
        changeStream.on('change', (change) => {
          this.handleChange(type, collectionName, change);
        });
        
        changeStream.on('error', (error) => {
          console.error(`Change stream error for ${collectionName}:`, error);
          this.emit('error', { collection: collectionName, error });
        });
        
        this.changeStreams.set(collectionName, changeStream);
        console.log(`✅ Change stream active for ${type} (${collectionName})`);
        
      } catch (error) {
        console.warn(`Could not create change stream for ${collectionName}:`, error.message);
        console.log(`Falling back to polling for ${collectionName}`);
      }
    }
    
    // If no change streams, fall back to polling
    if (this.changeStreams.size === 0) {
      console.log('Change streams not available, using polling instead');
      await this.startPolling();
    }
  }
  
  async startPolling() {
    console.log('🔄 Starting MongoDB Polling...');
    
    // Poll each collection
    setInterval(async () => {
      for (const [type, collectionName] of Object.entries(this.options.collections)) {
        await this.pollCollection(type, collectionName);
      }
    }, this.options.pollInterval);
  }
  
  async pollCollection(type, collectionName) {
    try {
      const collection = this.db.collection(collectionName);
      const lastTimestamp = this.lastProcessedTimestamps.get(collectionName) || new Date(0);
      
      // Find documents updated since last check
      const query = {
        $or: [
          { updatedAt: { $gt: lastTimestamp } },
          { createdAt: { $gt: lastTimestamp } },
          { _id: { $gt: lastTimestamp } } // For ObjectId-based timestamps
        ]
      };
      
      const newDocuments = await collection.find(query)
        .sort({ updatedAt: 1, createdAt: 1, _id: 1 })
        .toArray();
      
      if (newDocuments.length > 0) {
        console.log(`📝 Found ${newDocuments.length} new/updated ${type} documents`);
        
        // Process each document
        for (const doc of newDocuments) {
          this.handleChange(type, collectionName, {
            operationType: 'update',
            fullDocument: doc,
            documentKey: { _id: doc._id }
          });
        }
        
        // Update last processed timestamp
        const lastDoc = newDocuments[newDocuments.length - 1];
        const newTimestamp = lastDoc.updatedAt || lastDoc.createdAt || lastDoc._id.getTimestamp();
        this.lastProcessedTimestamps.set(collectionName, newTimestamp);
      }
    } catch (error) {
      console.error(`Error polling ${collectionName}:`, error);
      this.emit('error', { collection: collectionName, error });
    }
  }
  
  handleChange(type, collectionName, change) {
    console.log(`\n🔔 Change detected in ${type}: ${change.operationType}`);
    
    // Extract document
    const document = change.fullDocument || change.documentKey;
    if (!document) return;
    
    // Add to pending changes
    const changeKey = `${collectionName}-${document._id}`;
    this.pendingChanges.set(changeKey, {
      type,
      collection: collectionName,
      operation: change.operationType,
      document,
      timestamp: new Date()
    });
    
    // Emit specific event
    this.emit(`data:${type}`, {
      operation: change.operationType,
      document,
      collection: collectionName
    });
    
    // Schedule batch processing
    this.scheduleBatchProcessing();
  }
  
  scheduleBatchProcessing() {
    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    // Set new timer
    this.batchTimer = setTimeout(() => {
      this.processPendingChanges();
    }, this.options.batchDelay);
    
    console.log(`⏱️  Workflow will trigger in ${this.options.batchDelay / 1000} seconds...`);
  }
  
  async processPendingChanges() {
    if (this.pendingChanges.size === 0) return;
    
    console.log(`\n🔄 Processing ${this.pendingChanges.size} pending changes...`);
    
    // Convert pending changes to array
    const changes = Array.from(this.pendingChanges.values());
    this.pendingChanges.clear();
    
    // Group changes by type
    const changesByType = {};
    changes.forEach(change => {
      if (!changesByType[change.type]) {
        changesByType[change.type] = [];
      }
      changesByType[change.type].push(change);
    });
    
    // Trigger workflow
    await this.triggerWorkflow(changesByType);
  }
  
  async triggerWorkflow(changesByType) {
    try {
      console.log('\n🚀 Triggering COO Assistant Analysis');
      console.log('📊 Changes by type:');
      Object.entries(changesByType).forEach(([type, changes]) => {
        console.log(`   - ${type}: ${changes.length} document(s)`);
      });
      
      // Extract startup ID from documents
      const startupId = this.extractStartupId(changesByType);
      
      // Prepare aggregated data
      const workflowData = await this.prepareWorkflowData(changesByType);
      
      // Run analysis
      const result = await this.orchestrator.runAnalysis(startupId, workflowData);
      
      if (result.success) {
        console.log('\n✅ Analysis completed successfully!');
        console.log(`📋 Workflow ID: ${result.workflowId}`);
        console.log(`🎯 Confidence: ${(result.recommendation.confidenceLevel * 100).toFixed(0)}%`);
        console.log(`\n💡 Top Recommendation:`);
        console.log(`   ${result.recommendation.executiveSummary}`);
        
        // Save results back to MongoDB
        await this.saveResults(result, changesByType);
      } else {
        console.error('❌ Analysis failed:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Error triggering workflow:', error);
    }
  }
  
  extractStartupId(changesByType) {
    // Try to find startup_id from any document
    for (const changes of Object.values(changesByType)) {
      for (const change of changes) {
        if (change.document.startup_id) {
          return change.document.startup_id;
        }
      }
    }
    
    // Default to generated ID
    return `mongo_${Date.now()}`;
  }
  
  async prepareWorkflowData(changesByType) {
    const data = {
      source: 'mongodb_monitor',
      timestamp: new Date().toISOString(),
      changes: {}
    };
    
    // Aggregate latest data from each collection
    for (const [type, changes] of Object.entries(changesByType)) {
      // Get the latest documents for each type
      const documents = changes.map(c => c.document);
      
      // Store aggregated data
      data.changes[type] = {
        count: documents.length,
        latest: documents[documents.length - 1],
        all: documents
      };
      
      // For specific types, fetch additional context
      if (type === 'reviews') {
        data.reviews = await this.aggregateReviews(changes[0].collection);
      } else if (type === 'metrics') {
        data.metrics = await this.aggregateMetrics(changes[0].collection);
      }
    }
    
    return data;
  }
  
  async aggregateReviews(collectionName) {
    const collection = this.db.collection(collectionName);
    
    // Get recent reviews and calculate sentiment
    const recentReviews = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    
    const avgRating = recentReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / recentReviews.length;
    
    return {
      count: recentReviews.length,
      averageRating: avgRating,
      sentiment: avgRating / 5, // Simple sentiment score
      recentReviews: recentReviews.slice(0, 5)
    };
  }
  
  async aggregateMetrics(collectionName) {
    const collection = this.db.collection(collectionName);
    
    // Get latest metrics
    const latestMetrics = await collection
      .findOne({}, { sort: { createdAt: -1 } });
    
    return latestMetrics || {
      activeUsers: 0,
      churnRate: 0,
      avgSessionDuration: 0
    };
  }
  
  async saveResults(result, changesByType) {
    try {
      // Save results to a results collection
      const resultsCollection = this.db.collection('analysis_results');
      
      const resultDoc = {
        workflowId: result.workflowId,
        timestamp: new Date(),
        triggerSummary: Object.entries(changesByType).map(([type, changes]) => ({
          type,
          documentCount: changes.length
        })),
        recommendation: result.recommendation,
        insights: result.insights
      };
      
      await resultsCollection.insertOne(resultDoc);
      console.log(`💾 Results saved to MongoDB (analysis_results collection)`);
      
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  }
  
  async stop() {
    console.log('\nStopping MongoDB Monitor...');
    
    // Close change streams
    for (const [name, stream] of this.changeStreams) {
      await stream.close();
    }
    this.changeStreams.clear();
    
    // Clear timers
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    // Close MongoDB connection
    if (this.client) {
      await this.client.close();
    }
    
    console.log('MongoDB Monitor stopped');
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new MongoDBMonitor();
  
  monitor.initialize().catch(error => {
    console.error('Failed to initialize monitor:', error);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down gracefully...');
    await monitor.stop();
    process.exit(0);
  });
}