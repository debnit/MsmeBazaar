import { cpus } from 'os';
import cluster from 'cluster';
import { Worker } from 'worker_threads';

// CPU optimization utilities
export class CPUOptimizer {
  private readonly numCPUs = cpus().length;
  private workers: Worker[] = [];
  private workerIndex = 0;

  constructor() {
    this.optimizeForCPUCount();
  }

  // Optimize based on CPU count
  private optimizeForCPUCount() {
    console.log(`🖥️ Detected ${this.numCPUs} CPU cores`);
    
    // Set UV_THREADPOOL_SIZE to match CPU count
    process.env.UV_THREADPOOL_SIZE = String(this.numCPUs);
    
    // Configure V8 options for better performance
    process.env.NODE_OPTIONS = [
      '--max-old-space-size=4096',
      '--max-new-space-size=2048',
      `--max-semi-space-size=1024`,
      '--optimize-for-size',
      '--gc-interval=100'
    ].join(' ');
  }

  // Create worker pool for CPU-intensive tasks
  createWorkerPool(workerScript: string, poolSize?: number) {
    const size = poolSize || Math.max(2, this.numCPUs - 1);
    
    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);
    }
    
    console.log(`👥 Created worker pool with ${size} workers`);
  }

  // Distribute work across workers
  async distributeWork<T>(data: any): Promise<T> {
    if (this.workers.length === 0) {
      throw new Error('No workers available');
    }
    
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    
    return new Promise((resolve, reject) => {
      worker.postMessage(data);
      worker.once('message', resolve);
      worker.once('error', reject);
    });
  }

  // Cluster mode setup
  setupCluster() {
    if (cluster.isPrimary) {
      console.log(`🎯 Master process ${process.pid} is running`);
      
      // Fork workers
      const numWorkers = Math.min(this.numCPUs, 4); // Limit to 4 for development
      for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
      }
      
      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork(); // Restart worker
      });
      
      return false; // Don't continue with server startup in master
    }
    
    console.log(`👷 Worker process ${process.pid} started`);
    return true; // Continue with server startup in worker
  }

  // CPU usage monitoring
  monitorCPUUsage() {
    const startUsage = process.cpuUsage();
    const startTime = Date.now();
    
    return {
      end: () => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return {
          user: endUsage.user / 1000, // Convert to milliseconds
          system: endUsage.system / 1000,
          total: (endUsage.user + endUsage.system) / 1000,
          duration,
          percentage: ((endUsage.user + endUsage.system) / 1000 / duration) * 100
        };
      }
    };
  }

  // Optimize V8 garbage collection
  optimizeGC() {
    // Enable incremental GC
    if (global.gc) {
      // Schedule regular GC
      setInterval(() => {
        const memBefore = process.memoryUsage().heapUsed;
        global.gc();
        const memAfter = process.memoryUsage().heapUsed;
        const freed = memBefore - memAfter;
        
        if (freed > 10 * 1024 * 1024) { // Only log if freed > 10MB
          console.log(`🗑️ GC freed ${(freed / 1024 / 1024).toFixed(2)}MB`);
        }
      }, 30000); // Every 30 seconds
    }
  }

  // Get CPU statistics
  getCPUStats() {
    const cpuInfo = cpus();
    const loadAvg = process.loadavg();
    
    return {
      cores: this.numCPUs,
      model: cpuInfo[0].model,
      speed: cpuInfo[0].speed,
      loadAverage: {
        '1min': loadAvg[0].toFixed(2),
        '5min': loadAvg[1].toFixed(2),
        '15min': loadAvg[2].toFixed(2)
      },
      workers: this.workers.length
    };
  }

  // Cleanup workers
  cleanup() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
  }
}

export const cpuOptimizer = new CPUOptimizer();