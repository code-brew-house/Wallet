import { useEffect, useState } from 'react';
import { apiClient } from './api-client';

const DEFAULT_GROUP_CURRENCY = 'INR';

interface GroupListItem {
  id: string;
  currency?: string;
}

export function useGroupCurrency(groupId: string, fallbackCurrency = DEFAULT_GROUP_CURRENCY): string {
  const [currency, setCurrency] = useState(fallbackCurrency);

  useEffect(() => {
    let cancelled = false;

    async function loadGroupCurrency() {
      try {
        const groups = await apiClient.request<GroupListItem[]>('/groups');
        const groupCurrency = groups.find((group) => group.id === groupId)?.currency;
        if (!cancelled) setCurrency(groupCurrency || fallbackCurrency);
      } catch {
        if (!cancelled) setCurrency(fallbackCurrency);
      }
    }

    void loadGroupCurrency();
    return () => {
      cancelled = true;
    };
  }, [fallbackCurrency, groupId]);

  return currency;
}
