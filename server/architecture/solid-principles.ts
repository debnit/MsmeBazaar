// SOLID Principles Implementation for MSMESquare
// Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion

// 1. Single Responsibility Principle - Each class has one reason to change
export interface IUserRepository {
  create(user: any): Promise<any>;
  findById(id: string): Promise<any>;
  findByEmail(email: string): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
}

export interface INotificationService {
  send(message: any): Promise<void>;
  sendBulk(messages: any[]): Promise<void>;
}

export interface IValuationEngine {
  calculate(msmeData: any): Promise<number>;
  getFactors(msmeData: any): Promise<any[]>;
}

// 2. Open/Closed Principle - Open for extension, closed for modification
export abstract class BaseRepository<T> {
  protected abstract tableName: string;
  
  async findAll(): Promise<T[]> {
    // Base implementation
    return [];
  }
  
  async findById(id: string): Promise<T | null> {
    // Base implementation
    return null;
  }
  
  // Template method pattern
  protected abstract validate(data: any): boolean;
  protected abstract transform(data: any): T;
}

export class UserRepository extends BaseRepository<any> implements IUserRepository {
  protected tableName = 'users';
  
  protected validate(data: any): boolean {
    return data.email && data.password;
  }
  
  protected transform(data: any): any {
    return {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  async create(user: any): Promise<any> {
    if (!this.validate(user)) {
      throw new Error('Invalid user data');
    }
    const transformedUser = this.transform(user);
    // Database operation
    return transformedUser;
  }
  
  async findByEmail(email: string): Promise<any> {
    // Implementation
    return null;
  }
  
  async update(id: string, data: any): Promise<any> {
    // Implementation
    return null;
  }
  
  async delete(id: string): Promise<void> {
    // Implementation
  }
}

// 3. Liskov Substitution Principle - Derived classes must be substitutable for base classes
export abstract class NotificationProvider {
  abstract send(message: any): Promise<void>;
  
  async validateMessage(message: any): Promise<boolean> {
    return message && message.recipient && message.content;
  }
}

export class EmailNotificationProvider extends NotificationProvider {
  async send(message: any): Promise<void> {
    if (!await this.validateMessage(message)) {
      throw new Error('Invalid email message');
    }
    // Email sending logic
    console.log(`Sending email to ${message.recipient}`);
  }
}

export class WhatsAppNotificationProvider extends NotificationProvider {
  async send(message: any): Promise<void> {
    if (!await this.validateMessage(message)) {
      throw new Error('Invalid WhatsApp message');
    }
    // WhatsApp sending logic
    console.log(`Sending WhatsApp to ${message.recipient}`);
  }
}

// 4. Interface Segregation Principle - Clients should not depend on interfaces they don't use
export interface IReadOnlyRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
}

export interface IWriteRepository<T> {
  create(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface ICacheRepository<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}

// 5. Dependency Inversion Principle - Depend on abstractions, not concretions
export class UserService {
  constructor(
    private userRepository: IUserRepository,
    private notificationService: INotificationService,
    private cacheService: ICacheRepository<any>
  ) {}
  
  async createUser(userData: any): Promise<any> {
    // Business logic
    const user = await this.userRepository.create(userData);
    
    // Cache the user
    await this.cacheService.set(`user:${user.id}`, user, 3600);
    
    // Send welcome notification
    await this.notificationService.send({
      recipient: user.email,
      content: 'Welcome to MSMESquare!',
      type: 'welcome'
    });
    
    return user;
  }
  
  async getUserById(id: string): Promise<any> {
    // Try cache first
    const cachedUser = await this.cacheService.get(`user:${id}`);
    if (cachedUser) {
      return cachedUser;
    }
    
    // Fallback to database
    const user = await this.userRepository.findById(id);
    if (user) {
      await this.cacheService.set(`user:${id}`, user, 3600);
    }
    
    return user;
  }
}

// Factory Pattern for creating services
export class ServiceFactory {
  private static instance: ServiceFactory;
  private services = new Map<string, any>();
  
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }
  
  createUserService(): UserService {
    if (!this.services.has('userService')) {
      const userRepository = new UserRepository();
      const notificationService = new CompositeNotificationService();
      const cacheService = new RedisCacheService();
      
      this.services.set('userService', new UserService(
        userRepository,
        notificationService,
        cacheService
      ));
    }
    
    return this.services.get('userService');
  }
}

// Composite pattern for notification service
export class CompositeNotificationService implements INotificationService {
  private providers: NotificationProvider[] = [];
  
  addProvider(provider: NotificationProvider): void {
    this.providers.push(provider);
  }
  
  async send(message: any): Promise<void> {
    const promises = this.providers.map(provider => provider.send(message));
    await Promise.allSettled(promises);
  }
  
  async sendBulk(messages: any[]): Promise<void> {
    const promises = messages.map(message => this.send(message));
    await Promise.allSettled(promises);
  }
}

// Cache service implementation
export class RedisCacheService implements ICacheRepository<any> {
  private cache = new Map<string, { value: any; expires: number }>();
  
  async get(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    });
  }
  
  async invalidate(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

export const serviceFactory = ServiceFactory.getInstance();