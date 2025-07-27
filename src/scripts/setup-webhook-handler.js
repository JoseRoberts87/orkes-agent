import { getClient } from '../config/orkes-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function setupWebhookHandler() {
  console.log('🔧 Setting up Orkes Webhook Event Handler\n');
  
  try {
    const client = await getClient();
    
    if (!client) {
      console.error('❌ Could not connect to Orkes. Check your credentials.');
      return;
    }
    
    // Define the event handler configuration
    const eventHandler = {
      name: 'mongodb_change_handler',
      event: 'mongodb.*.*',  // Matches mongodb.{collection}.{operation}
      condition: 'true',     // Always trigger
      actions: [
        {
          action: 'start_workflow',
          start_workflow: {
            name: 'mongodb_triggered_analysis',
            version: 2,
            input: {
              webhookData: '${data}',
              dataType: '${data.type}',
              startup_id: '${data.startup_id}',
              timestamp: '${timestamp}',
              event: '${event}'
            },
            correlationId: '${data.documentId}'
          }
        }
      ],
      active: true
    };
    
    console.log('📋 Event Handler Configuration:');
    console.log(`   Name: ${eventHandler.name}`);
    console.log(`   Event Pattern: ${eventHandler.event}`);
    console.log(`   Workflow: ${eventHandler.actions[0].start_workflow.name} v${eventHandler.actions[0].start_workflow.version}`);
    console.log(`   Status: ${eventHandler.active ? 'Active' : 'Inactive'}\n`);
    
    // Try to create the event handler
    try {
      await client.eventResource.create(eventHandler);
      console.log('✅ Event handler created successfully!');
    } catch (error) {
      if (error.message?.includes('already exists')) {
        console.log('⚠️  Event handler already exists, updating...');
        
        // Try to update it
        try {
          await client.eventResource.update(eventHandler);
          console.log('✅ Event handler updated successfully!');
        } catch (updateError) {
          console.error('❌ Could not update event handler:', updateError.message);
        }
      } else {
        console.error('❌ Failed to create event handler:', error.message);
      }
    }
    
    // Create additional event handlers for specific operations if needed
    const specificHandlers = [
      {
        name: 'mongodb_batch_handler',
        event: 'mongodb.batch.*',
        workflow: 'mongodb_batch_analysis',
        version: 2
      }
    ];
    
    for (const handler of specificHandlers) {
      const specificHandler = {
        name: handler.name,
        event: handler.event,
        condition: 'true',
        actions: [
          {
            action: 'start_workflow',
            start_workflow: {
              name: handler.workflow,
              version: handler.version,
              input: {
                batch_id: '${data.batch_id}',
                startup_id: '${data.startup_id}',
                changes: '${data.changes}'
              }
            }
          }
        ],
        active: true
      };
      
      try {
        await client.eventResource.create(specificHandler);
        console.log(`✅ Created ${handler.name}`);
      } catch (error) {
        if (error.message?.includes('already exists')) {
          console.log(`⚠️  ${handler.name} already exists`);
        } else {
          console.log(`❌ Failed to create ${handler.name}: ${error.message}`);
        }
      }
    }
    
    console.log('\n📝 Webhook URL for MongoDB Service:');
    console.log(`   ${process.env.ORKES_WEBHOOK_URL}`);
    console.log('\n✨ Setup complete! Your webhook handler is ready.');
    console.log('\n📌 Next steps:');
    console.log('1. Start the MongoDB webhook service: npm run webhook:mongo');
    console.log('2. Trigger changes: npm run trigger-workflow');
    console.log('3. Check workflow executions in Orkes dashboard');
    
  } catch (error) {
    console.error('❌ Error setting up webhook handler:', error);
  }
}

// Alternative: Get webhook URL from Orkes
async function getWebhookInfo() {
  try {
    const client = await getClient();
    
    // List all event handlers
    const handlers = await client.eventResource.getAll();
    
    console.log('\n📋 Existing Event Handlers:');
    handlers.forEach(handler => {
      if (handler.event.includes('mongodb')) {
        console.log(`\n   Name: ${handler.name}`);
        console.log(`   Event: ${handler.event}`);
        console.log(`   Active: ${handler.active}`);
        if (handler.actions[0]?.start_workflow) {
          console.log(`   Workflow: ${handler.actions[0].start_workflow.name} v${handler.actions[0].start_workflow.version}`);
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting webhook info:', error);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--info') {
    getWebhookInfo();
  } else {
    setupWebhookHandler();
  }
}

export { setupWebhookHandler };