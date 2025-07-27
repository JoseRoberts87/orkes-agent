import { orkesConductorClient, TaskManager } from '@io-orkes/conductor-javascript';
import dotenv from 'dotenv';

dotenv.config();

// Worker implementation for aggregate_changes task
const aggregateChangesWorker = {
  taskDefName: 'aggregate_changes',
  execute: async ({ inputData }) => {
    const { changes, groupByType } = inputData;
    
    try {
      console.log('📊 Aggregating changes...');
      
      // Initialize result structure
      const result = {
        totalCount: 0,
        byType: {},
        summary: []
      };
      
      // Handle single change or array of changes
      const changesArray = Array.isArray(changes) ? changes : [changes];
      result.totalCount = changesArray.length;
      
      if (groupByType) {
        // Group changes by type
        changesArray.forEach(change => {
          const type = change.type || 'unknown';
          if (!result.byType[type]) {
            result.byType[type] = {
              count: 0,
              items: []
            };
          }
          result.byType[type].count++;
          result.byType[type].items.push(change);
        });
        
        // Create summary
        Object.entries(result.byType).forEach(([type, data]) => {
          result.summary.push({
            type,
            count: data.count,
            percentage: ((data.count / result.totalCount) * 100).toFixed(2) + '%'
          });
        });
      } else {
        // Return all changes without grouping
        result.changes = changesArray;
      }
      
      console.log(`✅ Aggregated ${result.totalCount} changes`);
      
      return {
        outputData: result,
        status: 'COMPLETED'
      };
      
    } catch (error) {
      console.error('❌ Error in aggregate_changes:', error);
      return {
        outputData: {
          error: error.message
        },
        status: 'FAILED',
        reasonForIncompletion: error.message
      };
    }
  }
};

// Initialize and start the worker
async function startAggregateWorker() {
  try {
    const clientPromise = orkesConductorClient({
      keyId: process.env.ORKES_API_KEY,
      keySecret: process.env.ORKES_SECRET_KEY,
      TOKEN: process.env.ORKES_TOKEN,
      serverUrl: process.env.ORKES_SERVER_URL
    });
    
    const client = await clientPromise;
    
    const manager = new TaskManager(client, [aggregateChangesWorker], {
      options: { 
        pollInterval: 100, 
        concurrency: 5,
        domain: null 
      }
    });
    
    console.log('🚀 Starting aggregate_changes worker...');
    manager.startPolling();
    console.log('✅ Worker is polling for tasks');
    
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down worker...');
  process.exit(0);
});

// Start the worker if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startAggregateWorker();
}

export { aggregateChangesWorker };