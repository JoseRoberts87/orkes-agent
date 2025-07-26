import { getClient, config, TaskManager } from './config/orkes-client.js';
import { cooAssistantWorkflow } from './workflows/coo-assistant-workflow.js';
import { DataCollectorWorker } from './workers/data-collector-worker.js';
import { ReviewAnalyzerWorker } from './workers/review-analyzer-worker.js';
import { MetricsAnalyzerWorker } from './workers/metrics-analyzer-worker.js';
import { SynthesisWorker } from './workers/synthesis-worker.js';
import { RecommendationWorker } from './workers/recommendation-worker.js';
import { LearningCoordinator } from './learning/learning-coordinator.js';

class COOAssistantOrchestrator {
  constructor() {
    this.workers = [];
    this.learningCoordinator = new LearningCoordinator();
    this.conductorClient = null;
    this.taskManager = null;
  }
  
  async initialize() {
    console.log('Initializing COO Assistant Orchestrator...');
    
    try {
      // Get conductor client
      this.conductorClient = await getClient();
      
      // Register workflow
      await this.registerWorkflow();
      
      // Initialize workers
      await this.initializeWorkers();
      
      console.log('✓ COO Assistant Orchestrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize:', error);
      throw error;
    }
  }
  
  async registerWorkflow() {
    console.log('Registering COO Assistant workflow...');
    
    if (!this.conductorClient) {
      console.log('✓ Skipping workflow registration (Demo mode)');
      return;
    }
    
    try {
      // Use the metadataResource to register the workflow
      await this.conductorClient.metadataResource.create(
        cooAssistantWorkflow
      );
      console.log('✓ Workflow registered successfully');
    } catch (error) {
      console.error('Failed to register workflow:', error);
      // For demo purposes, we can continue even if registration fails
      if (config.demoMode) {
        console.log('⚠️  Continuing in demo mode despite registration error');
      } else {
        throw error;
      }
    }
  }
  
  async initializeWorkers() {
    console.log('Initializing workers...');
    
    // Create worker instances
    const workerInstances = [
      new DataCollectorWorker(),
      new ReviewAnalyzerWorker(),
      new MetricsAnalyzerWorker(),
      new SynthesisWorker(),
      new RecommendationWorker()
    ];
    
    this.workers = workerInstances;
    
    if (!this.conductorClient) {
      console.log('✓ Workers created (Demo mode - not connected to Orkes)');
      return;
    }
    
    // Convert workers to ConductorWorker format
    const conductorWorkers = workerInstances.map(w => w.toConductorWorker());
    
    // Create TaskManager with all workers
    this.taskManager = new TaskManager(this.conductorClient, conductorWorkers, {
      options: { 
        pollInterval: 100, 
        concurrency: 1 
      }
    });
    
    // Start polling for tasks
    this.taskManager.startPolling();
    console.log(`✓ Started ${conductorWorkers.length} workers with TaskManager`);
  }
  
  async runAnalysis(startupId) {
    console.log(`\nStarting analysis for startup: ${startupId}`);
    
    // Demo mode - simulate workflow execution
    if (!this.conductorClient || config.demoMode) {
      return await this.runDemoAnalysis(startupId);
    }
    
    try {
      // Start workflow
      const workflowRun = await this.conductorClient.workflowResource.startWorkflow(
        cooAssistantWorkflow.name,
        cooAssistantWorkflow.version,
        {
          startup_id: startupId,
          demo_mode: config.demoMode
        }
      );
      
      console.log(`✓ Workflow started: ${workflowRun.workflowId}`);
      
      // Wait for completion (with timeout)
      const result = await this.waitForCompletion(workflowRun.workflowId);
      
      if (result.status === 'COMPLETED') {
        console.log('✓ Analysis completed successfully');
        
        // Track recommendation for learning
        await this.learningCoordinator.trackRecommendation(
          workflowRun.workflowId,
          result.output.recommendation
        );
        
        return {
          success: true,
          workflowId: workflowRun.workflowId,
          recommendation: result.output.recommendation,
          insights: result.output.insights
        };
      } else {
        console.error('✗ Workflow failed:', result.reasonForIncompletion);
        return {
          success: false,
          workflowId: workflowRun.workflowId,
          error: result.reasonForIncompletion
        };
      }
    } catch (error) {
      console.error('Error running analysis:', error);
      throw error;
    }
  }
  
  async runDemoAnalysis(startupId) {
    console.log('Running in demo mode (simulated workflow)...');
    const workflowId = `demo-${Date.now()}`;
    
    // Simulate workflow execution
    console.log('→ Collecting data...');
    const dataCollector = new DataCollectorWorker();
    const data = await dataCollector.execute({ inputData: { startup_id: startupId } });
    
    console.log('→ Analyzing reviews...');
    const reviewAnalyzer = new ReviewAnalyzerWorker();
    const reviewAnalysis = await reviewAnalyzer.execute({ inputData: { data: data.reviews } });
    
    console.log('→ Analyzing metrics...');
    const metricsAnalyzer = new MetricsAnalyzerWorker();
    const metricsAnalysis = await metricsAnalyzer.execute({ inputData: { data: data.metrics } });
    
    console.log('→ Synthesizing insights...');
    const synthesizer = new SynthesisWorker();
    const synthesis = await synthesizer.execute({ 
      inputData: { 
        reviews: reviewAnalysis, 
        metrics: metricsAnalysis 
      } 
    });
    
    console.log('→ Generating recommendations...');
    const recommender = new RecommendationWorker();
    const recommendation = await recommender.execute({ inputData: { insights: synthesis } });
    
    console.log('✓ Analysis completed successfully');
    
    // Track recommendation for learning
    await this.learningCoordinator.trackRecommendation(workflowId, recommendation);
    
    return {
      success: true,
      workflowId,
      recommendation,
      insights: synthesis
    };
  }
  
  async waitForCompletion(workflowId, maxAttempts = 30) {
    console.log('Waiting for workflow completion...');
    
    for (let i = 0; i < maxAttempts; i++) {
      const workflow = await this.conductorClient.workflowResource.getExecutionStatus(
        workflowId,
        true // includeTasks
      );
      
      if (workflow.status === 'COMPLETED' || workflow.status === 'FAILED') {
        return workflow;
      }
      
      // Show progress
      const completedTasks = workflow.tasks?.filter(t => t.status === 'COMPLETED').length || 0;
      const totalTasks = workflow.tasks?.length || 0;
      process.stdout.write(`\rProgress: ${completedTasks}/${totalTasks} tasks completed`);
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Workflow execution timeout');
  }
  
  async simulateLearning(workflowId) {
    console.log('\n\nSimulating learning from outcome...');
    
    // Simulate an outcome
    const outcome = this.learningCoordinator.simulateOutcome(workflowId);
    await this.learningCoordinator.recordOutcome(workflowId, outcome);
    
    // Show improvement metrics
    const metrics = this.learningCoordinator.getImprovementMetrics();
    console.log('\nLearning Metrics:');
    console.log(`- Total Recommendations: ${metrics.totalRecommendations}`);
    console.log(`- Success Rate: ${metrics.successRate}`);
    console.log(`- Recent Success Rate: ${metrics.recentSuccessRate}`);
    console.log(`- Learning Iterations: ${metrics.learningIterations}`);
    
    return metrics;
  }
  
  async runDemo() {
    console.log('\n=== COO Assistant Demo ===\n');
    
    // Run analysis
    const result = await this.runAnalysis('demo_startup_123');
    
    if (result.success) {
      console.log('\n--- Recommendation ---');
      console.log(`ID: ${result.recommendation.id}`);
      console.log(`Summary: ${result.recommendation.executiveSummary}`);
      console.log(`Confidence: ${(result.recommendation.confidenceLevel * 100).toFixed(0)}%`);
      
      console.log('\n--- Immediate Actions ---');
      result.recommendation.immediateActions.forEach((action, i) => {
        console.log(`${i + 1}. ${action.action}`);
        console.log(`   Timeline: ${action.timeline} | Owner: ${action.owner}`);
      });
      
      // Simulate learning
      if (config.demoMode) {
        await this.simulateLearning(result.workflowId);
      }
    }
    
    return result;
  }
}

// Main execution
async function main() {
  const orchestrator = new COOAssistantOrchestrator();
  
  try {
    await orchestrator.initialize();
    
    if (config.demoMode) {
      await orchestrator.runDemo();
    } else {
      // In production mode, workers will process tasks as they come
      console.log('\nOrchestrator running. Workers are waiting for tasks...');
      console.log('Use the API to trigger analysis workflows.');
      
      // Keep the process running
      process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        if (orchestrator.taskManager) {
          orchestrator.taskManager.stopPolling();
        }
        process.exit(0);
      });
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Export for API usage
export { COOAssistantOrchestrator };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}