import fs from 'fs';
import path from 'path';

export interface RilogConfig {
  port: number;
  logsDir: string;
  format: 'json' | 'txt' | 'ndjson';
  maxFileSizeMB: number;
  timezone: string;
  cors: {
    origins: string[];
  };
}

const defaultConfig: RilogConfig = {
  port: 3030,
  logsDir: './logs',
  format: 'ndjson',
  maxFileSizeMB: 10,
  timezone: 'UTC',
  cors: {
    origins: ['http://localhost:3000'],
  },
};

function loadConfig(): RilogConfig {
  const configPath = path.resolve(process.cwd(), 'rilog-local-server.config.js');
  try {
    fs.accessSync(configPath);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const userConfig = require(configPath) as Partial<RilogConfig>;
    return {
      ...defaultConfig,
      ...userConfig,
      cors: { ...defaultConfig.cors, ...(userConfig.cors ?? {}) },
    };
  } catch {
    return defaultConfig;
  }
}

export const config = loadConfig();
