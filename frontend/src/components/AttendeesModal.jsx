import { useEffect, useState } from 'react';
import Alert from './Alert';
import { fetchAttendees, downloadAttendeesPdf } from '../api/events';
import { getErrorMessage } from '../api/client';

export default function AttendeesModal({ eventId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchAttendees(eventId);
        if (active) setData(res);
      } catch (e) {
        if (active) setError(getErrorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [eventId]);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      const blob = await downloadAttendeesPdf(eventId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendees-${data.event.event_date}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // responseType 為 blob 時，錯誤內容也是 blob，所以只顯示通用訊息
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>Attendees</h2>
        {loading && <p className="muted">Loading...</p>}
        <Alert type="error">{error}</Alert>

        {data && (
          <>
            <p className="muted">
              {data.event.title} · {data.event.event_date} · {data.attendees.length} / {data.event.max_attendees} registered
            </p>

            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Registered at</th></tr>
                </thead>
                <tbody>
                  {data.attendees.map((a, i) => (
                    <tr key={a.id}>
                      <td>{i + 1}</td>
                      <td>{a.name}</td>
                      <td>{a.email}</td>
                      <td>{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn" onClick={handleDownload}
            disabled={!data || data.attendees.length === 0 || downloading}>
            {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}