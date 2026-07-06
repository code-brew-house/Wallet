const DEFAULT_NEXT_PATH = '/groups';
const CONTROL_OR_BACKSLASH = /[\u0000-\u001F\u007F\\]/;

export function getSafeNextPath(nextPath: string | null): string {
  if (!nextPath?.startsWith('/') || nextPath.startsWith('//') || CONTROL_OR_BACKSLASH.test(nextPath)) {
    return DEFAULT_NEXT_PATH;
  }

  return nextPath;
}
