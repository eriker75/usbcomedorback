export interface JsonApiError {
  errors: {
    code: string;
    status: string;
    title: string;
    detail: string;
  }[];
}

export interface PaginatedResponse<T> {
  data?: T[];
  errors?: JsonApiError["errors"];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
