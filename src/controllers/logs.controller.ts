import { Request, Response } from 'express';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { config } from '../config';
import { LogEntry } from '../types/events';

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

async function readNdjsonFile(filePath: string): Promise<LogEntry[]> {
  const entries: LogEntry[] = [];
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) entries.push(JSON.parse(line) as LogEntry);
  }
  return entries;
}

async function readJsonFile(filePath: string): Promise<LogEntry[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as LogEntry[];
}

async function getPartFiles(folderPath: string, date: string): Promise<string[]> {
  let files: string[];
  try {
    files = await fs.readdir(folderPath);
  } catch {
    return [];
  }
  const ext = config.format;
  const pattern = new RegExp(`^${date}(_part\\d+)?\\.log\\.${ext}$`);
  return files.filter(f => pattern.test(f)).sort();
}

class LogsController {
  async getLogs(req: Request, res: Response): Promise<void> {
    const { appName, date } = req.params as { appName: string; date: string };

    if (!isValidDate(date)) {
      res.status(400).json({ result: 'ERROR', message: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }

    if (config.format === 'txt') {
      res.status(400).json({ result: 'ERROR', message: 'TXT format is not parseable by the API. Switch to ndjson or json.' });
      return;
    }

    const folderPath = path.resolve(config.logsDir, slugify(appName));
    const parts = await getPartFiles(folderPath, date);

    if (parts.length === 0) {
      res.json({ entries: [], meta: { app: appName, date, parts: 0, totalBatches: 0, totalEvents: 0 } });
      return;
    }

    const entries: LogEntry[] = [];
    try {
      for (const partFile of parts) {
        const filePath = path.join(folderPath, partFile);
        const batch = config.format === 'ndjson'
          ? await readNdjsonFile(filePath)
          : await readJsonFile(filePath);
        entries.push(...batch);
      }
    } catch (err) {
      console.error('[rilog-local] read error:', err);
      res.status(500).json({ result: 'ERROR', message: 'Failed to read log files' });
      return;
    }

    let sizeBytes = 0;
    for (const partFile of parts) {
      try {
        const s = await fs.stat(path.join(folderPath, partFile));
        sizeBytes += s.size;
      } catch { /* ignore */ }
    }

    const totalEvents = entries.reduce((sum, e) => sum + e.events.length, 0);
    res.json({
      entries,
      meta: { app: appName, date, parts: parts.length, totalBatches: entries.length, totalEvents, sizeBytes },
    });
  }

  async deleteLogs(req: Request, res: Response): Promise<void> {
    const { appName, date } = req.params as { appName: string; date: string };

    if (!isValidDate(date)) {
      res.status(400).json({ result: 'ERROR', message: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }

    const folderPath = path.resolve(config.logsDir, slugify(appName));
    const parts = await getPartFiles(folderPath, date);

    if (parts.length === 0) {
      res.json({ result: 'SUCCESS', deleted: 0 });
      return;
    }

    try {
      for (const partFile of parts) {
        await fs.unlink(path.join(folderPath, partFile));
      }
    } catch (err) {
      console.error('[rilog-local] delete error:', err);
      res.status(500).json({ result: 'ERROR', message: 'Failed to delete log files' });
      return;
    }

    res.json({ result: 'SUCCESS', deleted: parts.length });
  }

  async downloadLogs(req: Request, res: Response): Promise<void> {
    const { appName, date } = req.params as { appName: string; date: string };

    if (!isValidDate(date)) {
      res.status(400).json({ result: 'ERROR', message: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }

    const folderPath = path.resolve(config.logsDir, slugify(appName));
    const parts = await getPartFiles(folderPath, date);

    if (parts.length === 0) {
      res.status(404).json({ result: 'ERROR', message: 'No log files found for this date.' });
      return;
    }

    const ext = config.format;
    const filename = `${slugify(appName)}_${date}.log.${ext}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    try {
      for (const partFile of parts) {
        const content = await fs.readFile(path.join(folderPath, partFile));
        res.write(content);
        if (ext === 'ndjson') res.write('\n');
      }
      res.end();
    } catch (err) {
      console.error('[rilog-local] download error:', err);
      if (!res.headersSent) {
        res.status(500).json({ result: 'ERROR', message: 'Failed to read log files' });
      }
    }
  }
}

export default LogsController;
