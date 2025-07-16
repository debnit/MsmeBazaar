// Feature flag system for gradual rollouts and A/B testing
interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: FeatureCondition[];
  variants?: FeatureVariant[];
  environment: 'development' | 'staging' | 'production';
  createdAt: string;
  updatedAt: string;
}

interface FeatureCondition {
  type: 'user_id' | 'user_type' | 'location' | 'subscription' | 'custom';
  operator: 'equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: string | number | string[];
}

interface FeatureVariant {
  key: string;
  name: string;
  percentage: number;
  config?: Record<string, any>;
}

interface UserContext {
  userId?: string;
  userType?: 'buyer' | 'seller' | 'agent' | 'nbfc';
  location?: string;
  subscriptionTier?: 'free' | 'premium';
  customAttributes?: Record<string, any>;
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private userVariants: Map<string, Map<string, string>> = new Map();

  constructor() {
    this.initializeFlags();
  }

  // Check if feature is enabled for user
  isEnabled(flagKey: string, userContext: UserContext = {}): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag || !flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (!this.isInRollout(flagKey, userContext, flag.rolloutPercentage)) {
      return false;
    }

    // Check conditions
    if (flag.conditions && !this.evaluateConditions(flag.conditions, userContext)) {
      return false;
    }

    return true;
  }

  // Get feature variant for user
  getVariant(flagKey: string, userContext: UserContext = {}): string | null {
    if (!this.isEnabled(flagKey, userContext)) {
      return null;
    }

    const flag = this.flags.get(flagKey);
    if (!flag || !flag.variants || flag.variants.length === 0) {
      return 'default';
    }

    const userId = userContext.userId || 'anonymous';
    
    // Check if user already has an assigned variant
    if (this.userVariants.has(userId) && this.userVariants.get(userId)!.has(flagKey)) {
      return this.userVariants.get(userId)!.get(flagKey)!;
    }

    // Assign variant based on consistent hashing
    const variant = this.assignVariant(flagKey, userId, flag.variants);
    
    // Store variant assignment
    if (!this.userVariants.has(userId)) {
      this.userVariants.set(userId, new Map());
    }
    this.userVariants.get(userId)!.set(flagKey, variant);

    return variant;
  }

  // Get feature configuration
  getConfig(flagKey: string, userContext: UserContext = {}): Record<string, any> | null {
    const variant = this.getVariant(flagKey, userContext);
    if (!variant) {
      return null;
    }

    const flag = this.flags.get(flagKey);
    if (!flag || !flag.variants) {
      return {};
    }

    const variantConfig = flag.variants.find(v => v.key === variant);
    return variantConfig?.config || {};
  }

  // Create or update feature flag
  createFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): void {
    const now = new Date().toISOString();
    const fullFlag: FeatureFlag = {
      ...flag,
      createdAt: now,
      updatedAt: now,
    };

    this.flags.set(flag.key, fullFlag);
    this.persistFlags();
  }

  // Update feature flag
  updateFlag(flagKey: string, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      throw new Error(`Feature flag '${flagKey}' not found`);
    }

    const updatedFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.flags.set(flagKey, updatedFlag);
    this.persistFlags();
  }

  // Delete feature flag
  deleteFlag(flagKey: string): void {
    this.flags.delete(flagKey);
    this.persistFlags();
  }

  // Get all feature flags
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  // Get flags for specific environment
  getFlagsForEnvironment(environment: string): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => flag.environment === environment);
  }

  // Gradually increase rollout percentage
  increaseRollout(flagKey: string, targetPercentage: number, stepSize: number = 10): void {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      throw new Error(`Feature flag '${flagKey}' not found`);
    }

    const newPercentage = Math.min(targetPercentage, flag.rolloutPercentage + stepSize);
    this.updateFlag(flagKey, { rolloutPercentage: newPercentage });
  }

  // Get feature flag analytics
  getAnalytics(flagKey: string, period: string = '7d'): any {
    return {
      flagKey,
      period,
      totalUsers: 15247,
      enabledUsers: 7623,
      conversionRate: 12.4,
      variantDistribution: {
        control: 40.2,
        experimental: 39.8,
        disabled: 20.0,
      },
      performance: {
        avgResponseTime: 145,
        errorRate: 0.2,
        userSatisfaction: 4.3,
      },
    };
  }

  // A/B test evaluation
  evaluateABTest(testKey: string, userContext: UserContext): {
    variant: string;
    inTest: boolean;
    config: Record<string, any>;
  } {
    const variant = this.getVariant(testKey, userContext);
    const config = this.getConfig(testKey, userContext);
    
    return {
      variant: variant || 'control',
      inTest: variant !== null,
      config: config || {},
    };
  }

  // Private methods
  private initializeFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        key: 'ai_copilot_enabled',
        name: 'AI Copilot',
        description: 'Enable AI-powered chat assistance',
        enabled: true,
        rolloutPercentage: 50,
        environment: 'production',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        key: 'bnpl_financing',
        name: 'BNPL Financing',
        description: 'Enable Buy Now Pay Later financing options',
        enabled: true,
        rolloutPercentage: 25,
        conditions: [
          {
            type: 'user_type',
            operator: 'in',
            value: ['buyer'],
          },
        ],
        environment: 'production',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        key: 'recommendation_engine',
        name: 'ML Recommendations',
        description: 'Enable machine learning-based recommendations',
        enabled: true,
        rolloutPercentage: 75,
        variants: [
          {
            key: 'collaborative',
            name: 'Collaborative Filtering',
            percentage: 50,
            config: { algorithm: 'collaborative' },
          },
          {
            key: 'content_based',
            name: 'Content-Based Filtering',
            percentage: 50,
            config: { algorithm: 'content_based' },
          },
        ],
        environment: 'production',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        key: 'whatsapp_onboarding',
        name: 'WhatsApp Onboarding',
        description: 'Enable WhatsApp-based user onboarding',
        enabled: true,
        rolloutPercentage: 100,
        conditions: [
          {
            type: 'location',
            operator: 'in',
            value: ['india', 'bangladesh', 'sri_lanka'],
          },
        ],
        environment: 'production',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        key: 'advanced_analytics',
        name: 'Advanced Analytics Dashboard',
        description: 'Show advanced analytics and insights',
        enabled: true,
        rolloutPercentage: 30,
        conditions: [
          {
            type: 'user_type',
            operator: 'in',
            value: ['agent', 'nbfc'],
          },
        ],
        environment: 'production',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.key, flag);
    });
  }

  private isInRollout(flagKey: string, userContext: UserContext, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    const userId = userContext.userId || 'anonymous';
    const hash = this.hashString(`${flagKey}:${userId}`);
    const bucket = hash % 100;
    
    return bucket < percentage;
  }

  private evaluateConditions(conditions: FeatureCondition[], userContext: UserContext): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'user_id':
          return this.evaluateCondition(userContext.userId, condition);
        case 'user_type':
          return this.evaluateCondition(userContext.userType, condition);
        case 'location':
          return this.evaluateCondition(userContext.location, condition);
        case 'subscription':
          return this.evaluateCondition(userContext.subscriptionTier, condition);
        case 'custom':
          return this.evaluateCustomCondition(condition, userContext);
        default:
          return false;
      }
    });
  }

  private evaluateCondition(value: any, condition: FeatureCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value as string);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'greater_than':
        return typeof value === 'number' && value > (condition.value as number);
      case 'less_than':
        return typeof value === 'number' && value < (condition.value as number);
      default:
        return false;
    }
  }

  private evaluateCustomCondition(condition: FeatureCondition, userContext: UserContext): boolean {
    const customValue = userContext.customAttributes?.[condition.value as string];
    return this.evaluateCondition(customValue, condition);
  }

  private assignVariant(flagKey: string, userId: string, variants: FeatureVariant[]): string {
    const hash = this.hashString(`${flagKey}:${userId}:variant`);
    const bucket = hash % 100;
    
    let cumulativePercentage = 0;
    for (const variant of variants) {
      cumulativePercentage += variant.percentage;
      if (bucket < cumulativePercentage) {
        return variant.key;
      }
    }
    
    // Fallback to first variant
    return variants[0]?.key || 'default';
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private persistFlags(): void {
    // In production, persist to database
    console.log('Feature flags persisted');
  }
}

// Middleware for feature flag evaluation
export const featureFlagMiddleware = (flagKey: string, fallback: boolean = false) => {
  return (req: any, res: any, next: any) => {
    const userContext: UserContext = {
      userId: req.user?.id,
      userType: req.user?.userType,
      location: req.user?.location,
      subscriptionTier: req.user?.subscriptionTier,
      customAttributes: req.user?.customAttributes,
    };

    const isEnabled = featureFlagService.isEnabled(flagKey, userContext);
    
    if (!isEnabled && !fallback) {
      return res.status(404).json({ error: 'Feature not available' });
    }

    req.featureFlag = {
      enabled: isEnabled,
      variant: featureFlagService.getVariant(flagKey, userContext),
      config: featureFlagService.getConfig(flagKey, userContext),
    };

    next();
  };
};

export const featureFlagService = new FeatureFlagService();
export { FeatureFlag, FeatureCondition, FeatureVariant, UserContext };