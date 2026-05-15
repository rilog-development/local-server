import { LogEntry } from '../types/events';

export interface IFileWriter {
  extension: string;
  write(filePath: string, entry: LogEntry): Promise<void>;
}
