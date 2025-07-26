import { AgentWorker } from './base-worker.js';

export class ReviewAnalyzerWorker extends AgentWorker {
  constructor() {
    super('analyze_reviews');
  }
  
  async execute(task) {
    const { data } = task.inputData;
    console.log(`Analyzing ${data.count} reviews...`);
    
    // Analyze review data
    const analysis = {
      overallSentiment: data.sentiment,
      sentimentTrend: this.calculateSentimentTrend(data),
      criticalIssues: this.identifyCriticalIssues(data),
      customerPainPoints: data.topComplaints,
      urgencyScore: this.calculateUrgency(data),
      recommendations: []
    };
    
    // Generate recommendations based on analysis
    if (analysis.overallSentiment < 0.5) {
      analysis.recommendations.push({
        type: 'critical',
        action: 'Address app stability issues immediately',
        impact: 'high',
        reason: 'Crashes are mentioned in 40% of negative reviews'
      });
    }
    
    if (data.topComplaints.includes('Poor customer support')) {
      analysis.recommendations.push({
        type: 'operational',
        action: 'Improve customer support response time',
        impact: 'medium',
        reason: 'Support complaints in 25% of reviews'
      });
    }
    
    return analysis;
  }
  
  calculateSentimentTrend(data) {
    // Simulate trend calculation
    const recentAvg = data.recentReviews.reduce((sum, r) => sum + r.rating, 0) / data.recentReviews.length;
    const trend = recentAvg < data.averageRating ? 'declining' : 'improving';
    return {
      direction: trend,
      change: ((recentAvg - data.averageRating) / data.averageRating * 100).toFixed(1)
    };
  }
  
  identifyCriticalIssues(data) {
    const issues = [];
    if (data.averageRating < 3.0) {
      issues.push('Low overall rating threatening app store visibility');
    }
    if (data.sentiment < 0.4) {
      issues.push('Negative sentiment reaching critical levels');
    }
    return issues;
  }
  
  calculateUrgency(data) {
    if (data.averageRating < 2.5 || data.sentiment < 0.3) return 'critical';
    if (data.averageRating < 3.5 || data.sentiment < 0.5) return 'high';
    return 'medium';
  }
}