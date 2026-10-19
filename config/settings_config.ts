class Settings {
  // App Config
  readonly appName: string;
  readonly appDescription: string;
  readonly appPhase: "development" | "production" | "test";

  // Databases
  readonly postgresUrl: string;
  readonly redisUrl: string;
  readonly dbPoolMax: number;

  // Session / Auth
  readonly sessionSecret: string;
  readonly sessionCookieName: string;
  readonly bcryptSaltRounds: number;

  // Cloudinary
  readonly cloudinaryCloudName: string;
  readonly cloudinaryApiKey: string;
  readonly cloudinaryApiSecret: string;

  // LLM / AI
  readonly groqApiKey: string;
  readonly apiBase: string;
  readonly llmModel: string;
  readonly fallbackLlmModel: string;

  // Rate Limiting
  readonly rateLimitWindowMs: number;
  readonly rateLimitMaxRequests: number;

  constructor() {
    // App
    this.appName = this.getRequired("APP_NAME");
    this.appDescription = this.getRequired("APP_DESCRIPTION");
    this.appPhase = this.getEnum(
      "APP_PHASE",
      ["development", "production", "test"],
      "development",
    );

    // Databases
    this.postgresUrl = this.getRequired("POSTGRES_URL");
    this.redisUrl = this.getRequired("REDIS_URL");
    this.dbPoolMax = this.getNumber("DB_POOL_MAX", 10);

    // Session
    this.sessionSecret = this.getRequired("SESSION_SECRET");
    if (this.sessionSecret.length < 32) {
      throw new Error(
        "SESSION_SECRET must be at least 32 characters for security.",
      );
    }
    this.sessionCookieName = this.getString(
      "SESSION_COOKIE_NAME",
      "riwainvite_session",
    );
    this.bcryptSaltRounds = this.getNumber("BCRYPT_SALT_ROUNDS", 12);

    // Cloudinary
    this.cloudinaryCloudName = this.getRequired("CLOUDINARY_CLOUD_NAME");
    this.cloudinaryApiKey = this.getRequired("CLOUDINARY_API_KEY");
    this.cloudinaryApiSecret = this.getRequired("CLOUDINARY_API_SECRET");

    // LLM
    this.groqApiKey = this.getRequired("GROQ_API_KEY");
    this.apiBase = this.getString("API_BASE", "http://localhost:8000/api/v1");
    this.llmModel = this.getString("LLM_MODEL", "openai/gpt-oss-20b");
    this.fallbackLlmModel = this.getString(
      "FALLBACK_LLM_MODEL",
      "openai/gpt-oss-120b",
    );

    // Rate Limiting
    this.rateLimitWindowMs = this.getNumber("RATE_LIMIT_WINDOW_MS", 900000);
    this.rateLimitMaxRequests = this.getNumber("RATE_LIMIT_MAX_REQUESTS", 100);
  }

  // Convenience Helpers
  get isProduction(): boolean {
    return this.appPhase === "production";
  }

  get isDevelopment(): boolean {
    return this.appPhase === "development";
  }

  // Private Parsers
  private getRequired(key: string): string {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value.trim();
  }

  private getString(key: string, fallback: string): string {
    const value = process.env[key];
    return value && value.trim() !== "" ? value.trim() : fallback;
  }

  private getNumber(key: string, fallback: number): number {
    const value = process.env[key];
    if (!value || value.trim() === "") return fallback;

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(
        `Environment variable ${key} must be a number, received: "${value}"`,
      );
    }
    return parsed;
  }

  private getEnum<T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
  ): T {
    const value = process.env[key];
    if (!value) return fallback;

    if (!allowed.includes(value as T)) {
      throw new Error(
        `Environment variable ${key} must be one of [${allowed.join(", ")}], received: "${value}"`,
      );
    }
    return value as T;
  }
}

// Singleton Cache
let cachedSettings: Settings | null = null;

/**
 * Returns a singleton instance of the Settings class.
 * The env vars are read and validated only on the first call.
 */
export function settings(): Settings {
  if (!cachedSettings) {
    cachedSettings = new Settings();
  }
  return cachedSettings;
}

export default settings;
