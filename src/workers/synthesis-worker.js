import { AgentWorker } from './base-worker.js';

export class SynthesisWorker extends AgentWorker {
  constructor() {
    super('synthesize_insights');
  }
  
  async execute(task) {
    const { reviews, metrics } = task.inputData;
    console.log('Synthesizing insights from review and metrics analysis...');
    
    const synthesis = {
      topInsight: this.findTopInsight(reviews, metrics),
      confidence: this.calculateConfidence(reviews, metrics),
      correlations: this.findCorrelations(reviews, metrics),
      prioritizedActions: this.prioritizeActions(reviews, metrics),
      timestamp: new Date().toISOString()
    };
    
    return synthesis;
  }
  
  findTopInsight(reviews, metrics) {
    // Cross-reference review issues with metrics
    if (reviews.urgencyScore === 'critical' && metrics.riskFactors.some(r => r.type === 'churn')) {
      return {
        type: 'critical_correlation',
        insight: 'Poor reviews directly correlating with high churn rate',
        evidence: {
          reviewSentiment: reviews.overallSentiment,
          churnRate: metrics.riskFactors.find(r => r.type === 'churn')?.metric,
          appCrashes: reviews.customerPainPoints.includes('App crashes frequently')
        },
        recommendation: 'Immediate technical debt reduction required'
      };
    }
    
    if (metrics.featureUsage.underutilized.length > 0 && reviews.recommendations.length > 0) {
      return {
        type: 'opportunity',
        insight: 'Low feature adoption despite user engagement',
        evidence: {
          underusedFeatures: metrics.featureUsage.underutilized,
          userEngagement: metrics.userEngagement.level
        },
        recommendation: 'Improve feature discovery and onboarding'
      };
    }
    
    return {
      type: 'general',
      insight: 'Multiple improvement areas identified',
      recommendation: 'Focus on highest impact items first'
    };
  }
  
  calculateConfidence(reviews, metrics) {
    // Calculate confidence based on data quality and consistency
    let confidence = 0.5; // Base confidence
    
    // Increase confidence if patterns align
    if (reviews.urgencyScore === 'critical' && metrics.riskFactors.length > 1) {
      confidence += 0.2;
    }
    
    if (reviews.sentimentTrend.direction === 'declining' && 
        metrics.retentionHealth.performance === 'below') {
      confidence += 0.15;
    }
    
    // Decrease confidence if data conflicts
    if (reviews.overallSentiment > 0.7 && metrics.userEngagement.level === 'poor') {
      confidence -= 0.1;
    }
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }
  
  findCorrelations(reviews, metrics) {
    const correlations = [];
    
    // App stability vs retention
    if (reviews.customerPainPoints.includes('App crashes frequently')) {
      correlations.push({
        factor1: 'App crashes',
        factor2: 'Day 7 retention',
        strength: 'strong',
        impact: `${((1 - metrics.retentionHealth.day30Retention) * 100).toFixed(0)}% users lost`
      });
    }
    
    // Support issues vs churn
    if (reviews.customerPainPoints.includes('Poor customer support')) {
      correlations.push({
        factor1: 'Support complaints',
        factor2: 'Monthly churn',
        strength: 'moderate',
        impact: 'Estimated 5-10% churn attributed to support'
      });
    }
    
    return correlations;
  }
  
  prioritizeActions(reviews, metrics) {
    const allActions = [
      ...reviews.recommendations.map(r => ({ ...r, source: 'reviews' })),
      ...metrics.opportunities.map(o => ({ 
        type: 'opportunity',
        action: o.action,
        impact: o.potentialImpact,
        source: 'metrics'
      }))
    ];
    
    // Add risk mitigation actions
    metrics.riskFactors.forEach(risk => {
      allActions.push({
        type: 'risk_mitigation',
        action: `Address ${risk.type}: ${risk.metric}`,
        impact: risk.severity,
        source: 'metrics'
      });
    });
    
    // Sort by impact (critical > high > medium > low)
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return allActions.sort((a, b) => {
      const aOrder = impactOrder[a.impact] ?? 4;
      const bOrder = impactOrder[b.impact] ?? 4;
      return aOrder - bOrder;
    }).slice(0, 5); // Top 5 actions
  }
}