// Event Handler Configuration for Orkes Conductor
// This should be configured in the Orkes UI under Events > Event Handlers

export const mongodbEventHandler = {
  name: 'mongodb-change-handler',
  event: 'webhook:mongodb-changes',
  condition: '$.event =~ "mongodb.*"',
  evaluatorType: 'javascript',
  actions: [
    {
      action: 'start_workflow',
      start_workflow: {
        name: 'mongodb_triggered_analysis',
        version: 1,
        input: {
          webhookData: '${$}',
          timestamp: '${$.timestamp}',
          dataType: '${$.data.type}',
          startup_id: '${$.data.startup_id}'
        },
        correlationId: '${$.data.documentId}'
      }
    }
  ],
  active: true
};

// Alternative: Event handler for batch processing
export const mongodbBatchEventHandler = {
  name: 'mongodb-batch-handler',
  event: 'webhook:mongodb-batch',
  condition: '$.batch_mode == true',
  evaluatorType: 'javascript',
  actions: [
    {
      action: 'start_workflow',
      start_workflow: {
        name: 'mongodb_batch_analysis',
        version: 1,
        input: {
          batch_id: '${$.batch_id}',
          startup_id: '${$.startup_id}',
          changes: '${$.changes}'
        }
      }
    }
  ],
  active: true
};

// Event handler for critical changes (immediate processing)
export const mongodbCriticalEventHandler = {
  name: 'mongodb-critical-handler',
  event: 'webhook:mongodb-critical',
  condition: '$.priority == "high" || $.data.type == "alerts"',
  evaluatorType: 'javascript',
  actions: [
    {
      action: 'start_workflow',
      start_workflow: {
        name: 'coo_assistant_analysis',
        version: 1,
        input: {
          startup_id: '${$.data.startup_id}',
          priority: 'high',
          trigger: 'mongodb_critical_change',
          data: '${$.data}'
        }
      }
    }
  ],
  active: true
};