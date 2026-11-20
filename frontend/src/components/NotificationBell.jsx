import { useEffect, useRef, useState } from 'react';
import { formatDaysUntil } from '../utils/format';

export default function NotificationBell({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 點擊外部關閉下拉
  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        type="button"
        className="bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${items.length})`}
      >
        🔔
        {items.length > 0 && <span className="bell-badge">{items.length}</span>}
      </button>

      {open && (
        <div className="bell-menu">
          <div className="bell-title">Upcoming within 3 days</div>
          {items.length === 0 ? (
            <p className="muted small bell-empty">No upcoming events.</p>
          ) : (
            <ul>
              {items.map((it) => (
                <li key={it.id}>
                  <strong>{it.title}</strong>
                  <span className="muted small">
                    {formatDaysUntil(it.days_until)} · {it.event_date} · {it.registered}/{it.max_attendees} registered
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}