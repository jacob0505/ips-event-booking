import useUpcomingEvents from '../hooks/useUpcomingEvents';
import NotificationBell from '../components/NotificationBell';
import ThemeToggle from '../components/ThemeToggle';
import { formatDaysUntil } from '../utils/format';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useEvents from '../hooks/useEvents';
import InputField from '../components/InputField';
import Alert from '../components/Alert';
import {
  createEvent, updateEvent, deleteEvent, bulkDeleteEvents, adminLogout,
} from '../api/events';
import { getErrorMessage } from '../api/client';
import AttendeesModal from '../components/AttendeesModal';

const emptyForm = { title: '', description: '', event_date: '', max_attendees: '' };

export default function AdminPage() {
  const navigate = useNavigate();
  // --- state ---
  const [filterDate, setFilterDate] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState([]);
  const [viewingId, setViewingId] = useState(null);

  // --- data ---
  const { items: upcoming, reload: reloadUpcoming } = useUpcomingEvents();
  const { events, loading, error, reload: reloadEvents } = useEvents(filterDate);

  const reload = () => { reloadEvents(); reloadUpcoming(); };
  const soonMap = new Map(upcoming.map((u) => [u.id, u.days_until]));

  const handleFilterChange = (value) => {
    setFilterDate(value);
    setSelected([]);
  };

  const deletable = events.filter((ev) => ev.registered === 0);
  const allSelected = deletable.length > 0 && selected.length === deletable.length;

  const totalRegistered = events.reduce((sum, ev) => sum + ev.registered, 0);

  const forceLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleApiError = (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) return forceLogout();
    setNotice({ type: 'error', message: getErrorMessage(err) });
    reload(); // e.g. 409: data may have changed, refetch
  };

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (!form.event_date) errs.event_date = 'Date is required.';
    if (!form.max_attendees || Number(form.max_attendees) < 1)
      errs.max_attendees = 'Max attendees must be at least 1.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setNotice(null);
    const payload = {
      title: form.title.trim(),
      description: form.description,
      event_date: form.event_date,
      max_attendees: Number(form.max_attendees),
    };
    try {
      const res = editingId
        ? await updateEvent(editingId, payload)
        : await createEvent(payload);
      setNotice({ type: 'success', message: res.message });
      resetForm();
      reload();
    } catch (err) {
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description || '',
      event_date: ev.event_date,
      max_attendees: String(ev.max_attendees),
    });
    setErrors({});
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (ev) => {
    if (!window.confirm(`Delete "${ev.title}"?`)) return;
    setNotice(null);
    try {
      const res = await deleteEvent(ev.id);
      setNotice({ type: 'success', message: res.message });
      setSelected((s) => s.filter((id) => id !== ev.id));
      if (editingId === ev.id) resetForm();
      reload();
    } catch (err) {
      handleApiError(err);
    }
  };

  const toggleOne = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleAll = () =>
    setSelected(allSelected ? [] : deletable.map((ev) => ev.id));

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} selected event(s)?`)) return;
    setNotice(null);
    try {
      const res = await bulkDeleteEvents(selected);
      setNotice({ type: 'success', message: res.message });
      setSelected([]);
      if (selected.includes(editingId)) resetForm();
      reload();
    } catch (err) {
      setSelected([]);
      handleApiError(err);
    }
  };

  const handleLogout = async () => {
    try { await adminLogout(); } catch { /* token may already be invalid */ }
    forceLogout();
  };

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>Admin Panel</h1>
          <p className="subtitle">Create, edit and manage your events.</p>
        </div>
        <div className="filter">
          <NotificationBell items={upcoming} />
          <Link to="/">View public page</Link>
          <ThemeToggle />
          <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <Alert type={notice?.type} onClose={() => setNotice(null)}>{notice?.message}</Alert>

      <section className="stats">
        <div className="stat">
          <div className="stat-label">Events</div>
          <div className="stat-value">{events.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total registrations</div>
          <div className="stat-value">{totalRegistered}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Happening soon</div>
          <div className="stat-value">{upcoming.length}</div>
        </div>
      </section>

      <div className="admin-layout">
        <section className={`card admin-form${editingId ? ' editing' : ''}`}>
          <h3>{editingId ? 'Edit event' : 'Create event'}</h3>
          <form onSubmit={handleSubmit} noValidate>
            <InputField label="Title" id="title" name="title" value={form.title}
              onChange={handleChange} error={errors.title} disabled={submitting} />
            <InputField label="Description" id="description" name="description" value={form.description}
              onChange={handleChange} disabled={submitting} />
            <InputField label="Date" id="event_date" name="event_date" type="date" value={form.event_date}
              onChange={handleChange} error={errors.event_date} disabled={submitting} />
            <InputField label="Max attendees" id="max_attendees" name="max_attendees" type="number" min="1"
              value={form.max_attendees} onChange={handleChange} error={errors.max_attendees} disabled={submitting} />
            <div className="actions">
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={submitting}>
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="card">
          <div className="toolbar">
            <h3>All events</h3>
            <div className="filter">
              <label htmlFor="admin-date">Filter by date</label>
              <input id="admin-date" type="date" value={filterDate}
                onChange={(e) => handleFilterChange(e.target.value)} />
              {filterDate && (
                <button className="btn btn-secondary btn-sm" onClick={() => handleFilterChange('')}>Clear</button>
              )}
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} disabled={selected.length === 0}>
                Delete selected ({selected.length})
              </button>
            </div>
          </div>
          <p className="muted small">
            Events that already have registrations cannot be edited or deleted.
          </p>

          {loading && <p className="muted">Loading events...</p>}
          {error && <Alert type="error">{error}</Alert>}
          {!loading && !error && events.length === 0 && (
            <div className="empty-state">{filterDate ? 'No events on this date.' : 'No events yet.'}</div>
          )}

          {events.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="check">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll}
                        disabled={deletable.length === 0} aria-label="Select all" />
                    </th>
                    <th>Title</th><th>Date</th><th>Registered</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => {
                    const locked = ev.registered > 0;
                    const full = ev.registered >= ev.max_attendees;
                    return (
                      <tr key={ev.id}>
                        <td className="check">
                          <input type="checkbox" checked={selected.includes(ev.id)}
                            onChange={() => toggleOne(ev.id)} disabled={locked}
                            title={locked ? 'Has registrations' : ''} aria-label={`Select ${ev.title}`} />
                        </td>
                        <td>
                          {ev.title}
                          {soonMap.has(ev.id) && (
                            <span className="row-bell" title={`Upcoming: ${formatDaysUntil(soonMap.get(ev.id))}`}>
                              🔔 {formatDaysUntil(soonMap.get(ev.id))}
                            </span>
                          )}
                        </td>
                        <td>{ev.event_date}</td>
                        <td>
                          <span className={`badge ${full ? 'badge-full' : 'badge-open'}`}>
                            {ev.registered} / {ev.max_attendees}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="btn btn-secondary btn-sm" onClick={() => setViewingId(ev.id)}
                              disabled={ev.registered === 0}
                              title={ev.registered === 0 ? 'No attendees yet' : ''}>
                              Attendees
                            </button>
                            <button className="btn btn-sm" onClick={() => startEdit(ev)} disabled={locked}
                              title={locked ? 'Cannot edit: has registrations' : ''}>
                              Edit
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ev)} disabled={locked}
                              title={locked ? 'Cannot delete: has registrations' : ''}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {viewingId && <AttendeesModal eventId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}