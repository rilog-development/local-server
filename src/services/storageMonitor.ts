import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { emailService } from './emailService';

interface FileEntry {
  filePath: string;
  mtimeMs: number;
  sizeBytes: number;
}

class StorageMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  start(): void {
    const intervalMs = config.storage.checkIntervalHours * 60 * 60 * 1000;
    // Run once at startup, then on the configured interval
    this.check();
    this.intervalId = setInterval(() => this.check(), intervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async check(): Promise<void> {
    const logsDir = path.resolve(config.logsDir);
    const files = await this.collectFiles(logsDir);
    const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);
    const maxBytes = config.storage.maxTotalSizeMB * 1024 * 1024;

    if (totalBytes < maxBytes) return;

    const totalMB = (totalBytes / 1024 / 1024).toFixed(1);
    const thresholdMB = config.storage.maxTotalSizeMB;

    console.warn(
      `[rilog-storage] WARNING: total log size ${totalMB} MB exceeds threshold ${thresholdMB} MB`
    );

    const strategy = config.storage.onExceeded;

    if (strategy === 'email' || strategy === 'cleanup+email') {
      await emailService.sendStorageAlert(parseFloat(totalMB), thresholdMB);
    }

    if (strategy === 'cleanup' || strategy === 'cleanup+email') {
      await this.cleanup(files, maxBytes);
    }
  }

  private async cleanup(files: FileEntry[], maxBytes: number): Promise<void> {
    // Target 80% of the threshold to avoid triggering cleanup every cycle
    const targetBytes = maxBytes * 0.8;
    let totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

    // Sort oldest first (by modification time)
    const sorted = [...files].sort((a, b) => a.mtimeMs - b.mtimeMs);

    for (const file of sorted) {
      if (totalBytes <= targetBytes) break;
      try {
        await fs.unlink(file.filePath);
        totalBytes -= file.sizeBytes;
        console.log(`[rilog-storage] Deleted old log file: ${file.filePath}`);
      } catch (err) {
        console.error(`[rilog-storage] Failed to delete ${file.filePath}:`, err);
      }
    }

    const remainingMB = (totalBytes / 1024 / 1024).toFixed(1);
    console.log(`[rilog-storage] Cleanup complete. Remaining: ${remainingMB} MB`);
  }

  private async collectFiles(dir: string): Promise<FileEntry[]> {
    const results: FileEntry[] = [];
    let entries: Awaited<ReturnType<typeof fs.readdir>>;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return results;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await this.collectFiles(fullPath);
        results.push(...nested);
      } else if (entry.isFile()) {
        try {
          const stat = await fs.stat(fullPath);
          results.push({ filePath: fullPath, mtimeMs: stat.mtimeMs, sizeBytes: stat.size });
        } catch {
          // skip files that disappeared between readdir and stat
        }
      }
    }

    return results;
  }
}

export const storageMonitor = new StorageMonitor();
