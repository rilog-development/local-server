import fs from 'fs/promises';
import { IFileWriter } from './IFileWriter';
import { LogEntry } from '../types/events';
import { ERilogEvent, IRilogRequestItem, IRilogClick, IRilogConsoleData, IRilogMessageData, TDeviceInfo } from '../types/rilog';
import { getEventTypeLabel } from '../utils/events';

export class TxtWriter implements IFileWriter {
  extension = 'txt';

  async write(filePath: string, entry: LogEntry): Promise<void> {
    await fs.appendFile(filePath, this.formatEntry(entry), 'utf-8');
  }

  private formatEntry(entry: LogEntry): string {
    const divider = '─'.repeat(41);
    const deviceLine = entry.deviceInfo ? this.formatDeviceInfo(entry.deviceInfo) : '';
    const paramsLine = entry.params ? `params: ${JSON.stringify(entry.params)}` : '';
    const eventsLines = entry.events
      .map((ev, i) => `  [${i}] ${this.formatEvent(ev)}`)
      .join('\n');

    return [
      divider,
      `[${entry.timestamp}] SESSION: ${entry.uToken}  APP: ${entry.appName}`,
      deviceLine,
      paramsLine,
      `EVENTS (${entry.events.length}):`,
      eventsLines,
      divider,
      '',
    ]
      .filter(line => line !== '')
      .join('\n') + '\n';
  }

  private formatDeviceInfo(d: TDeviceInfo): string {
    const cpu = d.hardwareConcurrency !== null ? String(d.hardwareConcurrency) : '?';
    const net = d.connectionType ?? '?';
    return `DEVICE: ${d.deviceType}  ${d.screenWidth}×${d.screenHeight} (viewport ${d.viewportWidth}×${d.viewportHeight})  dpr=${d.devicePixelRatio}  lang=${d.language}  cpu=${cpu}  net=${net}`;
  }

  private formatEvent(ev: { type: ERilogEvent; data: unknown }): string {
    const label = getEventTypeLabel(ev.type);
    switch (ev.type) {
      case ERilogEvent.REQUEST: {
        const d = ev.data as IRilogRequestItem;
        return `${label}  ${d.request?.method ?? ''} ${d.request?.url ?? ''}  ${d.response?.status ?? ''}  ${d.duration ?? ''}`.trimEnd();
      }
      case ERilogEvent.CLICK: {
        const d = ev.data as IRilogClick;
        return `${label}  ${d.nodeName}#${d.id} .${d.classNames} "${d.inner}"`;
      }
      case ERilogEvent.CONSOLE_ERROR:
      case ERilogEvent.CONSOLE_WARN: {
        const d = ev.data as IRilogConsoleData;
        return `${label}  ${d.message}`;
      }
      case ERilogEvent.DEBUG_MESSAGE: {
        const d = ev.data as IRilogMessageData;
        return `${label}  [${d.label}] ${d.data}`;
      }
      default:
        return `${label}  ${JSON.stringify(ev.data)}`;
    }
  }
}
