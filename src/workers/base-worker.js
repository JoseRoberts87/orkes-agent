export class AgentWorker {
  constructor(taskName) {
    this.taskName = taskName;
  }
  
  async execute(task) {
    throw new Error('Execute method must be implemented by subclass');
  }
  
  // Convert to ConductorWorker format for TaskManager
  toConductorWorker() {
    return {
      taskDefName: this.taskName,
      execute: async (taskData) => {
        try {
          const result = await this.execute(taskData);
          return {
            status: 'COMPLETED',
            outputData: result
          };
        } catch (error) {
          console.error(`Error in ${this.taskName}:`, error);
          return {
            status: 'FAILED',
            reasonForIncompletion: error.message,
            logs: [`Error: ${error.message}`]
          };
        }
      }
    };
  }
}