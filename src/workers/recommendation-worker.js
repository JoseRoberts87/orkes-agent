import { AgentWorker } from './base-worker.js';

export class RecommendationWorker extends AgentWorker {
  constructor() {
    super('generate_recommendation');
  }
  
  async execute(task) {
    const { insights } = task.inputData;
    console.log('Generating actionable recommendations...');
    
    const recommendation = {
      id: this.generateId(),
      executiveSummary: this.createExecutiveSummary(insights),
      immediateActions: this.getImmediateActions(insights),
      strategicRecommendations: this.getStrategicRecommendations(insights),
      expectedOutcomes: this.projectOutcomes(insights),
      confidenceLevel: insights.confidence,
      generatedAt: new Date().toISOString()
    };
    
    return recommendation;
  }
  
  generateId() {
    return `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  createExecutiveSummary(insights) {
    const { topInsight, prioritizedActions } = insights;
    
    let summary = `${topInsight.insight}. `;
    
    if (topInsight.type === 'critical_correlation') {
      summary += `Immediate action required to prevent further deterioration. `;
    } else if (topInsight.type === 'opportunity') {
      summary += `Significant growth opportunity identified. `;
    }
    
    summary += `${prioritizedActions.length} key actions recommended with ${(insights.confidence * 100).toFixed(0)}% confidence.`;
    
    return summary;
  }
  
  getImmediateActions(insights) {
    const actions = [];
    const { prioritizedActions, topInsight } = insights;
    
    // First 48 hours actions
    if (topInsight.evidence?.appCrashes) {
      actions.push({
        action: 'Deploy hotfix for app crashes',
        timeline: '24 hours',
        owner: 'Engineering Team',
        success_metric: 'Crash rate < 1%'
      });
    }
    
    prioritizedActions
      .filter(a => a.impact === 'critical' || a.impact === 'high')
      .slice(0, 3)
      .forEach(pa => {
        actions.push({
          action: pa.action,
          timeline: pa.impact === 'critical' ? '48 hours' : '1 week',
          owner: this.assignOwner(pa),
          success_metric: this.defineMetric(pa)
        });
      });
    
    return actions;
  }
  
  getStrategicRecommendations(insights) {
    const recommendations = [];
    
    // Long-term strategic items
    if (insights.correlations.length > 0) {
      recommendations.push({
        area: 'Product Quality',
        recommendation: 'Implement comprehensive QA process',
        rationale: 'Multiple quality issues impacting retention',
        timeline: '30 days',
        expectedImpact: '15-20% reduction in churn'
      });
    }
    
    const underutilized = insights.prioritizedActions
      .find(a => a.source === 'metrics' && a.type === 'opportunity');
    
    if (underutilized) {
      recommendations.push({
        area: 'User Experience',
        recommendation: 'Redesign onboarding flow',
        rationale: 'Low feature adoption indicates discovery issues',
        timeline: '60 days',
        expectedImpact: '25% increase in feature adoption'
      });
    }
    
    return recommendations;
  }
  
  projectOutcomes(insights) {
    const confidence = insights.confidence;
    
    return {
      week1: {
        metric: 'App Store Rating',
        current: 3.2,
        projected: 3.3,
        confidence: confidence * 0.9
      },
      month1: {
        metric: 'Monthly Churn',
        current: '23%',
        projected: '18%',
        confidence: confidence * 0.8
      },
      month3: {
        metric: 'User Retention (D30)',
        current: '23%',
        projected: '35%',
        confidence: confidence * 0.7
      }
    };
  }
  
  assignOwner(action) {
    if (action.action.toLowerCase().includes('engineer') || 
        action.action.toLowerCase().includes('fix') ||
        action.action.toLowerCase().includes('app')) {
      return 'Engineering Team';
    }
    if (action.action.toLowerCase().includes('support')) {
      return 'Customer Success Team';
    }
    if (action.action.toLowerCase().includes('feature') ||
        action.action.toLowerCase().includes('onboarding')) {
      return 'Product Team';
    }
    return 'Operations Team';
  }
  
  defineMetric(action) {
    if (action.type === 'critical' && action.reason?.includes('Crashes')) {
      return 'Crash-free sessions > 99%';
    }
    if (action.type === 'operational') {
      return 'Support response time < 2 hours';
    }
    if (action.type === 'opportunity') {
      return `Feature adoption > ${action.potentialImpact?.match(/\d+/)?.[0] || 20}%`;
    }
    return 'Improvement in key metric';
  }
}