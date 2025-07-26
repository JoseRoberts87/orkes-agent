import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class DirectoryWatcher extends EventEmitter {
  constructor(watchPath, options = {}) {
    super();
    this.watchPath = watchPath;
    this.options = {
      recursive: true,
      debounceDelay: 1000, // Wait 1 second after last change
      fileTypes: ['.json', '.csv', '.txt'], // File types to watch
      ...options
    };
    this.watchers = new Map();
    this.debounceTimers = new Map();
  }
  
  start() {
    console.log(`📁 Starting directory watcher on: ${this.watchPath}`);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(this.watchPath)) {
      fs.mkdirSync(this.watchPath, { recursive: true });
      console.log(`Created watch directory: ${this.watchPath}`);
    }
    
    // Watch the main directory
    this.watchDirectory(this.watchPath);
    
    // If recursive, watch subdirectories
    if (this.options.recursive) {
      this.watchSubdirectories(this.watchPath);
    }
    
    console.log(`✅ Directory watcher active. Monitoring for changes...`);
  }
  
  watchDirectory(dirPath) {
    try {
      const watcher = fs.watch(dirPath, (eventType, filename) => {
        if (!filename) return;
        
        const filePath = path.join(dirPath, filename);
        
        // Check if file type should be watched
        if (!this.shouldWatchFile(filename)) return;
        
        // Debounce the event
        this.debounceEvent(filePath, eventType, filename);
      });
      
      this.watchers.set(dirPath, watcher);
      
      watcher.on('error', (error) => {
        console.error(`Watch error on ${dirPath}:`, error);
        this.emit('error', { path: dirPath, error });
      });
      
    } catch (error) {
      console.error(`Failed to watch directory ${dirPath}:`, error);
    }
  }
  
  watchSubdirectories(dirPath) {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          const subPath = path.join(dirPath, item.name);
          this.watchDirectory(subPath);
          this.watchSubdirectories(subPath); // Recursive
        }
      }
    } catch (error) {
      console.error(`Failed to read directory ${dirPath}:`, error);
    }
  }
  
  shouldWatchFile(filename) {
    // Ignore hidden files and temp files
    if (filename.startsWith('.') || filename.endsWith('~')) return false;
    
    // Check file extension
    const ext = path.extname(filename).toLowerCase();
    return this.options.fileTypes.includes(ext);
  }
  
  debounceEvent(filePath, eventType, filename) {
    // Clear existing timer for this file
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.handleFileChange(filePath, eventType, filename);
      this.debounceTimers.delete(filePath);
    }, this.options.debounceDelay);
    
    this.debounceTimers.set(filePath, timer);
  }
  
  async handleFileChange(filePath, eventType, filename) {
    console.log(`\n🔄 File ${eventType}: ${filename}`);
    
    try {
      // Check if file exists (might have been deleted)
      const exists = fs.existsSync(filePath);
      
      if (!exists && eventType === 'rename') {
        // File was deleted or moved
        this.emit('file:deleted', {
          path: filePath,
          filename,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      if (exists) {
        // Read file contents
        const stats = fs.statSync(filePath);
        
        // Skip directories
        if (stats.isDirectory()) {
          if (this.options.recursive && !this.watchers.has(filePath)) {
            this.watchDirectory(filePath);
          }
          return;
        }
        
        // Read file data
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Parse based on file type
        let data = content;
        if (filename.endsWith('.json')) {
          try {
            data = JSON.parse(content);
          } catch (e) {
            console.warn(`Failed to parse JSON file ${filename}:`, e.message);
          }
        }
        
        // Emit change event
        this.emit('file:changed', {
          path: filePath,
          filename,
          eventType,
          size: stats.size,
          modified: stats.mtime,
          data,
          timestamp: new Date().toISOString()
        });
        
        // Emit specific event based on file pattern
        this.emitPatternBasedEvent(filename, data);
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      this.emit('error', { path: filePath, error });
    }
  }
  
  emitPatternBasedEvent(filename, data) {
    // Emit specific events based on filename patterns
    const lower = filename.toLowerCase();
    
    if (lower.includes('review') || lower.includes('feedback')) {
      this.emit('data:reviews', { filename, data });
    } else if (lower.includes('metric') || lower.includes('analytics')) {
      this.emit('data:metrics', { filename, data });
    } else if (lower.includes('sales') || lower.includes('revenue')) {
      this.emit('data:sales', { filename, data });
    } else if (lower.includes('customer') || lower.includes('user')) {
      this.emit('data:customers', { filename, data });
    }
    
    // Always emit generic data event
    this.emit('data:new', { filename, data });
  }
  
  stop() {
    console.log('Stopping directory watcher...');
    
    // Clear all watchers
    for (const [path, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    console.log('Directory watcher stopped');
  }
  
  // Get current state of watched directory
  getSnapshot() {
    const snapshot = {
      path: this.watchPath,
      files: [],
      totalSize: 0,
      lastModified: null
    };
    
    try {
      this.scanDirectory(this.watchPath, snapshot);
    } catch (error) {
      console.error('Error creating snapshot:', error);
    }
    
    return snapshot;
  }
  
  scanDirectory(dirPath, snapshot) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory() && this.options.recursive) {
        this.scanDirectory(itemPath, snapshot);
      } else if (item.isFile() && this.shouldWatchFile(item.name)) {
        const stats = fs.statSync(itemPath);
        snapshot.files.push({
          path: itemPath,
          name: item.name,
          size: stats.size,
          modified: stats.mtime
        });
        snapshot.totalSize += stats.size;
        
        if (!snapshot.lastModified || stats.mtime > snapshot.lastModified) {
          snapshot.lastModified = stats.mtime;
        }
      }
    }
  }
}