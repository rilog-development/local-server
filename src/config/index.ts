import fs from 'fs';
import path from 'path';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
}

export interface StorageConfig {
  maxTotalSizeMB: number;
  checkIntervalHours: number;
  onExceeded: 'warn' | 'cleanup' | 'email' | 'cleanup+email';
}

export interface RilogConfig {
  port: number;
  logsDir: string;
  format: 'json' | 'txt' | 'ndjson';
  maxFileSizeMB: number;
  maxRequestSizeMB: number;
  timezone: string;
  cors: {
    origins: string[];
  };
  auth: {
    enabled: boolean;
    password: string;
  };
  storage: StorageConfig;
  smtp: SmtpConfig;
}

const defaultConfig: RilogConfig = {
  port: 3030,
  logsDir: './logs',
  format: 'ndjson',
  maxFileSizeMB: 10,
  maxRequestSizeMB: 50,
  timezone: 'UTC',
  cors: {
    origins: ['http://localhost:3000', 'http://localhost:5173'],
  },
  auth: {
    enabled: false,
    password: '',
  },
  storage: {
    maxTotalSizeMB: 1024,
    checkIntervalHours: 1,
    onExceeded: 'warn',
  },
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: '',
    to: '',
  },
};

function parseEnvOrigins(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function applyEnvOverrides(cfg: RilogConfig): RilogConfig {
  const env = process.env;
  return {
    port: env.RILOG_PORT ? parseInt(env.RILOG_PORT, 10) : cfg.port,
    logsDir: env.RILOG_LOGS_DIR ?? cfg.logsDir,
    format: (env.RILOG_FORMAT as RilogConfig['format']) ?? cfg.format,
    maxFileSizeMB: env.RILOG_MAX_FILE_SIZE_MB ? parseFloat(env.RILOG_MAX_FILE_SIZE_MB) : cfg.maxFileSizeMB,
    maxRequestSizeMB: env.RILOG_MAX_REQUEST_SIZE_MB ? parseFloat(env.RILOG_MAX_REQUEST_SIZE_MB) : cfg.maxRequestSizeMB,
    timezone: env.RILOG_TIMEZONE ?? cfg.timezone,
    cors: {
      origins: env.RILOG_CORS_ORIGINS ? parseEnvOrigins(env.RILOG_CORS_ORIGINS) : cfg.cors.origins,
    },
    auth: {
      enabled: env.RILOG_AUTH_ENABLED !== undefined ? env.RILOG_AUTH_ENABLED === 'true' : cfg.auth.enabled,
      password: env.RILOG_AUTH_PASSWORD ?? cfg.auth.password,
    },
    storage: {
      maxTotalSizeMB: env.RILOG_MAX_TOTAL_SIZE_MB
        ? parseFloat(env.RILOG_MAX_TOTAL_SIZE_MB)
        : cfg.storage.maxTotalSizeMB,
      checkIntervalHours: env.RILOG_STORAGE_CHECK_INTERVAL_HOURS
        ? parseFloat(env.RILOG_STORAGE_CHECK_INTERVAL_HOURS)
        : cfg.storage.checkIntervalHours,
      onExceeded: (env.RILOG_ON_EXCEEDED as StorageConfig['onExceeded']) ?? cfg.storage.onExceeded,
    },
    smtp: {
      host: env.RILOG_SMTP_HOST ?? cfg.smtp.host,
      port: env.RILOG_SMTP_PORT ? parseInt(env.RILOG_SMTP_PORT, 10) : cfg.smtp.port,
      secure: env.RILOG_SMTP_SECURE !== undefined ? env.RILOG_SMTP_SECURE === 'true' : cfg.smtp.secure,
      user: env.RILOG_SMTP_USER ?? cfg.smtp.user,
      pass: env.RILOG_SMTP_PASS ?? cfg.smtp.pass,
      from: env.RILOG_SMTP_FROM ?? cfg.smtp.from,
      to: env.RILOG_SMTP_TO ?? cfg.smtp.to,
    },
  };
}

function loadConfig(): RilogConfig {
  const configPath = path.resolve(process.cwd(), 'rilog-local-server.config.js');
  let fileConfig: Partial<RilogConfig> = {};
  try {
    fs.accessSync(configPath);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    fileConfig = require(configPath) as Partial<RilogConfig>;
  } catch {
    // config file is optional — fall back to defaults
  }

  const merged: RilogConfig = {
    ...defaultConfig,
    ...fileConfig,
    cors: { ...defaultConfig.cors, ...(fileConfig.cors ?? {}) },
    auth: { ...defaultConfig.auth, ...(fileConfig.auth ?? {}) },
    storage: { ...defaultConfig.storage, ...(fileConfig.storage ?? {}) },
    smtp: { ...defaultConfig.smtp, ...(fileConfig.smtp ?? {}) },
  };

  // env vars always win
  return applyEnvOverrides(merged);
}

export const config = loadConfig();
