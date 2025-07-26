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
    keyId: "", // optional
    keySecret: "", // optional
    TOKEN: "",
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