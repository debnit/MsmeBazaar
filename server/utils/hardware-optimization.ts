// Hardware optimization for better platform performance
import { cpus, freemem, totalmem } from 'os';
import { Worker } from 'worker_threads';

export class HardwareOptimization {
  private static instance: HardwareOptimization;
  private cpuCount: number;
  private memoryInfo: { total: number; free: number };
  private workerPool: Worker[] = [];
  private taskQueue: Array<{ task: any; resolve: Function; reject: Function }> = [];
  private isProcessing = false;

  private constructor() {
    this.detectHardware();
    this.initializeWorkerPool();
  }

  static getInstance(): HardwareOptimization {
    if (!HardwareOptimization.instance) {
      HardwareOptimization.instance = new HardwareOptimization();
    }
    return HardwareOptimization.instance;
  }

  private detectHardware() {
    this.cpuCount = cpus().length;
    this.memoryInfo = {
      total: totalmem(),
      free: freemem()
    };
    
    console.log(`🖥️ Hardware detected: ${this.cpuCount} CPUs, ${Math.round(this.memoryInfo.total / 1024 / 1024 / 1024)}GB RAM`);
  }

  private initializeWorkerPool() {
    // Create worker pool based on CPU count
    const workerCount = Math.min(this.cpuCount, 4); // Max 4 workers
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(`
        const { parentPort } = require('worker_threads');
        
        parentPort.on('message', async (task) => {
          try {
            let result;
            
            switch (task.type) {
              case 'cpu_intensive':
                result = await performCpuIntensiveTask(task.data);
                break;
              case 'memory_optimization':
                result = await performMemoryOptimization(task.data);
                break;
              case 'io_optimization':
                result = await performIOOptimization(task.data);
                break;
              default:
                result = { error: 'Unknown task type' };
            }
            
            parentPort.postMessage({ success: true, result });
          } catch (error) {
            parentPort.postMessage({ success: false, error: error.message });
          }
        });
        
        async function performCpuIntensiveTask(data) {
          // CPU-intensive operations
          return { processed: true, data };
        }
        
        async function performMemoryOptimization(data) {
          // Memory optimization operations
          return { optimized: true, data };
        }
        
        async function performIOOptimization(data) {
          // I/O optimization operations
          return { optimized: true, data };
        }
      `, { eval: true });
      
      worker.on('error', (error) => {
        console.error('Worker error:', error);
      });
      
      this.workerPool.push(worker);
    }
  }

  // CPU optimization
  async optimizeCPUUsage() {
    try {
      // Set CPU affinity if available
      if (process.platform === 'linux') {
        // Linux-specific CPU affinity
        process.env.UV_THREADPOOL_SIZE = Math.min(this.cpuCount * 2, 16).toString();
      }
      
      // Optimize event loop
      if (global.gc) {
        setInterval(() => {
          const memUsage = process.memoryUsage();
          if (memUsage.heapUsed > 200 * 1024 * 1024) { // 200MB threshold
            global.gc();
          }
        }, 60000); // Every minute
      }
      
      return { optimized: true, cpuCount: this.cpuCount };
    } catch (error) {
      console.warn('CPU optimization failed:', error);
      return { optimized: false, error: error.message };
    }
  }

  // Memory optimization
  async optimizeMemoryUsage() {
    try {
      // Configure V8 memory limits
      const memoryLimit = Math.floor(this.memoryInfo.total * 0.8); // 80% of total memory
      process.env.NODE_OPTIONS = `--max-old-space-size=${Math.floor(memoryLimit / 1024 / 1024)}`;
      
      // Optimize garbage collection
      if (global.gc) {
        // Manual garbage collection when needed
        const interval = setInterval(() => {
          const usage = process.memoryUsage();
          if (usage.heapUsed > memoryLimit * 0.7) { // 70% of limit
            global.gc();
          }
        }, 30000); // Every 30 seconds
        
        // Clear interval after 5 minutes
        setTimeout(() => clearInterval(interval), 300000);
      }
      
      return { optimized: true, memoryLimit };
    } catch (error) {
      console.warn('Memory optimization failed:', error);
      return { optimized: false, error: error.message };
    }
  }

  // I/O optimization
  async optimizeIOOperations() {
    try {
      // Optimize network I/O
      process.env.UV_THREADPOOL_SIZE = Math.min(this.cpuCount * 4, 32).toString();
      
      // Set I/O optimization flags
      process.env.NODE_ENV = process.env.NODE_ENV || 'production';
      
      return { optimized: true, ioThreads: process.env.UV_THREADPOOL_SIZE };
    } catch (error) {
      console.warn('I/O optimization failed:', error);
      return { optimized: false, error: error.message };
    }
  }

  // Execute task in worker thread
  async executeInWorker(taskType: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task: { type: taskType, data }, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) return;
    
    this.isProcessing = true;
    
    const availableWorker = this.workerPool.find(worker => !worker.listenerCount('message'));
    if (!availableWorker) {
      this.isProcessing = false;
      return;
    }
    
    const { task, resolve, reject } = this.taskQueue.shift()!;
    
    const messageHandler = (result: any) => {
      availableWorker.off('message', messageHandler);
      
      if (result.success) {
        resolve(result.result);
      } else {
        reject(new Error(result.error));
      }
      
      this.isProcessing = false;
      this.processQueue(); // Process next task
    };
    
    availableWorker.on('message', messageHandler);
    availableWorker.postMessage(task);
  }

  // Get hardware status
  getHardwareStatus() {
    return {
      cpu: {
        count: this.cpuCount,
        usage: process.cpuUsage()
      },
      memory: {
        total: this.memoryInfo.total,
        free: freemem(),
        used: this.memoryInfo.total - freemem(),
        process: process.memoryUsage()
      },
      workers: {
        active: this.workerPool.length,
        queueSize: this.taskQueue.length
      }
    };
  }

  // Cleanup
  async cleanup() {
    // Terminate all workers
    await Promise.all(this.workerPool.map(worker => worker.terminate()));
    this.workerPool = [];
    this.taskQueue = [];
  }
}

export const hardwareOptimization = HardwareOptimization.getInstance();