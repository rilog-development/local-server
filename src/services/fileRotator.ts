import fs from 'fs/promises';
import path from 'path';
import { Mutex } from 'async-mutex';
import { config } from '../config';
import { IFileWriter } from '../writers/IFileWriter';
import { LogEntry } from '../types/events';

class FileRotator {
  // One mutex per appName to allow concurrent writes to different apps
  private mutexes = new Map<string, Mutex>();
  private maxBytes: number;

  constructor() {
    this.maxBytes = config.maxFileSizeMB * 1024 * 1024;
  }

  async write(appName: string, entry: LogEntry, writer: IFileWriter): Promise<string> {
    const mutex = this.getOrCreateMutex(appName);
    return mutex.runExclusive(async () => {
      const filePath = await this.resolveFilePath(appName, writer.extension);
      await writer.write(filePath, entry);
      return filePath;
    });
  }

  private getOrCreateMutex(key: string): Mutex {
    let mutex = this.mutexes.get(key);
    if (!mutex) {
      mutex = new Mutex();
      this.mutexes.set(key, mutex);
    }
    return mutex;
  }

  private async resolveFilePath(appName: string, extension: string): Promise<string> {
    const folderPath = path.resolve(config.logsDir, this.slugify(appName));
    await fs.mkdir(folderPath, { recursive: true });

    const dateStr = this.getTodayString();
    const baseName = `${dateStr}.log.${extension}`;
    let filePath = path.join(folderPath, baseName);
    let part = 1;

    while (true) {
      try {
        const stat = await fs.stat(filePath);
        if (stat.size < this.maxBytes) {
          return filePath;
        }
        part++;
        filePath = path.join(folderPath, `${dateStr}_part${part}.log.${extension}`);
      } catch {
        // File doesn't exist yet — use this path
        return filePath;
      }
    }
  }

  private getTodayString(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: config.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  private slugify(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }
}

export const fileRotator = new FileRotator();
