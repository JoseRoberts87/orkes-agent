import EventEmitter from 'events';

export class EventQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
    this.processedCount = 0;
    this.failedCount = 0;
  }
  
  // Add event to queue
  enqueue(event) {
    const queuedEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'pending',
      ...event
    };
    
    this.queue.push(queuedEvent);
    console.log(`📥 Event queued: ${queuedEvent.id} (${event.type})`);
    
    // Emit event for real-time listeners
    this.emit('event:queued', queuedEvent);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
    
    return queuedEvent.id;
  }
  
  // Process events in queue
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      
      try {
        console.log(`⚙️  Processing event: ${event.id}`);
        event.status = 'processing';
        this.emit('event:processing', event);
        
        // Process based on event type
        await this.processEvent(event);
        
        event.status = 'completed';
        event.completedAt = new Date().toISOString();
        this.processedCount++;
        
        console.log(`✅ Event completed: ${event.id}`);
        this.emit('event:completed', event);
        
      } catch (error) {
        event.status = 'failed';
        event.error = error.message;
        event.failedAt = new Date().toISOString();
        this.failedCount++;
        
        console.error(`❌ Event failed: ${event.id}`, error.message);
        this.emit('event:failed', event);
      }
      
      // Small delay between processing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.processing = false;
    this.emit('queue:empty');
  }
  
  // Process individual event
  async processEvent(event) {
    switch (event.type) {
      case 'analysis_request':
        return this.emit('analyze', event.data);
        
      case 'webhook':
        return this.emit('webhook', event.data);
        
      case 'outcome_update':
        return this.emit('outcome', event.data);
        
      default:
        throw new Error(`Unknown event type: ${event.type}`);
    }
  }
  
  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
      successRate: this.processedCount > 0 
        ? ((this.processedCount / (this.processedCount + this.failedCount)) * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }
  
  // Get pending events
  getPendingEvents() {
    return this.queue.filter(e => e.status === 'pending');
  }
}