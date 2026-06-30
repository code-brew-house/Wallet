export const WALLET_DATA_REFRESH_EVENT = 'wallet:data-refresh';

export function notifyWalletDataChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(WALLET_DATA_REFRESH_EVENT));
}

export function subscribeWalletDataRefresh(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(WALLET_DATA_REFRESH_EVENT, callback);
  return () => window.removeEventListener(WALLET_DATA_REFRESH_EVENT, callback);
}
