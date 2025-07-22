// Offline-first PWA synchronization system for unstable connectivity
interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
}

interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pendingActions: number;
  lastSync: number;
  conflictCount: number;
}

class OfflineSyncManager {
  private db: IDBDatabase | null = null;
  private syncQueue: OfflineAction[] = [];
  private syncStatus: SyncStatus = {
    online: navigator.onLine,
    syncing: false,
    pendingActions: 0,
    lastSync: 0,
    conflictCount: 0,
  };
  private syncInterval: number | null = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeDatabase();
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  // Initialize IndexedDB for offline storage
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MSMESquareOffline', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadPendingActions();
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('actions')) {
          db.createObjectStore('actions', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp');
        }
        
        if (!db.objectStoreNames.contains('listings')) {
          const listingsStore = db.createObjectStore('listings', { keyPath: 'id' });
          listingsStore.createIndex('lastModified', 'lastModified');
        }
        
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'userId' });
        }
      };
    });
  }

  // Setup network connectivity listeners
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.syncStatus.online = true;
      this.emit('status-change', this.syncStatus);
      this.syncPendingActions();
    });
    
    window.addEventListener('offline', () => {
      this.syncStatus.online = false;
      this.emit('status-change', this.syncStatus);
    });
  }

  // Add action to sync queue
  async addAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const offlineAction: OfflineAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    this.syncQueue.push(offlineAction);
    this.syncStatus.pendingActions = this.syncQueue.length;
    
    // Store in IndexedDB
    await this.storeAction(offlineAction);
    
    // Try immediate sync if online
    if (this.syncStatus.online) {
      this.syncPendingActions();
    }
    
    this.emit('action-queued', offlineAction);
    return offlineAction.id;
  }

  // Sync pending actions when online
  private async syncPendingActions(): Promise<void> {
    if (this.syncStatus.syncing || !this.syncStatus.online || this.syncQueue.length === 0) {
      return;
    }
    
    this.syncStatus.syncing = true;
    this.emit('sync-start');
    
    const actionsToSync = [...this.syncQueue].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    for (const action of actionsToSync) {
      try {
        await this.syncAction(action);
        this.removeAction(action.id);
      } catch (error) {
        console.error('Sync failed for action:', action.id, error);
        action.retryCount++;
        
        // Remove action if max retries reached
        if (action.retryCount >= 3) {
          this.removeAction(action.id);
          this.emit('sync-failed', action);
        } else {
          await this.updateAction(action);
        }
      }
    }
    
    this.syncStatus.syncing = false;
    this.syncStatus.lastSync = Date.now();
    this.syncStatus.pendingActions = this.syncQueue.length;
    this.emit('sync-complete');
  }

  // Sync individual action
  private async syncAction(action: OfflineAction): Promise<void> {
    const endpoint = this.getEndpointForResource(action.resource);
    const method = this.getMethodForAction(action.type);
    
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: action.type !== 'delete' ? JSON.stringify(action.data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }
    
    // Handle conflict resolution
    if (response.status === 409) {
      await this.handleConflict(action, await response.json());
    }
  }

  // Cache data for offline access
  async cacheData(key: string, data: any, ttl: number = 3600000): Promise<void> {
    if (!this.db) return;
    
    const cacheItem = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    await store.put(cacheItem);
  }

  // Get cached data
  async getCachedData(key: string): Promise<any> {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        
        // Check if cache is expired
        if (Date.now() - result.timestamp > result.ttl) {
          resolve(null);
          return;
        }
        
        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Store MSME listing for offline access
  async storeListingOffline(listing: any): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['listings'], 'readwrite');
    const store = transaction.objectStore('listings');
    await store.put({
      ...listing,
      lastModified: Date.now(),
    });
  }

  // Get offline listings
  async getOfflineListings(): Promise<any[]> {
    if (!this.db) return [];
    
    const transaction = this.db.transaction(['listings'], 'readonly');
    const store = transaction.objectStore('listings');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Store user profile offline
  async storeProfileOffline(profile: any): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['profile'], 'readwrite');
    const store = transaction.objectStore('profile');
    await store.put(profile);
  }

  // Get offline profile
  async getOfflineProfile(userId: string): Promise<any> {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['profile'], 'readonly');
    const store = transaction.objectStore('profile');
    const request = store.get(userId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Manual sync trigger
  async forcSync(): Promise<void> {
    if (this.syncStatus.online) {
      await this.syncPendingActions();
    }
  }

  // Clear all offline data
  async clearOfflineData(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['actions', 'cache', 'listings', 'profile'], 'readwrite');
    
    await Promise.all([
      transaction.objectStore('actions').clear(),
      transaction.objectStore('cache').clear(),
      transaction.objectStore('listings').clear(),
      transaction.objectStore('profile').clear(),
    ]);
    
    this.syncQueue = [];
    this.syncStatus.pendingActions = 0;
    this.emit('data-cleared');
  }

  // Event listener system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Private helper methods
  private emit(event: string, data?: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => callback(data));
    }
  }

  private async storeAction(action: OfflineAction): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');
    await store.put(action);
  }

  private async updateAction(action: OfflineAction): Promise<void> {
    const index = this.syncQueue.findIndex(a => a.id === action.id);
    if (index > -1) {
      this.syncQueue[index] = action;
      await this.storeAction(action);
    }
  }

  private async removeAction(actionId: string): Promise<void> {
    this.syncQueue = this.syncQueue.filter(a => a.id !== actionId);
    
    if (this.db) {
      const transaction = this.db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      await store.delete(actionId);
    }
  }

  private async loadPendingActions(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['actions'], 'readonly');
    const store = transaction.objectStore('actions');
    const request = store.getAll();
    
    request.onsuccess = () => {
      this.syncQueue = request.result;
      this.syncStatus.pendingActions = this.syncQueue.length;
      this.emit('actions-loaded');
    };
  }

  private getEndpointForResource(resource: string): string {
    const endpoints = {
      'listings': '/api/msme-listings',
      'interests': '/api/buyer-interests',
      'profile': '/api/profile',
      'messages': '/api/messages',
      'valuations': '/api/valuations',
    };
    
    return endpoints[resource] || '/api/sync';
  }

  private getMethodForAction(type: string): string {
    return {
      'create': 'POST',
      'update': 'PUT',
      'delete': 'DELETE',
    }[type] || 'POST';
  }

  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  private async handleConflict(action: OfflineAction, conflictData: any): Promise<void> {
    this.syncStatus.conflictCount++;
    this.emit('conflict-detected', { action, conflictData });
    
    // For now, server wins - in production, implement proper conflict resolution
    console.warn('Conflict detected for action:', action.id, 'Server data:', conflictData);
  }

  private startPeriodicSync(): void {
    this.syncInterval = window.setInterval(() => {
      if (this.syncStatus.online && this.syncQueue.length > 0) {
        this.syncPendingActions();
      }
    }, 30000); // Sync every 30 seconds
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.db) {
      this.db.close();
    }
  }
}

export const offlineSyncManager = new OfflineSyncManager();
export { OfflineAction, SyncStatus };