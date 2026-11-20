import { Link } from 'react-router-dom';
import { useState } from 'react';
import useEvents from '../hooks/useEvents';
import EventCard from '../components/EventCard';
import RegistrationForm from '../components/RegistrationForm';
import ThemeToggle from '../components/ThemeToggle';
import Alert from '../components/Alert';

export default function EventsPage() {
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState(null);
  const { events, loading, error, reload } = useEvents(date);

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>Event Booking</h1>
          <p className="subtitle">Pick an event and reserve your spot.</p>
        </div>
        <div className="filter">
          <Link to="/admin">Admin</Link>
          <label htmlFor="date">Filter by date</label>
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {date && <button className="btn btn-secondary btn-sm" onClick={() => setDate('')}>Clear</button>}
          <ThemeToggle />
        </div>
      </header>

      {loading && <p className="muted">Loading events...</p>}
      {error && (
        <Alert type="error">
          {error} <button className="link" onClick={reload}>Retry</button>
        </Alert>
      )}
      {!loading && !error && events.length === 0 && <div className="empty-state">No events found.</div>}

      <div className="grid">
        {events.map((ev) => (
          <EventCard key={ev.id} event={ev} onRegister={setSelected} />
        ))}
      </div>

      {selected && (
        <RegistrationForm
          event={selected}
          onClose={() => setSelected(null)}
          onDone={reload}
        />
      )}
    </div>
  );
}