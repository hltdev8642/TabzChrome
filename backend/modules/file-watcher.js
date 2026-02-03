/**
 * File Watcher Module
 *
 * Uses chokidar to watch files and broadcast changes to WebSocket clients.
 * Each WebSocket client can subscribe to watch specific files.
 */

const chokidar = require('chokidar');
const fs = require('fs').promises;
const path = require('path');
const { createModuleLogger } = require('./logger');

const log = createModuleLogger('FileWatcher');

class FileWatcher {
  constructor() {
    // Map of file path -> Set of WebSocket clients watching this file
    this.fileSubscribers = new Map();

    // Map of WebSocket client -> Set of file paths they're watching
    this.clientSubscriptions = new Map();

    // Map of file path -> chokidar watcher instance
    this.watchers = new Map();

    // Debounce timers for rapid file changes (for streaming detection)
    this.debounceTimers = new Map();

    // Last change timestamps per file (for streaming detection on client)
    this.lastChangeTimestamps = new Map();
  }

  /**
   * Subscribe a WebSocket client to watch a file
   * @param {WebSocket} ws - The WebSocket client
   * @param {string} filePath - Absolute path to the file to watch
   */
  async subscribe(ws, filePath) {
    try {
      // Normalize and validate the path
      const normalizedPath = path.resolve(filePath);

      // Check if file exists
      try {
        await fs.access(normalizedPath);
      } catch (err) {
        log.warn(`File not found for watching: ${normalizedPath}`);
        ws.send(JSON.stringify({
          type: 'file-watch-error',
          path: filePath,
          error: 'File not found'
        }));
        return;
      }

      // Track client -> files mapping
      if (!this.clientSubscriptions.has(ws)) {
        this.clientSubscriptions.set(ws, new Set());
      }
      this.clientSubscriptions.get(ws).add(normalizedPath);

      // Track file -> clients mapping
      if (!this.fileSubscribers.has(normalizedPath)) {
        this.fileSubscribers.set(normalizedPath, new Set());
      }
      this.fileSubscribers.get(normalizedPath).add(ws);

      // Start watching if not already watching this file
      if (!this.watchers.has(normalizedPath)) {
        this.startWatching(normalizedPath);
      }

      // Send initial file content
      const content = await fs.readFile(normalizedPath, 'utf-8');
      const stats = await fs.stat(normalizedPath);

      ws.send(JSON.stringify({
        type: 'file-content',
        path: normalizedPath,
        content,
        modified: stats.mtime.toISOString(),
        size: stats.size
      }));

      log.info(`Client subscribed to: ${normalizedPath}`);
    } catch (err) {
      log.error(`Error subscribing to file: ${err.message}`);
      ws.send(JSON.stringify({
        type: 'file-watch-error',
        path: filePath,
        error: err.message
      }));
    }
  }

  /**
   * Unsubscribe a WebSocket client from watching a file
   * @param {WebSocket} ws - The WebSocket client
   * @param {string} filePath - Path to stop watching
   */
  unsubscribe(ws, filePath) {
    const normalizedPath = path.resolve(filePath);

    // Remove from client subscriptions
    if (this.clientSubscriptions.has(ws)) {
      this.clientSubscriptions.get(ws).delete(normalizedPath);
      if (this.clientSubscriptions.get(ws).size === 0) {
        this.clientSubscriptions.delete(ws);
      }
    }

    // Remove from file subscribers
    if (this.fileSubscribers.has(normalizedPath)) {
      this.fileSubscribers.get(normalizedPath).delete(ws);

      // If no more subscribers, stop watching
      if (this.fileSubscribers.get(normalizedPath).size === 0) {
        this.stopWatching(normalizedPath);
        this.fileSubscribers.delete(normalizedPath);
      }
    }

    log.debug(`Client unsubscribed from: ${normalizedPath}`);
  }

  /**
   * Unsubscribe a WebSocket client from all files (on disconnect)
   * @param {WebSocket} ws - The WebSocket client
   */
  unsubscribeAll(ws) {
    const subscriptions = this.clientSubscriptions.get(ws);
    if (subscriptions) {
      for (const filePath of subscriptions) {
        this.unsubscribe(ws, filePath);
      }
    }
    this.clientSubscriptions.delete(ws);
    log.debug('Client unsubscribed from all files');
  }

  /**
   * Start watching a file with chokidar
   * @param {string} filePath - Absolute path to watch
   */
  startWatching(filePath) {
    if (this.watchers.has(filePath)) {
      return; // Already watching
    }

    const watcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true,
      // Use polling for better cross-platform compatibility (especially WSL)
      usePolling: true,
      interval: 100,
      binaryInterval: 300,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    });

    watcher.on('change', async () => {
      await this.handleFileChange(filePath);
    });

    watcher.on('unlink', () => {
      this.handleFileDeleted(filePath);
    });

    watcher.on('error', (err) => {
      log.error(`Watcher error for ${filePath}: ${err.message}`);
    });

    this.watchers.set(filePath, watcher);
    log.debug(`Started watching: ${filePath}`);
  }

  /**
   * Stop watching a file
   * @param {string} filePath - Path to stop watching
   */
  stopWatching(filePath) {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
      log.debug(`Stopped watching: ${filePath}`);
    }

    // Clear any pending debounce timer
    const timer = this.debounceTimers.get(filePath);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(filePath);
    }
  }

  /**
   * Handle file change event - debounce and broadcast
   * @param {string} filePath - Path of changed file
   */
  async handleFileChange(filePath) {
    // Record timestamp for streaming detection
    const now = Date.now();
    const lastChange = this.lastChangeTimestamps.get(filePath) || 0;
    this.lastChangeTimestamps.set(filePath, now);

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce to batch rapid changes (50ms)
    this.debounceTimers.set(filePath, setTimeout(async () => {
      this.debounceTimers.delete(filePath);
      await this.broadcastFileChange(filePath, now, lastChange);
    }, 50));
  }

  /**
   * Broadcast file change to all subscribers
   * @param {string} filePath - Path of changed file
   * @param {number} timestamp - When the change occurred
   * @param {number} lastTimestamp - When the previous change occurred
   */
  async broadcastFileChange(filePath, timestamp, lastTimestamp) {
    const subscribers = this.fileSubscribers.get(filePath);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);

      // Calculate time since last change for streaming detection
      const timeSinceLastChange = timestamp - lastTimestamp;

      const message = JSON.stringify({
        type: 'file-change',
        path: filePath,
        content,
        modified: stats.mtime.toISOString(),
        size: stats.size,
        timestamp,
        timeSinceLastChange
      });

      // Send to all subscribers
      for (const ws of subscribers) {
        if (ws.readyState === 1) { // WebSocket.OPEN
          try {
            ws.send(message);
          } catch (err) {
            log.error(`Error sending to client: ${err.message}`);
            // Remove dead connection
            this.unsubscribeAll(ws);
          }
        } else {
          // Connection closed, clean up
          this.unsubscribeAll(ws);
        }
      }

      log.debug(`Broadcast change for ${path.basename(filePath)} to ${subscribers.size} clients`);
    } catch (err) {
      log.error(`Error reading changed file: ${err.message}`);
    }
  }

  /**
   * Handle file deletion
   * @param {string} filePath - Path of deleted file
   */
  handleFileDeleted(filePath) {
    const subscribers = this.fileSubscribers.get(filePath);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message = JSON.stringify({
      type: 'file-deleted',
      path: filePath
    });

    for (const ws of subscribers) {
      if (ws.readyState === 1) {
        try {
          ws.send(message);
        } catch (err) {
          log.error(`Error sending delete notification: ${err.message}`);
        }
      }
    }

    // Stop watching the deleted file
    this.stopWatching(filePath);
    this.fileSubscribers.delete(filePath);

    log.info(`File deleted, stopped watching: ${filePath}`);
  }

  /**
   * Get statistics about current watchers
   */
  getStats() {
    return {
      watchedFiles: this.watchers.size,
      totalSubscriptions: Array.from(this.fileSubscribers.values())
        .reduce((sum, set) => sum + set.size, 0),
      connectedClients: this.clientSubscriptions.size
    };
  }

  /**
   * Cleanup all watchers (on shutdown)
   */
  cleanup() {
    for (const [filePath, watcher] of this.watchers) {
      watcher.close();
      log.debug(`Closed watcher: ${filePath}`);
    }
    this.watchers.clear();
    this.fileSubscribers.clear();
    this.clientSubscriptions.clear();
    this.debounceTimers.clear();
    this.lastChangeTimestamps.clear();
    log.info('File watcher cleanup complete');
  }
}

// Export singleton instance
module.exports = new FileWatcher();
