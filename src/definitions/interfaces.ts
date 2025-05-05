export interface PaginatedResponse<T> {
  data?: T[];
  errors?: [];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
