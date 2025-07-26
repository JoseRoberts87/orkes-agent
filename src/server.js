import { startServer } from './api/server.js';

// Start the API server
startServer().catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
});