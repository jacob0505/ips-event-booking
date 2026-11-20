import { useCallback, useEffect, useState } from 'react';
import { fetchUpcomingEvents } from '../api/events';

export default function useUpcomingEvents() {
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try {
      setItems(await fetchUpcomingEvents());
    } catch {
      /* 通知載入失敗不應影響主要功能 */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000); // 每分鐘更新一次
    return () => clearInterval(timer);
  }, [load]);

  return { items, reload: load };
}