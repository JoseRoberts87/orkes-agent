import { COOAssistantOrchestrator } from './index.js';

class DemoSimulator {
  constructor() {
    this.baseAccuracy = 0.45;
    this.currentAccuracy = 0.45;
    this.iterations = 0;
  }
  
  async runContinuousDemo() {
    console.log('=== COO Assistant Continuous Improvement Demo ===\n');
    console.log('This demo simulates how the AI agent learns and improves over time.\n');
    
    const orchestrator = new COOAssistantOrchestrator();
    await orchestrator.initialize();
    
    // Run multiple iterations to show improvement
    for (let i = 0; i < 5; i++) {
      console.log(`\n--- Iteration ${i + 1} ---`);
      
      // Run analysis
      const result = await orchestrator.runAnalysis(`demo_startup_${i}`);
      
      if (result.success) {
        // Show current accuracy
        console.log(`\nAI Accuracy: ${(this.currentAccuracy * 100).toFixed(1)}%`);
        
        // Simulate learning and improvement
        const didImprove = Math.random() > 0.3; // 70% chance of improvement
        await orchestrator.learningCoordinator.recordOutcome(
          result.workflowId,
          orchestrator.learningCoordinator.simulateOutcome(result.workflowId, didImprove)
        );
        
        // Update accuracy
        if (didImprove) {
          this.currentAccuracy = Math.min(this.currentAccuracy * 1.08, 0.92);
        } else {
          this.currentAccuracy = Math.max(this.currentAccuracy * 0.97, 0.40);
        }
        
        // Show improvement
        const improvement = ((this.currentAccuracy - this.baseAccuracy) / this.baseAccuracy * 100).toFixed(1);
        console.log(`Improvement from baseline: ${improvement}%`);
      }
      
      // Wait between iterations
      if (i < 4) {
        console.log('\nWaiting before next iteration...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Final summary
    console.log('\n\n=== Final Summary ===');
    const metrics = orchestrator.learningCoordinator.getImprovementMetrics();
    console.log(`Total Analyses: ${metrics.totalRecommendations}`);
    console.log(`Success Rate: ${metrics.successRate}`);
    console.log(`Final Accuracy: ${(this.currentAccuracy * 100).toFixed(1)}%`);
    console.log(`Total Improvement: ${((this.currentAccuracy - this.baseAccuracy) / this.baseAccuracy * 100).toFixed(1)}%`);
    
    if (metrics.improvementTrend !== 'insufficient_data') {
      console.log(`Trend: ${metrics.improvementTrend.direction} (${metrics.improvementTrend.change})`);
    }
  }
  
  async runQuickDemo() {
    console.log('=== COO Assistant Quick Demo ===\n');
    
    const orchestrator = new COOAssistantOrchestrator();
    await orchestrator.initialize();
    
    // Single analysis with detailed output
    const result = await orchestrator.runAnalysis('demo_startup_quick');
    
    if (result.success) {
      console.log('\n=== Analysis Results ===');
      console.log(JSON.stringify(result.recommendation, null, 2));
      
      console.log('\n=== Key Insights ===');
      console.log(JSON.stringify(result.insights, null, 2));
    }
  }
}

// Run demo based on command line argument
async function main() {
  const mode = process.argv[2] || 'quick';
  const simulator = new DemoSimulator();
  
  try {
    if (mode === 'continuous') {
      await simulator.runContinuousDemo();
    } else {
      await simulator.runQuickDemo();
    }
  } catch (error) {
    console.error('Demo error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}