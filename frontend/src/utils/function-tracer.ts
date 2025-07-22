// Function call tracing utility for performance monitoring and debugging

interface TraceEntry {
  functionName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  args?: any[];
  result?: any;
  error?: Error;
  stackTrace?: string;
}

class FunctionTracer {
  private static instance: FunctionTracer;
  private traces: Map<string, TraceEntry[]> = new Map();
  private activeTraces: Map<string, TraceEntry> = new Map();
  private maxTracesPerFunction = 100;
  private enabledFunctions: Set<string> = new Set();
  private globalEnabled = true;

  private constructor() {}

  public static getInstance(): FunctionTracer {
    if (!FunctionTracer.instance) {
      FunctionTracer.instance = new FunctionTracer();
    }
    return FunctionTracer.instance;
  }

  // Enable tracing for specific functions
  public enableFunction(functionName: string): void {
    this.enabledFunctions.add(functionName);
  }

  // Disable tracing for specific functions
  public disableFunction(functionName: string): void {
    this.enabledFunctions.delete(functionName);
  }

  // Enable/disable global tracing
  public setGlobalEnabled(enabled: boolean): void {
    this.globalEnabled = enabled;
  }

  // Start tracing a function call (async-aware)
  public startTrace(functionName: string, args?: any[]): string {
    if (!this.globalEnabled || (!this.enabledFunctions.has(functionName) && this.enabledFunctions.size > 0)) {
      return '';
    }

    const traceId = `${functionName}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const startTime = performance.now();
    
    const trace: TraceEntry = {
      functionName,
      startTime,
      args: args ? this.sanitizeArgs(args) : undefined,
      stackTrace: this.getStackTrace()
    };

    this.activeTraces.set(traceId, trace);
    return traceId;
  }

  // Async trace starter
  public async startTraceAsync(functionName: string, args?: any[]): Promise<string> {
    return new Promise((resolve) => {
      // Use requestAnimationFrame for non-blocking execution
      requestAnimationFrame(() => {
        const traceId = this.startTrace(functionName, args);
        resolve(traceId);
      });
    });
  }

  // End tracing a function call (async-aware)
  public endTrace(traceId: string, result?: any, error?: Error): void {
    if (!traceId || !this.activeTraces.has(traceId)) {
      return;
    }

    const trace = this.activeTraces.get(traceId)!;
    const endTime = performance.now();
    
    trace.endTime = endTime;
    trace.duration = endTime - trace.startTime;
    trace.result = result ? this.sanitizeResult(result) : undefined;
    trace.error = error;

    // Store completed trace
    const functionName = trace.functionName;
    if (!this.traces.has(functionName)) {
      this.traces.set(functionName, []);
    }

    const functionTraces = this.traces.get(functionName)!;
    functionTraces.push(trace);

    // Limit traces per function
    if (functionTraces.length > this.maxTracesPerFunction) {
      functionTraces.shift();
    }

    // Remove from active traces
    this.activeTraces.delete(traceId);

    // Log slow functions
    if (trace.duration! > 100) { // More than 100ms
      console.warn(`Slow function detected: ${functionName} took ${trace.duration!.toFixed(2)}ms`);
    }
  }

  // Async trace ender
  public async endTraceAsync(traceId: string, result?: any, error?: Error): Promise<void> {
    return new Promise((resolve) => {
      // Use requestAnimationFrame for non-blocking execution
      requestAnimationFrame(() => {
        this.endTrace(traceId, result, error);
        resolve();
      });
    });
  }

  // Get traces for a specific function
  public getTraces(functionName: string): TraceEntry[] {
    return this.traces.get(functionName) || [];
  }

  // Get all traces
  public getAllTraces(): Map<string, TraceEntry[]> {
    return new Map(this.traces);
  }

  // Get performance statistics
  public getPerformanceStats(functionName: string): {
    totalCalls: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    errorRate: number;
    slowCalls: number;
  } {
    const traces = this.getTraces(functionName);
    if (traces.length === 0) {
      return {
        totalCalls: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        errorRate: 0,
        slowCalls: 0
      };
    }

    const durations = traces.map(t => t.duration || 0);
    const errors = traces.filter(t => t.error).length;
    const slowCalls = traces.filter(t => (t.duration || 0) > 100).length;

    return {
      totalCalls: traces.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      errorRate: errors / traces.length,
      slowCalls
    };
  }

  // Get recent traces (last 10)
  public getRecentTraces(functionName: string): TraceEntry[] {
    const traces = this.getTraces(functionName);
    return traces.slice(-10);
  }

  // Clear traces
  public clearTraces(functionName?: string): void {
    if (functionName) {
      this.traces.delete(functionName);
    } else {
      this.traces.clear();
    }
  }

  // Sanitize arguments for logging
  private sanitizeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'function') {
        return '[Function]';
      }
      if (arg && typeof arg === 'object') {
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch {
          return '[Object]';
        }
      }
      return arg;
    });
  }

  // Sanitize result for logging
  private sanitizeResult(result: any): any {
    if (typeof result === 'function') {
      return '[Function]';
    }
    if (result && typeof result === 'object') {
      try {
        return JSON.parse(JSON.stringify(result));
      } catch {
        return '[Object]';
      }
    }
    return result;
  }

  // Get stack trace
  private getStackTrace(): string {
    try {
      throw new Error();
    } catch (error) {
      return (error as Error).stack || 'No stack trace available';
    }
  }

  // Export traces as JSON
  public exportTraces(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      traces: Object.fromEntries(this.traces),
      stats: {}
    };

    // Add performance stats for each function
    for (const [functionName] of this.traces) {
      (exportData.stats as any)[functionName] = this.getPerformanceStats(functionName);
    }

    return JSON.stringify(exportData, null, 2);
  }
}

// Decorator function for automatic tracing
export function trace(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const tracer = FunctionTracer.getInstance();

  descriptor.value = function(...args: any[]) {
    const traceId = tracer.startTrace(`${target.constructor.name}.${propertyKey}`, args);
    
    try {
      const result = originalMethod.apply(this, args);
      
      // Handle async functions
      if (result && typeof result.then === 'function') {
        return result
          .then((asyncResult: any) => {
            tracer.endTrace(traceId, asyncResult);
            return asyncResult;
          })
          .catch((error: Error) => {
            tracer.endTrace(traceId, undefined, error);
            throw error;
          });
      }
      
      tracer.endTrace(traceId, result);
      return result;
    } catch (error) {
      tracer.endTrace(traceId, undefined, error as Error);
      throw error;
    }
  };

  return descriptor;
}

// Manual tracing wrapper function
export function traceFunction<T extends (...args: any[]) => any>(
  fn: T,
  functionName: string
): T {
  const tracer = FunctionTracer.getInstance();
  
  return ((...args: any[]) => {
    const traceId = tracer.startTrace(functionName, args);
    
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result && typeof result.then === 'function') {
        return result
          .then((asyncResult: any) => {
            tracer.endTrace(traceId, asyncResult);
            return asyncResult;
          })
          .catch((error: Error) => {
            tracer.endTrace(traceId, undefined, error);
            throw error;
          });
      }
      
      tracer.endTrace(traceId, result);
      return result;
    } catch (error) {
      tracer.endTrace(traceId, undefined, error as Error);
      throw error;
    }
  }) as T;
}

// Export singleton instance
export const functionTracer = FunctionTracer.getInstance();

// Initialize with common functions enabled
functionTracer.enableFunction('toast');
functionTracer.enableFunction('useToast');
functionTracer.enableFunction('AuthProvider');
functionTracer.enableFunction('SafeToastManager.addToast');
functionTracer.enableFunction('SafeToastManager.removeToast');
functionTracer.enableFunction('SafeToastManager.subscribe');
functionTracer.enableFunction('ResourceManager.acquireResource');
functionTracer.enableFunction('ResourceManager.releaseResource');

export default functionTracer;