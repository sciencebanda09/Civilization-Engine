export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

const LOG_LEVEL = (() => {
  const env = process.env['LOG_LEVEL']?.toUpperCase() as keyof typeof LogLevel | undefined;
  if (env && env in LogLevel) {
    return LogLevel[env] as number;
  }
  return LogLevel.INFO;
})();

function formatTimestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  debug: (msg: string, ...args: unknown[]) => {
    if (LOG_LEVEL <= LogLevel.DEBUG) {
      console.debug(`[${formatTimestamp()}] [DEBUG] ${msg}`, ...args);
    }
  },
  info: (msg: string, ...args: unknown[]) => {
    if (LOG_LEVEL <= LogLevel.INFO) {
      console.info(`[${formatTimestamp()}] [INFO] ${msg}`, ...args);
    }
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (LOG_LEVEL <= LogLevel.WARN) {
      console.warn(`[${formatTimestamp()}] [WARN] ${msg}`, ...args);
    }
  },
  error: (msg: string, ...args: unknown[]) => {
    if (LOG_LEVEL <= LogLevel.ERROR) {
      console.error(`[${formatTimestamp()}] [ERROR] ${msg}`, ...args);
    }
  },
};
