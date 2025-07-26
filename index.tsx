/*
 * To set up the project, install the dependencies, and run the application, follow these steps:
 *
 * 1. Install the Conductor JavaScript SDK:
 *    npm install @io-orkes/conductor-javascript
 *    or
 *    yarn add @io-orkes/conductor-javascript
 *
 * 2. Install ts-node if not already installed:
 *    npm install ts-node
 *    or
 *    yarn add ts-node
 *
 * 3. Run the TypeScript file directly with ts-node (replace yourFile.ts with your actual file name):
 *    npx ts-node yourFile.ts
 */

import {
  type ConductorWorker,
  orkesConductorClient,
  TaskManager,
} from "@io-orkes/conductor-javascript";

async function test() {
  const clientPromise = orkesConductorClient({
    keyId: "w7ex00612841-6a59-11f0-b0d8-2aadd5744325", // optional
    keySecret: "PyZCJZDaiwwGtOoGjkIWoEobCKQL06JPZuRkVcaRwUwezVrk", // optional
    TOKEN: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtqbVlNWThEV2VOU1lKZmZSSjFXNSJ9.eyJnaXZlbl9uYW1lIjoiSm9zZSIsImZhbWlseV9uYW1lIjoiUm9iZXJ0cyIsIm5pY2tuYW1lIjoid2VidGVycHIiLCJuYW1lIjoiSm9zZSBSb2JlcnRzIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0tndGp0YVpYelB3NUpUSk8zVElLWHBNUTRzeVlCaWNEcmxQVm5xdXFZREl6RUhBT09pPXM5Ni1jIiwidXBkYXRlZF9hdCI6IjIwMjUtMDctMjZUMTg6MzE6MTQuMDU1WiIsImVtYWlsIjoid2VidGVycHJAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzcyI6Imh0dHBzOi8vYXV0aC5vcmtlcy5pby8iLCJhdWQiOiJNeUhKWXVUc3FOTDhEYUxJR3dvdTZmU2F4ekYzVEZyVyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTA1MTU3MjgyNDM0NDg3MDE0ODcyIiwiaWF0IjoxNzUzNTU0Njc1LCJleHAiOjE3NTM1OTA2NzUsInNpZCI6ImFhQW5WYkpua19heDhHOEo0eXBQQlFKczdZcXdmNWhRIiwibm9uY2UiOiJTVUZ1YjBWMFVFMW1PV0o2VFdsaVIzY3RYMmR1UzNWVFZpNHhOVU5tVDJnMlNISjJNRkpsUVhCWldRPT0ifQ.T66DYv2lYCuwIsi4hVfSxIvCWQO_q_0UQTxiLLaZ8IXCmFZIY5zdg_EBUoBgRNzWNrd-gAbaICUarw606X4hmOmYI0mcS7bCqaH3Jtg-NJ8OwIJn8z2YQYm65a7OOml9N7Ud0fU4hKQXyYdZJ-a2FRy9j53axn5vt1z2cLSRaJbf8pxPoac0Sl7HV-gHFsF86EFmj8fH9g94TZF6evVYgkgoX1cojrP8spw7aZ-r_vnQOr_UL-t6_xo610Mtu7lqQJ8K9VcjA-x0FurYG-5XUUkrdM66P_6LWFDLfVa0gChcoNbpIfnN1kwzSYO_JC6hdhmkQ3YgbNAw2IDlFV-eog",
    serverUrl: "https://developer.orkescloud.com/api"
  });

  const client = await clientPromise;

  const customWorker: ConductorWorker = {
    taskDefName: "task-eir-hello",
    execute: async ({ inputData, taskId }) => {
      return {
        outputData: {
          greeting: `Hello World `,
        },
        status: "COMPLETED",
      };
    },
  };

  const manager = new TaskManager(client, [customWorker], {
    options: { pollInterval: 100, concurrency: 1 },
  });

  manager.startPolling();
}
test();