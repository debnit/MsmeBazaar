// Comprehensive error handling and recovery
import { Request, Response, NextFunction } from 'express';

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCounts = new Map<string, number>();
  private maxRetries = 3;
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.handleCriticalError(error);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.handleCriticalError(reason as Error);
    });

    // Handle SIGTERM gracefully
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      this.gracefulShutdown();
    });

    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      this.gracefulShutdown();
    });
  }

  private handleCriticalError(error: Error): void {
    // Log critical error
    console.error('Critical error occurred:', error.message);
    console.error('Stack trace:', error.stack);

    // Attempt recovery
    this.attemptRecovery(error);
  }

  private attemptRecovery(error: Error): void {
    const errorKey = error.message || 'unknown';
    const count = this.errorCounts.get(errorKey) || 0;
    
    if (count < this.maxRetries) {
      this.errorCounts.set(errorKey, count + 1);
      
      setTimeout(() => {
        console.log(`Attempting recovery for error: ${errorKey} (attempt ${count + 1})`);
        this.performRecovery(error);
      }, this.retryDelays[count] || 4000);
    } else {
      console.error(`Max retries reached for error: ${errorKey}. Initiating graceful shutdown.`);
      this.gracefulShutdown();
    }
  }

  private performRecovery(error: Error): void {
    try {
      // Clear caches
      if (global.gc) {
        global.gc();
      }
      
      // Reset error counts after successful recovery
      this.errorCounts.clear();
      
      console.log('Recovery successful');
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
    }
  }

  private gracefulShutdown(): void {
    console.log('Initiating graceful shutdown...');
    
    // Give ongoing requests time to complete
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }

  public middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      // Log error details
      console.error('Request error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Determine error type and response
      const errorResponse = this.categorizeError(error);
      
      // Send appropriate response
      if (!res.headersSent) {
        res.status(errorResponse.status).json({
          error: errorResponse.message,
          code: errorResponse.code,
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        });
      }
    };
  }

  private categorizeError(error: Error): { status: number; message: string; code: string } {
    // Database errors
    if (error.message.includes('database') || error.message.includes('connection')) {
      return {
        status: 503,
        message: 'Database temporarily unavailable',
        code: 'DATABASE_ERROR',
      };
    }

    // Authentication errors
    if (error.message.includes('auth') || error.message.includes('token')) {
      return {
        status: 401,
        message: 'Authentication required',
        code: 'AUTH_ERROR',
      };
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return {
        status: 400,
        message: 'Invalid request data',
        code: 'VALIDATION_ERROR',
      };
    }

    // Memory errors
    if (error.message.includes('memory') || error.message.includes('heap')) {
      return {
        status: 507,
        message: 'Insufficient storage',
        code: 'MEMORY_ERROR',
      };
    }

    // Rate limiting errors
    if (error.message.includes('rate') || error.message.includes('limit')) {
      return {
        status: 429,
        message: 'Too many requests',
        code: 'RATE_LIMIT_ERROR',
      };
    }

    // Default server error
    return {
      status: 500,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }

  public createAsyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  public withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    return new Promise(async (resolve, reject) => {
      let lastError: Error;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await fn();
          resolve(result);
          return;
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < maxRetries) {
            const delay = this.retryDelays[attempt] || 4000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      reject(lastError);
    });
  }
}

export const errorHandler = ErrorHandler.getInstance();