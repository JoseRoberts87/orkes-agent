import { DirectoryWatcher } from './directory-watcher.js';
import { COOAssistantOrchestrator } from '../index.js';
import path from 'path';
import fs from 'fs';

export class DataMonitor {
  constructor(options = {}) {
    this.options = {
      watchPath: process.env.DATA_WATCH_PATH || './data-inbox',
      processedPath: process.env.DATA_PROCESSED_PATH || './data-processed',
      triggerDelay: 5000, // Wait 5 seconds after last change before triggering
      batchMode: true, // Process multiple files as batch
      ...options
    };
    
    this.orchestrator = null;
    this.watcher = null;
    this.pendingFiles = new Map();
    this.triggerTimer = null;
  }
  
  async initialize() {
    console.log('🚀 Initializing Data Monitor...');
    
    // Create directories if they don't exist
    [this.options.watchPath, this.options.processedPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });
    
    // Initialize orchestrator
    this.orchestrator = new COOAssistantOrchestrator();
    await this.orchestrator.initialize();
    console.log('✅ Orchestrator initialized');
    
    // Initialize directory watcher
    this.watcher = new DirectoryWatcher(this.options.watchPath, {
      recursive: true,
      fileTypes: ['.json', '.csv', '.txt', '.xml'],
      debounceDelay: 1000
    });
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Start watching
    this.watcher.start();
    
    console.log(`\n📊 Data Monitor Active`);
    console.log(`📁 Watching: ${path.resolve(this.options.watchPath)}`);
    console.log(`📦 Processed files go to: ${path.resolve(this.options.processedPath)}`);
    console.log(`\n💡 Drop data files into the watch directory to trigger analysis\n`);
  }
  
  setupEventHandlers() {
    // Handle file changes
    this.watcher.on('file:changed', (event) => {
      console.log(`📄 Detected change in: ${event.filename}`);
      this.handleFileChange(event);
    });
    
    // Handle specific data types
    this.watcher.on('data:reviews', (event) => {
      console.log(`💬 New review data: ${event.filename}`);
      this.pendingFiles.set(event.filename, { type: 'reviews', ...event });
    });
    
    this.watcher.on('data:metrics', (event) => {
      console.log(`📊 New metrics data: ${event.filename}`);
      this.pendingFiles.set(event.filename, { type: 'metrics', ...event });
    });
    
    this.watcher.on('data:sales', (event) => {
      console.log(`💰 New sales data: ${event.filename}`);
      this.pendingFiles.set(event.filename, { type: 'sales', ...event });
    });
    
    // Handle new data files
    this.watcher.on('data:new', (event) => {
      if (!this.pendingFiles.has(event.filename)) {
        console.log(`📁 New data file: ${event.filename}`);
        this.pendingFiles.set(event.filename, { type: 'general', ...event });
      }
      
      // Schedule workflow trigger
      this.scheduleTrigger();
    });
    
    // Handle errors
    this.watcher.on('error', (error) => {
      console.error('❌ Watcher error:', error);
    });
  }
  
  handleFileChange(event) {
    // Add to pending files
    this.pendingFiles.set(event.filename, event);
    
    // Schedule workflow trigger
    if (this.options.batchMode) {
      this.scheduleTrigger();
    } else {
      // Immediate mode - trigger right away
      this.triggerWorkflow([event]);
    }
  }
  
  scheduleTrigger() {
    // Clear existing timer
    if (this.triggerTimer) {
      clearTimeout(this.triggerTimer);
    }
    
    // Set new timer
    this.triggerTimer = setTimeout(() => {
      this.processPendingFiles();
    }, this.options.triggerDelay);
    
    console.log(`⏱️  Workflow will trigger in ${this.options.triggerDelay / 1000} seconds...`);
  }
  
  async processPendingFiles() {
    if (this.pendingFiles.size === 0) return;
    
    console.log(`\n🔄 Processing ${this.pendingFiles.size} pending files...`);
    
    // Convert pending files to array
    const files = Array.from(this.pendingFiles.values());
    this.pendingFiles.clear();
    
    // Trigger workflow with all files
    await this.triggerWorkflow(files);
  }
  
  async triggerWorkflow(files) {
    try {
      console.log('\n🚀 Triggering COO Assistant Analysis');
      console.log(`📁 Processing ${files.length} file(s):`);
      files.forEach(f => console.log(`   - ${f.filename} (${f.type || 'general'})`));
      
      // Prepare data for workflow
      const workflowData = this.prepareWorkflowData(files);
      
      // Generate startup ID based on directory or files
      const startupId = this.generateStartupId(files);
      
      // Run analysis
      const result = await this.orchestrator.runAnalysis(startupId, workflowData);
      
      if (result.success) {
        console.log('\n✅ Analysis completed successfully!');
        console.log(`📋 Workflow ID: ${result.workflowId}`);
        console.log(`🎯 Confidence: ${(result.recommendation.confidenceLevel * 100).toFixed(0)}%`);
        console.log(`\n💡 Top Recommendation:`);
        console.log(`   ${result.recommendation.executiveSummary}`);
        
        // Move processed files
        await this.moveProcessedFiles(files, result.workflowId);
        
        // Save results
        await this.saveResults(result, files);
      } else {
        console.error('❌ Analysis failed:', result.error);
      }
      
    } catch (error) {
      console.error('❌ Error triggering workflow:', error);
    }
  }
  
  prepareWorkflowData(files) {
    const data = {
      files: files.map(f => ({
        name: f.filename,
        type: f.type,
        size: f.size,
        modified: f.modified
      })),
      timestamp: new Date().toISOString(),
      source: 'directory_monitor'
    };
    
    // Aggregate data by type
    const byType = {};
    files.forEach(file => {
      const type = file.type || 'general';
      if (!byType[type]) byType[type] = [];
      byType[type].push(file.data);
    });
    
    data.aggregated = byType;
    
    return data;
  }
  
  generateStartupId(files) {
    // Try to extract startup ID from file names or directory
    for (const file of files) {
      // Look for patterns like "startup_123_data.json"
      const match = file.filename.match(/startup[_-]?(\w+)/i);
      if (match) return match[1];
    }
    
    // Default to timestamp-based ID
    return `auto_${Date.now()}`;
  }
  
  async moveProcessedFiles(files, workflowId) {
    const processedDir = path.join(this.options.processedPath, workflowId);
    
    // Create workflow-specific directory
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }
    
    // Move each file
    for (const file of files) {
      try {
        const sourcePath = file.path;
        const destPath = path.join(processedDir, file.filename);
        
        fs.renameSync(sourcePath, destPath);
        console.log(`📦 Moved ${file.filename} to processed`);
      } catch (error) {
        console.error(`Failed to move ${file.filename}:`, error.message);
      }
    }
  }
  
  async saveResults(result, files) {
    const resultsPath = path.join(
      this.options.processedPath,
      result.workflowId,
      'analysis_results.json'
    );
    
    const resultData = {
      workflowId: result.workflowId,
      timestamp: new Date().toISOString(),
      files: files.map(f => f.filename),
      recommendation: result.recommendation,
      insights: result.insights
    };
    
    fs.writeFileSync(resultsPath, JSON.stringify(resultData, null, 2));
    console.log(`💾 Results saved to: ${resultsPath}`);
  }
  
  stop() {
    console.log('\nStopping Data Monitor...');
    
    if (this.triggerTimer) {
      clearTimeout(this.triggerTimer);
    }
    
    if (this.watcher) {
      this.watcher.stop();
    }
    
    console.log('Data Monitor stopped');
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new DataMonitor();
  
  monitor.initialize().catch(error => {
    console.error('Failed to initialize monitor:', error);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down gracefully...');
    monitor.stop();
    process.exit(0);
  });
}