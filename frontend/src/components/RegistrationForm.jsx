import { useState } from 'react';
import InputField from './InputField';
import Alert from './Alert';
import { registerForEvent, cancelRegistration } from '../api/events';
import { getErrorMessage } from '../api/client';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistrationForm({ event, onClose, onDone }) {
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { type, message }

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!emailRe.test(form.email.trim())) errs.email = 'Invalid email format.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await registerForEvent({
        event_id: event.id,
        name: form.name.trim(),
        email: form.email.trim(),
      });
      setResult({ type: 'success', message: res.message });
      onDone();
    } catch (err) {
      setResult({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!form.email.trim() || !emailRe.test(form.email.trim())) {
      setErrors({ email: 'Enter your email to cancel.' });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await cancelRegistration({ event_id: event.id, email: form.email.trim() });
      setResult({ type: 'success', message: res.message });
      onDone();
    } catch (err) {
      setResult({ type: 'error', message: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Register: {event.title}</h2>
        <p className="muted">{event.event_date}</p>

        <Alert type={result?.type === 'success' ? 'success' : 'error'}>{result?.message}</Alert>

        <form onSubmit={handleSubmit} noValidate>
          <InputField label="Name" id="name" name="name" value={form.name}
            onChange={handleChange} error={errors.name} disabled={submitting} />
          <InputField label="Email" id="email" name="email" type="email" value={form.email}
            onChange={handleChange} error={errors.email} disabled={submitting} />

          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={submitting}>
              Cancel my registration
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}