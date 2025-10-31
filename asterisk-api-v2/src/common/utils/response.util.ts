/**
 * Utility class for standardized API responses
 */
export class ResponseUtil {
  /**
   * Create success response
   */
  static success<T>(data: T, message?: string) {
    return {
      success: true,
      message: message || 'Operation successful',
      data,
    };
  }

  /**
   * Create error response
   */
  static error(message: string, details?: any) {
    return {
      success: false,
      message,
      ...(details && { details }),
    };
  }

  /**
   * Create created response (201)
   */
  static created<T>(data: T, message?: string) {
    return {
      success: true,
      message: message || 'Resource created successfully',
      data,
    };
  }
}
