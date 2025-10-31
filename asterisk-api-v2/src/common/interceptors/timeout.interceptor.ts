import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/**
 * Timeout Interceptor
 *
 * Adds a global timeout to all requests
 * Throws RequestTimeoutException if request takes longer than configured timeout
 *
 * Default timeout: 30 seconds
 * Can be configured via TIMEOUT_MS environment variable
 *
 * Applied globally via APP_INTERCEPTOR in app.module.ts
 *
 * @example
 * If a request takes longer than 30 seconds:
 * {
 *   success: false,
 *   statusCode: 408,
 *   message: "Request timeout - operation took too long to complete"
 * }
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly timeoutMs: number;

  constructor() {
    // Default 30 seconds, configurable via environment variable
    this.timeoutMs = parseInt(process.env.TIMEOUT_MS || '500000', 10);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException(
                `Request timeout - operation took longer than ${this.timeoutMs}ms`,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
