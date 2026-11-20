import { useCallback, useEffect, useState } from 'react';
import { fetchEvents } from '../api/events';
import { getErrorMessage } from '../api/client';

export default function useEvents(date) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEvents(await fetchEvents(date));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, error, reload: load };
}