import fs from 'fs/promises';
import { IFileWriter } from './IFileWriter';
import { LogEntry } from '../types/events';

export class NdjsonWriter implements IFileWriter {
  extension = 'ndjson';

  async write(filePath: string, entry: LogEntry): Promise<void> {
    await fs.appendFile(filePath, JSON.stringify(entry) + '\n', 'utf-8');
  }
}
