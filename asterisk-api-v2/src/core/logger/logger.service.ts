import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private configService?: ConfigService) {
    const logLevel = this.configService?.get('logging.level') || 'info';
    const logDir = this.configService?.get('logging.dir') || 'logs';

    // Create log directory if not exists
    const fs = require('fs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
      defaultMeta: { service: 'asterisk-api-v2' },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ context, level, message, timestamp, ...meta }) => {
              const ctx = context ? `[${context}] ` : '';
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} ${level}: ${ctx}${message}${metaStr}`;
            }),
          ),
        }),
        // Error log file
        new winston.transports.File({
          filename: `${logDir}/error.log`,
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // Combined log file
        new winston.transports.File({
          filename: `${logDir}/combined.log`,
          maxsize: 5242880, // 5MB
          maxFiles: 10,
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context: context || this.context, trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context: context || this.context });
  }
}
