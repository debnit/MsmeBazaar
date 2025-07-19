// Minimal polling system for better performance
export class MinimalPollingSystem {
  private static instance: MinimalPollingSystem;
  private pollingIntervals = new Map<string, NodeJS.Timeout>();
  private pollingData = new Map<string, any>();
  private lastPollingTime = new Map<string, number>();

  private constructor() {}

  static getInstance(): MinimalPollingSystem {
    if (!MinimalPollingSystem.instance) {
      MinimalPollingSystem.instance = new MinimalPollingSystem();
    }
    return MinimalPollingSystem.instance;
  }

  // Smart polling with exponential backoff
  startSmartPolling(
    key: string,
    pollFunction: () => Promise<any>,
    options: {
      initialInterval: number;
      maxInterval: number;
      backoffMultiplier: number;
      condition?: (data: any) => boolean;
    },
  ) {
    let currentInterval = options.initialInterval;
    let consecutiveFailures = 0;

    const poll = async () => {
      const startTime = Date.now();

      try {
        const result = await pollFunction();

        // Reset interval on success
        if (consecutiveFailures > 0) {
          currentInterval = options.initialInterval;
          consecutiveFailures = 0;
        }

        this.pollingData.set(key, result);
        this.lastPollingTime.set(key, Date.now());

        // Check if we should continue polling
        if (options.condition && !options.condition(result)) {
          this.stopPolling(key);
          return;
        }

        // Schedule next poll
        const interval = this.pollingIntervals.get(key);
        if (interval) {
          clearTimeout(interval);
        }

        this.pollingIntervals.set(key, setTimeout(poll, currentInterval));

      } catch (error) {
        consecutiveFailures++;

        // Exponential backoff
        currentInterval = Math.min(
          currentInterval * options.backoffMultiplier,
          options.maxInterval,
        );

        console.warn(`Polling failed for ${key}, retrying in ${currentInterval}ms`);

        // Schedule retry
        const interval = this.pollingIntervals.get(key);
        if (interval) {
          clearTimeout(interval);
        }

        this.pollingIntervals.set(key, setTimeout(poll, currentInterval));
      }
    };

    // Start polling
    poll();
  }

  // Event-driven polling (only poll when needed)
  startEventDrivenPolling(
    key: string,
    pollFunction: () => Promise<any>,
    triggerEvents: string[],
    interval: number = 60000, // Default 1 minute
  ) {
    let shouldPoll = false;

    // Listen for trigger events
    triggerEvents.forEach(event => {
      process.on(event, () => {
        shouldPoll = true;
      });
    });

    const poll = async () => {
      if (!shouldPoll) {
        // Schedule next check
        this.pollingIntervals.set(key, setTimeout(poll, interval));
        return;
      }

      try {
        const result = await pollFunction();
        this.pollingData.set(key, result);
        this.lastPollingTime.set(key, Date.now());
        shouldPoll = false; // Reset flag
      } catch (error) {
        console.warn(`Event-driven polling failed for ${key}:`, error);
      }

      // Schedule next check
      this.pollingIntervals.set(key, setTimeout(poll, interval));
    };

    poll();
  }

  // Conditional polling (only poll when condition is met)
  startConditionalPolling(
    key: string,
    pollFunction: () => Promise<any>,
    condition: () => boolean,
    interval: number = 30000, // Default 30 seconds
  ) {
    const poll = async () => {
      if (!condition()) {
        // Schedule next check
        this.pollingIntervals.set(key, setTimeout(poll, interval));
        return;
      }

      try {
        const result = await pollFunction();
        this.pollingData.set(key, result);
        this.lastPollingTime.set(key, Date.now());
      } catch (error) {
        console.warn(`Conditional polling failed for ${key}:`, error);
      }

      // Schedule next check
      this.pollingIntervals.set(key, setTimeout(poll, interval));
    };

    poll();
  }

  // Stop polling
  stopPolling(key: string) {
    const interval = this.pollingIntervals.get(key);
    if (interval) {
      clearTimeout(interval);
      this.pollingIntervals.delete(key);
    }
    this.pollingData.delete(key);
    this.lastPollingTime.delete(key);
  }

  // Get cached data (avoid unnecessary polling)
  getCachedData(key: string, maxAge: number = 300000): any | null {
    const lastTime = this.lastPollingTime.get(key);
    if (!lastTime || Date.now() - lastTime > maxAge) {
      return null;
    }
    return this.pollingData.get(key);
  }

  // Get polling status
  getPollingStatus() {
    return {
      activePolls: this.pollingIntervals.size,
      cachedData: this.pollingData.size,
      lastPollingTimes: Object.fromEntries(this.lastPollingTime),
    };
  }

  // Stop all polling
  stopAllPolling() {
    this.pollingIntervals.forEach(interval => clearTimeout(interval));
    this.pollingIntervals.clear();
    this.pollingData.clear();
    this.lastPollingTime.clear();
  }
}

export const minimalPolling = MinimalPollingSystem.getInstance();
