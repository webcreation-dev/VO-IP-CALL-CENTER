import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response structure interface
 */
export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Transform Interceptor
 *
 * Wraps all successful responses in a standardized format:
 * {
 *   success: true,
 *   data: <actual response>,
 *   timestamp: "2025-10-30T18:00:00.000Z"
 * }
 *
 * Applied globally via APP_INTERCEPTOR in app.module.ts
 *
 * @example
 * Original response: { id: 1, name: "support" }
 * Transformed: {
 *   success: true,
 *   data: { id: 1, name: "support" },
 *   timestamp: "2025-10-30T18:00:00.000Z"
 * }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
