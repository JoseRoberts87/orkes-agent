import { orkesConductorClient, TaskManager } from '@io-orkes/conductor-javascript';
import dotenv from 'dotenv';

dotenv.config();

const serverUrl = process.env.ORKES_SERVER_URL || 'https://play.orkes.io';
const keyId = process.env.ORKES_API_KEY;
const keySecret = process.env.ORKES_SECRET_KEY;
const TOKEN = process.env.ORKES_TOKEN;

if (!keyId && process.env.DEMO_MODE !== 'true') {
  console.error('ERROR: ORKES_API_KEY is not set in environment variables');
  console.log('Please set ORKES_API_KEY in your .env file');
  console.log('Or run in demo mode by setting DEMO_MODE=true');
  process.exit(1);
}

let conductorClient = null;

// Initialize client with authentication
async function initializeClient() {
  if (!keyId || process.env.DEMO_MODE === 'true') {
    return null;
  }
  
  try {
    // Use the same pattern as the working example
    const clientPromise = orkesConductorClient({
      keyId,
      keySecret,
      TOKEN,
      serverUrl
    });
    
    conductorClient = await clientPromise;
    
    // Test the connection by trying to get workflows
    try {
      const workflows = await conductorClient.metadataResource.getAllWorkflows();
      console.log(`✓ Successfully connected to Orkes (found ${workflows.length} workflows)`);
    } catch (error) {
      console.log('⚠️  Connected but could not list workflows - this is OK for new environments');
    }
    
    return conductorClient;
  } catch (error) {
    console.error('Failed to authenticate with Orkes:', error.message);
    console.error('Please check your API credentials');
    if (process.env.DEMO_MODE === 'true') {
      console.log('Continuing in demo mode');
      return null;
    }
    // Don't throw error, let's continue in demo mode
    console.log('⚠️  Falling back to demo mode');
    return null;
  }
}

// Export a promise that resolves to the client
export const getClient = async () => {
  if (!conductorClient && keyId) {
    conductorClient = await initializeClient();
  }
  return conductorClient;
};

// Export TaskManager for worker management
export { conductorClient, TaskManager };

export const config = {
  serverUrl,
  keyId,
  keySecret,
  TOKEN,
  demoMode: process.env.DEMO_MODE === 'true' || !conductorClient
};

console.log(`Orkes client configuration loaded for ${serverUrl} (Demo mode: ${config.demoMode})`);