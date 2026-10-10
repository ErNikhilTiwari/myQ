export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    traceId?: string;
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}
