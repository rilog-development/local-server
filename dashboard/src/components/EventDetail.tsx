import { useState } from 'react';
import type { ReactNode } from 'react';
import Editor from '@monaco-editor/react';
import { useStore } from '../store/useStore';
import {
  ERilogEvent, FlatEvent,
  IRilogClick, IRilogConsoleData, IRilogInput, IRilogMessageData, IRilogRequestItem,
} from '../types/rilog';
import { Badge } from './Badge';
import { formatEventDate, getStatusColor } from '../utils/eventHelpers';
import { CodeExpandModal } from './CodeExpandModal';

export function EventDetail() {
  const { selectedEvent, setSelectedEvent, t } = useStore();

  if (!selectedEvent) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-20" onClick={() => setSelectedEvent(null)} />

      <aside className="fixed right-0 top-0 h-full w-[520px] max-w-full bg-white dark:bg-gray-800 shadow-2xl z-30 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-brand-dark flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Badge type={selectedEvent.event.type} />
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-white/30 leading-none mb-0.5">{t.sessionLabel}</span>
              <span className="text-sm text-white/70 font-mono truncate">{selectedEvent.uToken.slice(0, 16)}</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedEvent(null)}
            title={t.close}
            className="text-white/50 hover:text-white transition-colors flex-shrink-0 ml-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta row */}
        <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4 text-xs flex-shrink-0">
          <span className="font-mono text-gray-500 dark:text-gray-400">{formatEventDate(selectedEvent.batchTimestamp)}</span>
          <span className="text-gray-400 dark:text-gray-600">{t.eventIdLabel}:</span>
          <span className="font-mono text-gray-500 dark:text-gray-500 truncate">{selectedEvent.event._id.slice(0, 16)}</span>
        </div>

        {/* Page URL */}
        {selectedEvent.event.location?.href && (
          <div className="px-5 py-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.url}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 break-all leading-relaxed font-mono">
              {selectedEvent.event.location.href}
            </p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          <EventBody fe={selectedEvent} />
        </div>

        {/* Device info */}
        {selectedEvent.deviceInfo && (
          <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">{t.device}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>{t.deviceType}</span><span className="text-gray-600 dark:text-gray-300 capitalize">{selectedEvent.deviceInfo.deviceType}</span>
              <span>{t.screen}</span><span className="text-gray-600 dark:text-gray-300">{selectedEvent.deviceInfo.screenWidth}×{selectedEvent.deviceInfo.screenHeight}</span>
              <span>{t.viewport}</span><span className="text-gray-600 dark:text-gray-300">{selectedEvent.deviceInfo.viewportWidth}×{selectedEvent.deviceInfo.viewportHeight}</span>
              <span>{t.language_d}</span><span className="text-gray-600 dark:text-gray-300">{selectedEvent.deviceInfo.language}</span>
              <span>{t.dpr}</span><span className="text-gray-600 dark:text-gray-300">{selectedEvent.deviceInfo.devicePixelRatio}</span>
              <span>{t.cpuCores}</span><span className="text-gray-600 dark:text-gray-300">{selectedEvent.deviceInfo.hardwareConcurrency ?? '?'}</span>
              {selectedEvent.deviceInfo.connectionType && (
                <><span>{t.connection}</span><span className="text-gray-600 dark:text-gray-300">{selectedEvent.deviceInfo.connectionType}</span></>
              )}
            </div>
          </div>
        )}

        {/* Params */}
        {selectedEvent.params && Object.keys(selectedEvent.params).length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">{t.params}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(selectedEvent.params).map(([k, v]) => (
                <><span key={k}>{k}</span><span key={k + 'v'} className="text-gray-600 dark:text-gray-300">{v}</span></>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function EventBody({ fe }: { fe: FlatEvent }) {
  const { event } = fe;
  switch (event.type) {
    case ERilogEvent.REQUEST:       return <RequestBody data={event.data} />;
    case ERilogEvent.CLICK:         return <ClickBody data={event.data} />;
    case ERilogEvent.INPUT:         return <InputBody data={event.data} />;
    case ERilogEvent.CONSOLE_ERROR:
    case ERilogEvent.CONSOLE_WARN:  return <ConsoleBody data={event.data} />;
    case ERilogEvent.DEBUG_MESSAGE: return <DebugBody data={event.data} />;
    default:                        return <CodeBlock value={event.data} />;
  }
}

// ── Request ───────────────────────────────────────────────────────
function RequestBody({ data }: { data: unknown }) {
  const d = data as IRilogRequestItem;
  const { t } = useStore();
  const status = d?.response?.status;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-sm font-bold text-brand-dark dark:text-brand-light">{d?.request?.method}</span>
        {status && <span className={`font-mono text-sm font-bold ${getStatusColor(status)}`}>{status}</span>}
        {d?.duration && <span className="text-xs text-gray-400">{d.duration}</span>}
      </div>

      {d?.request?.url && (
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{t.url}</p>
          <p className="text-xs font-mono text-gray-100 break-all leading-relaxed bg-gray-900 rounded-lg px-3 py-2">
            {d.request.url}
          </p>
        </div>
      )}

      <Section title={t.request}>
        <DetailRow label={t.timestamp}>{new Date(d?.request?.timestamp ?? 0).toISOString()}</DetailRow>
        {d?.request?.data !== undefined && (
          <DetailRow label={t.body}><CodeBlock value={d.request.data} label={`${t.request} ${t.body}`} /></DetailRow>
        )}
        {!!d?.request?.headers && (
          <DetailRow label={t.headers}><CodeBlock value={d.request.headers} label={t.headers} /></DetailRow>
        )}
        {d?.request?.localStorage && (
          <DetailRow label={t.localStorage}>
            <CodeBlock value={JSON.parse(d.request.localStorage)} label={t.localStorage} />
          </DetailRow>
        )}
      </Section>

      <Section title={t.response}>
        <DetailRow label={t.timestamp}>{new Date(d?.response?.timestamp ?? 0).toISOString()}</DetailRow>
        {d?.response?.data !== undefined && (
          <DetailRow label={t.body}><CodeBlock value={d.response.data} label={`${t.response} ${t.body}`} /></DetailRow>
        )}
      </Section>
    </div>
  );
}

// ── Click ─────────────────────────────────────────────────────────
function ClickBody({ data }: { data: unknown }) {
  const d = data as IRilogClick;
  const { t } = useStore();
  return (
    <div className="space-y-2">
      <DetailRow label={t.element}>{d?.nodeName}</DetailRow>
      <DetailRow label={t.id}>{d?.id || '—'}</DetailRow>
      <DetailRow label={t.classes}>{d?.classNames || '—'}</DetailRow>
      <DetailRow label={t.text}>"{d?.inner}"</DetailRow>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────
function InputBody({ data }: { data: unknown }) {
  const d = data as IRilogInput;
  const { t } = useStore();
  return (
    <div className="space-y-2">
      <DetailRow label={t.element}>{d?.nodeName}</DetailRow>
      <DetailRow label={t.name}>{d?.name || '—'}</DetailRow>
      <DetailRow label={t.id}>{d?.id || '—'}</DetailRow>
      <DetailRow label={t.type}>{d?.inputType}</DetailRow>
      <DetailRow label={t.value}>{d?.value}</DetailRow>
    </div>
  );
}

// ── Console ───────────────────────────────────────────────────────
function ConsoleBody({ data }: { data: unknown }) {
  const d = data as IRilogConsoleData;
  const { t } = useStore();
  return (
    <div className="space-y-3">
      <DetailRow label={t.source}>{d?.source}</DetailRow>
      <DetailRow label={t.level}>{d?.level}</DetailRow>
      {d?.message && (
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t.message}</p>
          <CodeBlock value={d.message} label={t.message} language="plaintext" />
        </div>
      )}
      {d?.errorFile && (
        <DetailRow label={t.file}>
          {d.errorFile}{d.errorLine ? `:${d.errorLine}` : ''}{d.errorColumn ? `:${d.errorColumn}` : ''}
        </DetailRow>
      )}
      {d?.stackTrace && (
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t.stackTrace}</p>
          <CodeBlock value={d.stackTrace} label={t.stackTrace} language="plaintext" />
        </div>
      )}
    </div>
  );
}

// ── Debug message ─────────────────────────────────────────────────
function DebugBody({ data }: { data: unknown }) {
  const d = data as IRilogMessageData;
  const { t } = useStore();
  let parsed: unknown = null;
  if (d?.shouldBeParsed) {
    try { parsed = JSON.parse(d.data); } catch { /* noop */ }
  }
  return (
    <div className="space-y-3">
      <DetailRow label="Label">
        <span className="font-mono font-medium text-brand-teal">{d?.label}</span>
      </DetailRow>
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t.data}</p>
        <CodeBlock value={parsed !== null ? parsed : d?.data} label={d?.label} />
      </div>
      {d?.stackTrace && (
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t.stackTrace}</p>
          <pre className="text-xs font-mono bg-gray-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-gray-300">
            {d.stackTrace}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Code block (always dark Monaco) ──────────────────────────────
function CodeBlock({ value, label, language = 'json' }: { value: unknown; label?: string; language?: string }) {
  const { t } = useStore();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const code = typeof value === 'string'
    ? value
    : JSON.stringify(value, null, 2);

  const lineCount = code.split('\n').length;
  const height = Math.min(Math.max(lineCount * 19 + 16, 60), 300);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <div className="relative rounded-lg overflow-hidden border border-gray-700">
        {/* Toolbar */}
        <div className="absolute top-1.5 right-2 z-10 flex items-center gap-1">
          <button
            onClick={() => setExpanded(true)}
            title="Expand"
            className="text-xs text-gray-400 hover:text-gray-200 bg-gray-800/80 px-1.5 py-0.5 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-200 bg-gray-800/80 px-1.5 py-0.5 rounded transition-colors"
          >
            {copied ? t.copied : t.copyCode}
          </button>
        </div>

        <Editor
          height={height}
          defaultLanguage={language}
          value={code}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'off',
            folding: true,
            fontSize: 12,
            wordWrap: 'on',
            scrollbar: { vertical: 'auto', horizontal: 'auto', verticalScrollbarSize: 6 },
            overviewRulerLanes: 0,
            renderLineHighlight: 'none',
            contextmenu: false,
            lineDecorationsWidth: 4,
            lineNumbersMinChars: 0,
            glyphMargin: false,
            padding: { top: 8, bottom: 8 },
          }}
          loading={
            <pre className="text-xs font-mono bg-gray-900 p-3 overflow-x-auto whitespace-pre-wrap text-gray-300">
              {code}
            </pre>
          }
        />
      </div>

      {expanded && (
        <CodeExpandModal value={code} label={label} onClose={() => setExpanded(false)} />
      )}
    </>
  );
}

// ── Shared primitives ─────────────────────────────────────────────
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-20 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-gray-700 dark:text-gray-200 break-all min-w-0 flex-1">{children}</span>
    </div>
  );
}
