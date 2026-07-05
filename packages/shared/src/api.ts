export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'LOGIN_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'STALE_OFFLINE_DATA'
  | 'DEPENDENCY_UNAVAILABLE';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, string[]>;
}
