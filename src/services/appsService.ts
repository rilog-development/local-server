import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';

export interface AppsData {
  apps: string[];
  dates: Record<string, string[]>;
  sizes: Record<string, Record<string, number>>; // app -> date -> bytes
}

class AppsService {
  async getApps(): Promise<AppsData> {
    const logsDir = path.resolve(config.logsDir);
    const result: AppsData = { apps: [], dates: {}, sizes: {} };

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
      result.sizes[entry] = {};

      const files = await fs.readdir(entryPath);
      const dateMap = new Map<string, number>();

      for (const file of files) {
        const match = /^(\d{4}-\d{2}-\d{2})/.exec(file);
        if (match) {
          const date = match[1];
          try {
            const fileStat = await fs.stat(path.join(entryPath, file));
            dateMap.set(date, (dateMap.get(date) ?? 0) + fileStat.size);
          } catch {
            if (!dateMap.has(date)) dateMap.set(date, 0);
          }
        }
      }

      result.dates[entry] = [...dateMap.keys()].sort().reverse();
      for (const [date, bytes] of dateMap) {
        result.sizes[entry][date] = bytes;
      }
    }

    return result;
  }
}

export default new AppsService();
