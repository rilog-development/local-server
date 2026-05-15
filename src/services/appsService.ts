import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';

export interface AppsData {
  apps: string[];
  dates: Record<string, string[]>;
}

class AppsService {
  async getApps(): Promise<AppsData> {
    const logsDir = path.resolve(config.logsDir);
    const result: AppsData = { apps: [], dates: {} };

    let entries: string[];
    try {
      entries = await fs.readdir(logsDir);
    } catch {
      return result;
    }

    for (const entry of entries) {
      const entryPath = path.join(logsDir, entry);
      let stat;
      try {
        stat = await fs.stat(entryPath);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;

      result.apps.push(entry);

      const files = await fs.readdir(entryPath);
      const dates = new Set<string>();
      for (const file of files) {
        const match = /^(\d{4}-\d{2}-\d{2})/.exec(file);
        if (match) dates.add(match[1]);
      }
      result.dates[entry] = [...dates].sort().reverse();
    }

    return result;
  }
}

export default new AppsService();
