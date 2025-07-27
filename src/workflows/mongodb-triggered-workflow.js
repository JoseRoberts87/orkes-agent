export const mongodbTriggeredWorkflow = {
  name: 'mongodb_triggered_analysis',
  version: 2,
  description: 'Workflow triggered by MongoDB data changes via webhooks',
  tasks: [
    {
      name: 'process_webhook_data',
      taskReferenceName: 'process_webhook',
      type: 'SIMPLE',
      inputParameters: {
        webhookData: '${workflow.input.webhookData}',
        dataType: '${workflow.input.dataType}',
        startup_id: '${workflow.input.startup_id}'
      }
    },
    {
      name: 'process_review_change',
      taskReferenceName: 'process_review',
      type: 'SUB_WORKFLOW',
      subWorkflowParam: {
        name: 'coo_assistant_analysis',
        version: 2
      },
      inputParameters: {
        startup_id: '${workflow.input.startup_id}',
        trigger_type: '${workflow.input.dataType}_change',
        change_data: '${workflow.input.webhookData}'
      }
    }
  ],
  outputParameters: {
    processedData: '${process_webhook.output}',
    analysisResult: '${process_review.output}',
    workflowId: '${workflow.workflowId}'
  }
};

// Batch processing workflow for handling multiple changes
export const mongodbBatchWorkflow = {
  name: 'mongodb_batch_analysis',
  version: 2,
  description: 'Process multiple MongoDB changes as a batch',
  tasks: [
    {
      name: 'collect_batch_data',
      taskReferenceName: 'collect_batch',
      type: 'SIMPLE',
      inputParameters: {
        batch_id: '${workflow.input.batch_id}',
        startup_id: '${workflow.input.startup_id}',
        changes: '${workflow.input.changes}'
      }
    },
    {
      name: 'aggregate_changes',
      taskReferenceName: 'aggregate',
      type: 'SIMPLE',
      inputParameters: {
        changes: '${collect_batch.output.changes}',
        groupByType: true
      }
    },
    {
      name: 'run_batch_analysis',
      taskReferenceName: 'batch_analysis',
      type: 'SUB_WORKFLOW',
      subWorkflowParam: {
        name: 'coo_assistant_analysis',
        version: 2
      },
      inputParameters: {
        startup_id: '${workflow.input.startup_id}',
        batch_data: '${aggregate.output}'
      }
    }
  ],
  outputParameters: {
    batchSize: '${aggregate.output.totalCount}',
    analysisResult: '${batch_analysis.output}'
  }
};