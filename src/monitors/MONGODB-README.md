# MongoDB Change Monitoring for COO Assistant

This feature monitors MongoDB collections for changes and automatically triggers COO Assistant analysis when documents are inserted or updated.

## Features

- **Real-time Monitoring**: Uses MongoDB Change Streams (if available) or polling
- **Multiple Collections**: Monitors reviews, metrics, sales, and customers
- **Batch Processing**: Groups changes together for efficient analysis
- **Automatic Triggering**: Starts workflow when data changes
- **Results Storage**: Saves analysis results back to MongoDB

## Setup

### 1. MongoDB Requirements

- MongoDB 3.6+ for Change Streams (recommended)
- Falls back to polling for older versions
- Can use local MongoDB or MongoDB Atlas

### 2. Environment Configuration

Add to your `.env` file:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=coo_assistant
MONGODB_REVIEWS_COLLECTION=reviews
MONGODB_METRICS_COLLECTION=metrics
MONGODB_SALES_COLLECTION=sales
MONGODB_CUSTOMERS_COLLECTION=customers
```

For MongoDB Atlas:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

### 3. Start the Monitor

```bash
npm run monitor:mongo
```

## How It Works

1. **Change Detection**:
   - Change Streams: Real-time notifications (preferred)
   - Polling: Checks every 5 seconds for updates

2. **Batching**:
   - Waits 3 seconds after first change
   - Groups all changes in that window
   - Triggers one workflow for the batch

3. **Workflow Trigger**:
   - Extracts startup_id from documents
   - Aggregates data by type
   - Runs COO Assistant analysis
   - Saves results to `analysis_results` collection

## Testing

### 1. Insert Test Data

```bash
# Insert sample documents
node examples/mongodb-test-data.js insert
```

This creates:
- 3 review documents
- 1 metrics document
- 1 sales document

### 2. Update Data

```bash
# Update existing documents
node examples/mongodb-test-data.js update
```

### 3. Clear Test Data

```bash
# Remove all test documents
node examples/mongodb-test-data.js clear
```

## Document Schema Examples

### Reviews Collection
```javascript
{
  startup_id: "acme-corp",
  rating: 4,
  text: "Great product but needs improvements",
  source: "app_store",
  createdAt: ISODate("2025-01-26"),
  updatedAt: ISODate("2025-01-26")
}
```

### Metrics Collection
```javascript
{
  startup_id: "acme-corp",
  activeUsers: 5234,
  churnRate: 0.23,
  avgSessionDuration: 4.5,
  featureAdoption: {
    dashboard: 0.78,
    export: 0.12
  },
  createdAt: ISODate("2025-01-26"),
  updatedAt: ISODate("2025-01-26")
}
```

### Analysis Results Collection
```javascript
{
  workflowId: "wf-123456",
  timestamp: ISODate("2025-01-26"),
  triggerSummary: [
    { type: "reviews", documentCount: 3 },
    { type: "metrics", documentCount: 1 }
  ],
  recommendation: { ... },
  insights: { ... }
}
```

## Integration with Orkes

When documents change:
1. Monitor detects changes
2. Batches changes by type
3. Triggers Orkes workflow
4. Workers process the analysis
5. Results saved back to MongoDB

## Advanced Configuration

### Custom Collections

```javascript
const monitor = new MongoDBMonitor({
  collections: {
    reviews: 'customer_feedback',
    metrics: 'product_analytics',
    sales: 'revenue_data',
    custom: 'my_custom_collection'
  }
});
```

### Adjust Timing

```javascript
const monitor = new MongoDBMonitor({
  pollInterval: 10000,    // Check every 10 seconds
  batchDelay: 5000,       // Wait 5 seconds to batch
  useChangeStreams: false // Force polling mode
});
```

### Connection Options

```javascript
const monitor = new MongoDBMonitor({
  uri: 'mongodb://user:pass@host:port/db?options',
  database: 'production_db'
});
```

## Monitoring Multiple Startups

The monitor automatically groups changes by `startup_id`:
- Each startup's changes trigger separate analyses
- Results are tagged with the startup_id
- Can monitor unlimited startups simultaneously

## Performance Considerations

- Change Streams are more efficient than polling
- Batching reduces workflow triggers
- Index `updatedAt` and `createdAt` fields for better polling performance
- Consider TTL indexes on `analysis_results` to manage storage