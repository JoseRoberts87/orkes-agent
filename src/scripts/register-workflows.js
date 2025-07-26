import { getClient } from '../config/orkes-client.js';
import { cooAssistantWorkflow } from '../workflows/coo-assistant-workflow.js';
import { mongodbTriggeredWorkflow, mongodbBatchWorkflow } from '../workflows/mongodb-triggered-workflow.js';

async function registerWorkflows() {
  console.log('🚀 Registering workflows with Orkes...\n');
  
  try {
    const client = await getClient();
    
    if (!client) {
      console.error('❌ Could not connect to Orkes. Check your credentials.');
      return;
    }
    
    const workflows = [
      cooAssistantWorkflow,
      mongodbTriggeredWorkflow,
      mongodbBatchWorkflow
    ];
    
    for (const workflow of workflows) {
      try {
        await client.metadataResource.create(workflow);
        console.log(`✅ Registered: ${workflow.name} v${workflow.version}`);
      } catch (error) {
        if (error.message?.includes('already exists')) {
          console.log(`⚠️  Already exists: ${workflow.name} v${workflow.version}`);
          
          // Try to update it
          try {
            await client.metadataResource.update(workflow);
            console.log(`   ✅ Updated existing workflow`);
          } catch (updateError) {
            console.log(`   ❌ Could not update: ${updateError.message}`);
          }
        } else {
          console.error(`❌ Failed to register ${workflow.name}: ${error.message}`);
        }
      }
    }
    
    console.log('\n📋 Workflow Summary:');
    console.log('- coo_assistant_analysis: Main analysis workflow');
    console.log('- mongodb_triggered_analysis: Triggered by MongoDB changes');
    console.log('- mongodb_batch_analysis: Batch processing of changes');
    
  } catch (error) {
    console.error('Failed to register workflows:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  registerWorkflows();
}