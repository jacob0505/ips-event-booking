export default function EventCard({ event, onRegister }) {
  const full = event.available_slots === 0;

  return (
    <div className="card">
      <h3>{event.title}</h3>
      <p className="muted">{event.description}</p>
      <p><strong>Date:</strong> {event.event_date}</p>
      <p>
        <strong>Available slots:</strong>{' '}
        <span className={full ? 'text-danger' : 'text-ok'}>
          {event.available_slots} / {event.max_attendees}
        </span>
      </p>
      <button className="btn" disabled={full} onClick={() => onRegister(event)}>
        {full ? 'Full' : 'Register'}
      </button>
    </div>
  );
}