# COO Assistant - Orkes Agent

An AI-powered COO Assistant that orchestrates multiple agents to analyze business data and provide actionable recommendations with continuous learning capabilities.

## Features

- **Parallel Analysis**: Runs multiple analysis agents simultaneously
- **Data Synthesis**: Combines insights from reviews and metrics
- **Smart Recommendations**: Generates prioritized, actionable recommendations
- **Continuous Learning**: Tracks outcomes and improves over time
- **Demo Mode**: Simulates the learning process for demonstrations

## Setup

1. **Get Orkes Credentials**
   - Sign up at https://developer.orkescloud.com/ for free
   - Or get credentials from the Orkes booth at the hackathon
   - You'll need both API Key and Secret Key

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add:
   # - ORKES_API_KEY (your API key ID)
   # - ORKES_SECRET_KEY (your API secret)
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

## Running the Agent

### Demo Mode (No API Key Required for Testing)
```bash
# Quick demo - single analysis
npm run demo

# Continuous improvement demo - shows learning over time
npm run demo:continuous
```

### API Server Mode (Recommended)
```bash
# Start the API server - listens for events
npm run server

# The server will start on port 3000 (or PORT env variable)
# API endpoints:
# - POST /api/analyze - Trigger analysis
# - POST /api/webhook/:source - Receive webhooks
# - GET /api/metrics - Get learning metrics
# - GET /api/recommendations - Get recommendation history
# - GET /api/queue/status - Check event queue status
```

### Production Mode (Single Run)
```bash
npm start
```

## Architecture

The agent consists of:

1. **Workflow Definition** (`src/workflows/coo-assistant-workflow.js`)
   - Defines the orchestration flow
   - Manages parallel task execution

2. **Workers** (`src/workers/`)
   - `DataCollectorWorker`: Gathers data from sources
   - `ReviewAnalyzerWorker`: Analyzes customer reviews
   - `MetricsAnalyzerWorker`: Analyzes product metrics
   - `SynthesisWorker`: Combines insights
   - `RecommendationWorker`: Generates recommendations

3. **Learning Coordinator** (`src/learning/learning-coordinator.js`)
   - Tracks recommendations and outcomes
   - Calculates improvement metrics
   - Manages continuous learning loop

## Integration Points

The agent is designed to integrate with:
- **Bright Data**: For review scraping (Engineer 2)
- **Mixpanel**: For product analytics (Engineer 3)
- **Dashboard**: For displaying recommendations (Engineer 3)

## API Usage

When running in production mode, trigger analysis via API:

```javascript
const result = await conductorClient.workflowResource.startWorkflow({
  name: 'coo_assistant_analysis',
  version: 1,
  input: {
    startup_id: 'your_startup_id'
  }
});
```

## Workflow Visualization

The workflow executes in this order:
1. Collect Data (from multiple sources)
2. Parallel Analysis (reviews + metrics)
3. Synthesize Insights
4. Generate Recommendations
5. Track for Learning

## Success Metrics

The agent tracks:
- Recommendation success rate
- Improvement trends
- Confidence levels
- Time to impact