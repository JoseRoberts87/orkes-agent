import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { COOAssistantOrchestrator } from '../index.js';
import { EventQueue } from '../events/event-queue.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize orchestrator and event queue
let orchestrator;
let eventQueue;

async function initializeOrchestrator() {
  orchestrator = new COOAssistantOrchestrator();
  await orchestrator.initialize();
  console.log('✓ Orchestrator initialized and ready');
  
  // Initialize event queue
  eventQueue = new EventQueue();
  
  // Set up event handlers
  eventQueue.on('analyze', async (data) => {
    await orchestrator.runAnalysis(data.startup_id, data);
  });
  
  eventQueue.on('webhook', async (data) => {
    console.log('Processing webhook event:', data);
  });
  
  eventQueue.on('outcome', async (data) => {
    await orchestrator.learningCoordinator.recordOutcome(
      data.workflowId,
      data.outcome
    );
  });
  
  console.log('✓ Event queue initialized');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'COO Assistant Agent',
    timestamp: new Date().toISOString(),
    mode: orchestrator ? 'active' : 'initializing'
  });
});

// Trigger analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { startup_id, data } = req.body;
    
    if (!startup_id) {
      return res.status(400).json({
        error: 'startup_id is required'
      });
    }
    
    console.log(`\n📊 Received analysis request for: ${startup_id}`);
    
    // Run analysis
    const result = await orchestrator.runAnalysis(startup_id, data);
    
    if (result.success) {
      res.json({
        success: true,
        workflowId: result.workflowId,
        recommendation: result.recommendation,
        insights: result.insights
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Webhook endpoint for external triggers (e.g., from BrightData or Mixpanel)
app.post('/api/webhook/:source', async (req, res) => {
  try {
    const { source } = req.params;
    const data = req.body;
    
    console.log(`\n🔔 Received webhook from ${source}`);
    
    // Process based on source
    switch (source) {
      case 'brightdata':
        // Handle review data updates
        console.log('Processing BrightData review updates...');
        break;
        
      case 'mixpanel':
        // Handle metrics updates
        console.log('Processing Mixpanel metrics updates...');
        break;
        
      default:
        console.log(`Unknown webhook source: ${source}`);
    }
    
    // Acknowledge webhook
    res.json({
      success: true,
      message: `Webhook from ${source} received`,
      timestamp: new Date().toISOString()
    });
    
    // Trigger analysis if needed
    if (data.startup_id && data.trigger_analysis) {
      console.log(`Triggering analysis for ${data.startup_id}...`);
      orchestrator.runAnalysis(data.startup_id, data);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get learning metrics endpoint
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = orchestrator.learningCoordinator.getImprovementMetrics();
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get event queue status
app.get('/api/queue/status', (req, res) => {
  try {
    const status = eventQueue.getStatus();
    res.json({
      success: true,
      queue: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recommendation history
app.get('/api/recommendations', (req, res) => {
  try {
    const recommendations = Array.from(orchestrator.learningCoordinator.recommendations.values());
    res.json({
      success: true,
      count: recommendations.length,
      recommendations: recommendations.slice(-10), // Last 10
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Record outcome endpoint (for learning)
app.post('/api/outcome/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const outcome = req.body;
    
    console.log(`\n📈 Recording outcome for workflow: ${workflowId}`);
    
    const result = await orchestrator.learningCoordinator.recordOutcome(
      workflowId,
      outcome
    );
    
    res.json({
      success: true,
      outcome: result,
      metrics: orchestrator.learningCoordinator.getImprovementMetrics()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
async function startServer() {
  try {
    await initializeOrchestrator();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 COO Assistant API Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 Trigger analysis: POST http://localhost:${PORT}/api/analyze`);
      console.log(`📍 Webhooks: POST http://localhost:${PORT}/api/webhook/:source`);
      console.log(`📍 Metrics: GET http://localhost:${PORT}/api/metrics`);
      console.log('\n⏳ Waiting for events...\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

export { startServer };