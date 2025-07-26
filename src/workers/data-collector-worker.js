import { AgentWorker } from './base-worker.js';

export class DataCollectorWorker extends AgentWorker {
  constructor() {
    super('collect_data');
  }
  
  async execute(task) {
    const { startup_id } = task.inputData;
    console.log(`Collecting data for startup: ${startup_id}`);
    
    // In production, this would fetch real data from BrightData and Mixpanel
    // For demo, we'll return simulated data
    const mockData = {
      reviews: {
        source: 'brightdata',
        count: 150,
        averageRating: 3.2,
        sentiment: 0.45,
        topComplaints: [
          'App crashes frequently',
          'Poor customer support',
          'Features missing compared to competitors'
        ],
        recentReviews: [
          { rating: 2, text: 'App keeps crashing when I try to export', date: '2025-01-25' },
          { rating: 4, text: 'Good features but needs stability improvements', date: '2025-01-24' },
          { rating: 1, text: 'Customer support never responds', date: '2025-01-23' }
        ]
      },
      metrics: {
        source: 'mixpanel',
        activeUsers: 5234,
        churnRate: 0.23,
        avgSessionDuration: 4.5,
        featureAdoption: {
          export: 0.12,
          collaboration: 0.34,
          analytics: 0.67
        },
        retentionCohorts: {
          day1: 0.78,
          day7: 0.45,
          day30: 0.23
        }
      },
      timestamp: new Date().toISOString()
    };
    
    return mockData;
  }
}