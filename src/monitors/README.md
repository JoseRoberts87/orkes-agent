# Directory Monitoring for COO Assistant

This feature allows the COO Assistant to automatically trigger analysis when new data files are added to a watched directory.

## How It Works

1. **Directory Watcher**: Monitors a specified directory for file changes
2. **Batch Processing**: Waits for multiple files and processes them together
3. **Automatic Workflow Trigger**: Starts COO Assistant analysis when new data arrives
4. **File Management**: Moves processed files to a separate directory

## Usage

### Start the Monitor

```bash
npm run monitor
```

This will:
- Create `data-inbox/` directory (if it doesn't exist)
- Watch for new files (.json, .csv, .txt, .xml)
- Trigger analysis 5 seconds after the last file change
- Move processed files to `data-processed/<workflowId>/`

### Configuration

Set environment variables to customize:

```bash
# Watch directory (default: ./data-inbox)
DATA_WATCH_PATH=/path/to/watch

# Processed files directory (default: ./data-processed)
DATA_PROCESSED_PATH=/path/to/processed

# Run with custom paths
DATA_WATCH_PATH=/tmp/coo-data npm run monitor
```

### File Naming Conventions

The monitor recognizes these patterns:

- **Reviews**: Files containing "review" or "feedback"
- **Metrics**: Files containing "metric" or "analytics"
- **Sales**: Files containing "sales" or "revenue"
- **Customer**: Files containing "customer" or "user"

Example: `startup_acme_reviews.json`, `daily_metrics_2025.csv`

### Workflow Triggering

1. Drop files into the watch directory
2. Monitor detects changes and waits 5 seconds
3. All pending files are processed together
4. COO Assistant analyzes the batch
5. Results saved to `data-processed/<workflowId>/analysis_results.json`

### Example Data Files

**reviews.json**:
```json
{
  "startup_id": "acme-corp",
  "reviews": [
    {
      "rating": 4,
      "text": "Great product but needs better onboarding",
      "date": "2025-01-25"
    }
  ]
}
```

**metrics.json**:
```json
{
  "startup_id": "acme-corp",
  "metrics": {
    "activeUsers": 5234,
    "churnRate": 0.15,
    "mau": 12000
  }
}
```

### Integration with Orkes

When connected to Orkes:
- Creates real workflows in Orkes
- Workers process tasks through Orkes
- Full workflow tracking and monitoring

In demo mode:
- Runs local simulation
- Same analysis logic
- No Orkes connection required

### Advanced Usage

#### Custom File Types

Modify `fileTypes` in `DirectoryWatcher`:
```javascript
new DirectoryWatcher(path, {
  fileTypes: ['.json', '.csv', '.txt', '.xml', '.log']
})
```

#### Immediate Processing

Set `batchMode: false` for immediate processing:
```javascript
new DataMonitor({
  batchMode: false,  // Process files immediately
  triggerDelay: 0
})
```

#### Recursive Watching

By default, subdirectories are watched. Disable with:
```javascript
new DirectoryWatcher(path, {
  recursive: false  // Only watch top-level directory
})
```