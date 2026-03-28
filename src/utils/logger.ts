import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  step?: string;
  agent?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOGS_DIR = path.resolve("logs");
const RETENTION_DAYS = 7;

// ---------------------------------------------------------------------------
// Logger class
// ---------------------------------------------------------------------------

export class Logger {
  private minLevel: LogLevel;
  private logStream: fs.WriteStream | null = null;
  private logFilePath: string;
  private defaultContext: LogContext;

  constructor(options: { level?: LogLevel; context?: LogContext } = {}) {
    this.minLevel = options.level ?? (process.env.LOG_LEVEL as LogLevel) ?? "info";
    this.defaultContext = options.context ?? {};

    // Ensure logs directory exists synchronously so the stream can open immediately
    fs.mkdirSync(LOGS_DIR, { recursive: true });

    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    this.logFilePath = path.join(LOGS_DIR, `pipeline-${dateStr}.log`);
    this.logStream = fs.createWriteStream(this.logFilePath, { flags: "a" });
  }

  // ---- Public API ---------------------------------------------------------

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  /** Create a child logger that inherits context but can add more. */
  child(context: LogContext): Logger {
    const child = new Logger({ level: this.minLevel, context: { ...this.defaultContext, ...context } });
    // Share the same file stream
    child.logStream = this.logStream;
    child.logFilePath = this.logFilePath;
    return child;
  }

  /** Rotate old log files (keep last RETENTION_DAYS days). Call once per run. */
  async rotate(): Promise<void> {
    try {
      const entries = await fsp.readdir(LOGS_DIR);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

      for (const entry of entries) {
        // Match pipeline-YYYY-MM-DD.log
        const match = entry.match(/^pipeline-(\d{4}-\d{2}-\d{2})\.log$/);
        if (!match) continue;
        const fileDate = new Date(match[1]);
        if (fileDate < cutoff) {
          await fsp.unlink(path.join(LOGS_DIR, entry));
          this.info(`Rotated old log file: ${entry}`);
        }
      }
    } catch {
      // Non-critical — swallow errors
    }
  }

  /** Flush and close the log file stream. */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.logStream) {
        this.logStream.end(() => resolve());
      } else {
        resolve();
      }
    });
  }

  // ---- Internal -----------------------------------------------------------

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
    };

    // Clean up empty context
    if (entry.context && Object.keys(entry.context).length === 0) {
      delete entry.context;
    }

    const line = JSON.stringify(entry);

    // Write to stdout / stderr
    if (level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }

    // Write to file
    if (this.logStream && !this.logStream.destroyed) {
      this.logStream.write(line + "\n");
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton for convenience
// ---------------------------------------------------------------------------

let _default: Logger | null = null;

export function getLogger(context?: LogContext): Logger {
  if (!_default) {
    _default = new Logger();
  }
  return context ? _default.child(context) : _default;
}
