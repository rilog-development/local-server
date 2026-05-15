import fs from 'fs/promises';
import { IFileWriter } from './IFileWriter';
import { LogEntry } from '../types/events';

export class JsonWriter implements IFileWriter {
  extension = 'json';

  async write(filePath: string, entry: LogEntry): Promise<void> {
    const entryJson = JSON.stringify(entry, null, 2);

    let exists = false;
    try {
      await fs.access(filePath);
      exists = true;
    } catch { /* file does not exist */ }

    if (!exists) {
      await fs.writeFile(filePath, `[\n${entryJson}\n]`, 'utf-8');
      return;
    }

    const stat = await fs.stat(filePath);
    const size = stat.size;

    // Find the closing ']', overwrite it with ,<entry>]
    const fh = await fs.open(filePath, 'r+');
    try {
      const buf = Buffer.alloc(1);
      let closePos = size - 1;
      // Scan backward past whitespace/newlines to find ']'
      while (closePos >= 0) {
        await fh.read(buf, 0, 1, closePos);
        if (buf[0] !== 0x0a && buf[0] !== 0x0d && buf[0] !== 0x20) break;
        closePos--;
      }
      const suffix = Buffer.from(`,\n${entryJson}\n]`, 'utf-8');
      await fh.write(suffix, 0, suffix.length, closePos);
      await fh.truncate(closePos + suffix.length);
    } finally {
      await fh.close();
    }
  }
}
