import { AgentWorker } from './base-worker.js';

export class MetricsAnalyzerWorker extends AgentWorker {
  constructor() {
    super('analyze_product_metrics');
  }
  
  async execute(task) {
    const { data } = task.inputData;
    console.log('Analyzing product metrics...');
    
    const analysis = {
      userEngagement: this.analyzeEngagement(data),
      retentionHealth: this.analyzeRetention(data),
      featureUsage: this.analyzeFeatures(data),
      riskFactors: this.identifyRisks(data),
      opportunities: this.identifyOpportunities(data)
    };
    
    return analysis;
  }
  
  analyzeEngagement(data) {
    const score = (data.avgSessionDuration / 10) * (1 - data.churnRate);
    return {
      score: score.toFixed(2),
      level: score > 0.7 ? 'healthy' : score > 0.4 ? 'moderate' : 'poor',
      sessionDuration: data.avgSessionDuration,
      activeUsers: data.activeUsers
    };
  }
  
  analyzeRetention(data) {
    const { retentionCohorts } = data;
    const d30Benchmark = 0.35; // Industry benchmark
    
    return {
      day30Retention: retentionCohorts.day30,
      benchmark: d30Benchmark,
      performance: retentionCohorts.day30 >= d30Benchmark ? 'above' : 'below',
      dropoffRate: ((retentionCohorts.day1 - retentionCohorts.day30) / retentionCohorts.day1 * 100).toFixed(1),
      recommendation: retentionCohorts.day30 < d30Benchmark ? 
        'Focus on day 7-30 retention improvements' : 
        'Retention metrics are healthy'
    };
  }
  
  analyzeFeatures(data) {
    const { featureAdoption } = data;
    const underused = Object.entries(featureAdoption)
      .filter(([_, adoption]) => adoption < 0.2)
      .map(([feature, adoption]) => ({
        feature,
        adoption: (adoption * 100).toFixed(1) + '%'
      }));
    
    return {
      mostUsed: Object.entries(featureAdoption)
        .sort(([,a], [,b]) => b - a)[0][0],
      underutilized: underused,
      recommendation: underused.length > 0 ? 
        `Improve discoverability of ${underused[0].feature} feature` : 
        'Feature adoption is balanced'
    };
  }
  
  identifyRisks(data) {
    const risks = [];
    
    if (data.churnRate > 0.2) {
      risks.push({
        type: 'churn',
        severity: 'high',
        metric: `${(data.churnRate * 100).toFixed(1)}% monthly churn`,
        impact: 'Revenue loss and growth stagnation'
      });
    }
    
    if (data.retentionCohorts.day7 < 0.5) {
      risks.push({
        type: 'early_churn',
        severity: 'medium',
        metric: 'Only 45% retain after 7 days',
        impact: 'Poor product-market fit indication'
      });
    }
    
    return risks;
  }
  
  identifyOpportunities(data) {
    const opportunities = [];
    
    if (data.featureAdoption.export < 0.15) {
      opportunities.push({
        type: 'feature_activation',
        action: 'Add export tutorial in onboarding',
        potentialImpact: 'Could increase retention by 10-15%'
      });
    }
    
    if (data.activeUsers > 5000 && data.avgSessionDuration > 4) {
      opportunities.push({
        type: 'monetization',
        action: 'Consider premium features for power users',
        potentialImpact: 'Revenue opportunity with engaged user base'
      });
    }
    
    return opportunities;
  }
}