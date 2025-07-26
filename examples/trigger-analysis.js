// Example: How to trigger analysis via API

const API_URL = 'http://localhost:3000';

async function triggerAnalysis() {
  try {
    console.log('Triggering COO Assistant analysis...\n');
    
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startup_id: 'acme-corp-123',
        data: {
          // Optional: provide specific data
          context: 'Monthly review',
          priority: 'high'
        }
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Analysis completed successfully!\n');
      console.log('Workflow ID:', result.workflowId);
      console.log('\nRecommendation:');
      console.log('- Summary:', result.recommendation.executiveSummary);
      console.log('- Confidence:', (result.recommendation.confidenceLevel * 100).toFixed(0) + '%');
      console.log('\nImmediate Actions:');
      result.recommendation.immediateActions.forEach((action, i) => {
        console.log(`${i + 1}. ${action.action}`);
        console.log(`   Timeline: ${action.timeline} | Owner: ${action.owner}`);
      });
    } else {
      console.error('❌ Analysis failed:', result.error);
    }
  } catch (error) {
    console.error('Error calling API:', error.message);
  }
}

// Check metrics
async function checkMetrics() {
  try {
    const response = await fetch(`${API_URL}/api/metrics`);
    const result = await response.json();
    
    console.log('\n📊 Learning Metrics:');
    console.log('- Success Rate:', result.metrics.successRate);
    console.log('- Total Recommendations:', result.metrics.totalRecommendations);
    console.log('- Learning Iterations:', result.metrics.learningIterations);
  } catch (error) {
    console.error('Error getting metrics:', error.message);
  }
}

// Check queue status
async function checkQueueStatus() {
  try {
    const response = await fetch(`${API_URL}/api/queue/status`);
    const result = await response.json();
    
    console.log('\n📋 Queue Status:');
    console.log('- Queue Length:', result.queue.queueLength);
    console.log('- Processing:', result.queue.processing);
    console.log('- Processed Count:', result.queue.processedCount);
    console.log('- Success Rate:', result.queue.successRate);
  } catch (error) {
    console.error('Error getting queue status:', error.message);
  }
}

// Run example
async function main() {
  console.log('COO Assistant API Client Example\n');
  
  // First, check if server is running
  try {
    const health = await fetch(`${API_URL}/health`);
    const status = await health.json();
    console.log('Server status:', status.status);
  } catch (error) {
    console.error('❌ Server is not running. Start it with: npm run server');
    return;
  }
  
  // Trigger analysis
  await triggerAnalysis();
  
  // Check metrics and queue
  await checkMetrics();
  await checkQueueStatus();
}

main();