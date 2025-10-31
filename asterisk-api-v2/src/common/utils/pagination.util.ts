import { PaginatedResponse } from '../interfaces/paginated-response.interface';

export class PaginationUtil {
  /**
   * Create a paginated response object
   */
  static createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Calculate skip value for database query
   */
  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }
}
