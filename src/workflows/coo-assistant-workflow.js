export const cooAssistantWorkflow = {
  name: 'coo_assistant_analysis',
  version: 1,
  description: 'Analyzes business data and provides AI recommendations',
  tasks: [
    {
      name: 'collect_data',
      taskReferenceName: 'collect_data',
      type: 'SIMPLE',
      inputParameters: {
        startup_id: '${workflow.input.startup_id}'
      }
    },
    {
      name: 'parallel_analysis',
      taskReferenceName: 'parallel_analysis',
      type: 'FORK_JOIN',
      forkTasks: [
        [{
          name: 'analyze_reviews',
          taskReferenceName: 'review_analysis',
          type: 'SIMPLE',
          inputParameters: {
            data: '${collect_data.output.reviews}'
          }
        }],
        [{
          name: 'analyze_product_metrics',
          taskReferenceName: 'product_analysis',
          type: 'SIMPLE',
          inputParameters: {
            data: '${collect_data.output.metrics}'
          }
        }]
      ],
      joinOn: ['review_analysis', 'product_analysis']
    },
    {
      name: 'synthesize_insights',
      taskReferenceName: 'synthesis',
      type: 'SIMPLE',
      inputParameters: {
        reviews: '${review_analysis.output}',
        metrics: '${product_analysis.output}'
      }
    },
    {
      name: 'generate_recommendation',
      taskReferenceName: 'recommendation',
      type: 'SIMPLE',
      inputParameters: {
        insights: '${synthesis.output}'
      }
    }
  ],
  outputParameters: {
    recommendation: '${recommendation.output}',
    insights: '${synthesis.output}',
    workflowId: '${workflow.workflowId}'
  }
};