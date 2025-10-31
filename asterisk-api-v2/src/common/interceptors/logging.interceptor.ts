import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Logging Interceptor
 *
 * Automatically logs all incoming HTTP requests and their responses
 *
 * Logged information:
 * - HTTP method and URL
 * - User ID and tenant ID (if authenticated)
 * - Client IP address
 * - Response status code
 * - Execution time
 *
 * Applied globally via APP_INTERCEPTOR in app.module.ts
 *
 * @example
 * Log output:
 * [LoggingInterceptor] GET /api/v1/queues - User: 5 (Tenant: 1) - IP: 127.0.0.1 - 200 - 45ms
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const { method, url, ip } = request;
    const user = (request as any).user;
    const userAgent = request.get('user-agent') || '';

    const startTime = Date.now();

    // Log the incoming request
    const userInfo = user ? `User: ${user.sub} (Tenant: ${user.tenantId ?? 'N/A'})` : 'Anonymous';
    this.logger.log(`→ ${method} ${url} - ${userInfo} - IP: ${ip}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const executionTime = Date.now() - startTime;
          this.logger.log(
            `← ${method} ${url} - ${userInfo} - ${response.statusCode} - ${executionTime}ms`,
          );
        },
        error: (error) => {
          const executionTime = Date.now() - startTime;
          this.logger.error(
            `← ${method} ${url} - ${userInfo} - ${error.status || 500} - ${executionTime}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }
}
