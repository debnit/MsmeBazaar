import { spawn } from 'child_process';

// Process priority management
export class ProcessPriorityManager {
  private originalPriority: number;

  constructor() {
    this.originalPriority = process.getgid?.() || 0;
    this.optimizeProcessPriority();
  }

  // Optimize process priority
  private optimizeProcessPriority() {
    try {
      // Increase process priority (lower nice value = higher priority)
      process.setpriority(process.pid, -5);
      console.log('📈 Process priority increased (nice: -5)');
    } catch (error) {
      console.log('⚠️ Could not increase process priority (requires elevated privileges)');
    }

    // Set CPU affinity if available
    this.setCPUAffinity();

    // Optimize I/O priority
    this.optimizeIOPriority();
  }

  // Set CPU affinity to specific cores
  private setCPUAffinity() {
    try {
      // Use taskset on Linux to set CPU affinity
      const cpuCores = require('os').cpus().length;
      if (cpuCores > 1) {
        const coreMask = '0x' + (Math.pow(2, cpuCores) - 1).toString(16);

        spawn('taskset', ['-p', coreMask, process.pid.toString()], {
          stdio: 'ignore',
        }).on('exit', (code) => {
          if (code === 0) {
            console.log(`🎯 CPU affinity set to all ${cpuCores} cores`);
          }
        });
      }
    } catch (error) {
      // taskset not available on this system
    }
  }

  // Optimize I/O priority
  private optimizeIOPriority() {
    try {
      // Set I/O priority to high (ionice class 1, level 4)
      spawn('ionice', ['-c', '1', '-n', '4', '-p', process.pid.toString()], {
        stdio: 'ignore',
      }).on('exit', (code) => {
        if (code === 0) {
          console.log('💿 I/O priority optimized');
        }
      });
    } catch (error) {
      // ionice not available on this system
    }
  }

  // Monitor process resource usage
  monitorResourceUsage() {
    const usage = process.resourceUsage();
    const memUsage = process.memoryUsage();

    return {
      cpu: {
        user: usage.userCPUTime / 1000, // Convert to milliseconds
        system: usage.systemCPUTime / 1000,
        total: (usage.userCPUTime + usage.systemCPUTime) / 1000,
      },
      memory: {
        rss: (memUsage.rss / 1024 / 1024).toFixed(2) + 'MB',
        heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
        heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + 'MB',
        external: (memUsage.external / 1024 / 1024).toFixed(2) + 'MB',
      },
      io: {
        readOps: usage.fsRead,
        writeOps: usage.fsWrite,
        readBytes: usage.fsReadBytes,
        writeBytes: usage.fsWriteBytes,
      },
      network: {
        bytesReceived: usage.involuntaryContextSwitches,
        bytesSent: usage.voluntaryContextSwitches,
      },
      priority: this.getCurrentPriority(),
    };
  }

  // Get current process priority
  private getCurrentPriority(): number {
    try {
      return process.getpriority(process.pid);
    } catch (error) {
      return 0;
    }
  }

  // Optimize for specific workload
  optimizeForWorkload(workloadType: 'cpu-intensive' | 'io-intensive' | 'balanced') {
    try {
      switch (workloadType) {
      case 'cpu-intensive':
        process.setpriority(process.pid, -10); // Higher CPU priority
        console.log('🔥 Optimized for CPU-intensive workload');
        break;
      case 'io-intensive':
        process.setpriority(process.pid, -3); // Moderate priority
        console.log('💾 Optimized for I/O-intensive workload');
        break;
      case 'balanced':
        process.setpriority(process.pid, -5); // Balanced priority
        console.log('⚖️ Optimized for balanced workload');
        break;
      }
    } catch (error) {
      console.log('⚠️ Could not optimize for workload (requires elevated privileges)');
    }
  }

  // Setup process monitoring
  setupMonitoring() {
    // Monitor every 30 seconds
    setInterval(() => {
      const stats = this.monitorResourceUsage();

      // Log only if resource usage is high
      if (parseFloat(stats.memory.heapUsed) > 100 || stats.cpu.total > 1000) {
        console.log('📊 Resource usage:', {
          memory: stats.memory.heapUsed,
          cpu: `${stats.cpu.total}ms`,
          priority: stats.priority,
        });
      }
    }, 30000);
  }

  // Emergency resource cleanup
  emergencyCleanup() {
    console.log('🚨 Emergency resource cleanup initiated');

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    // Clear all timers
    const timers = process._getActiveHandles();
    timers.forEach(timer => {
      if (timer.unref) {
        timer.unref();
      }
    });

    // Reset process priority
    try {
      process.setpriority(process.pid, this.originalPriority);
    } catch (error) {
      // Ignore errors
    }

    console.log('✅ Emergency cleanup completed');
  }
}

export const processPriorityManager = new ProcessPriorityManager();
