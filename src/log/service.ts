export enum LogLevel {
  trace,
  debug,
  info,
  warn,
  error,
}

export class LoggerService {
  public logLevel: LogLevel;
	private static instance: LoggerService;

  constructor(logLevel: LogLevel = LogLevel.debug) {
    this.logLevel = logLevel;
  }

  public static getInstance(logLevel?: LogLevel): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService(logLevel);
    }
    return LoggerService.instance;
  }

  private logMessage(level: LogLevel, message: string): void {
    if (level >= this.logLevel) {
      const logLevelNames = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
      const logLevelName = logLevelNames[level];
      console.log(`[${logLevelName}]\t${new Date().toISOString()}\t- ${message}`);
    }
  }

  public trace(message: string): void {
    this.logMessage(LogLevel.trace, message);
  }

  public debug(message: string): void {
    this.logMessage(LogLevel.debug, message);
  }

  public info(message: string): void {
    this.logMessage(LogLevel.info, message);
  }

  public warn(message: string): void {
    this.logMessage(LogLevel.warn, message);
  }

  public error(message: string): void {
    this.logMessage(LogLevel.error, message);
  }
}
