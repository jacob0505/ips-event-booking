import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InputField from '../components/InputField';
import Alert from '../components/Alert';
import ThemeToggle from '../components/ThemeToggle';
import { adminLogin } from '../api/events';
import { getErrorMessage } from '../api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await adminLogin(form);
      localStorage.setItem('admin_token', res.token);
      navigate('/admin');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container narrow">
      <header className="header">
        <h1>Admin Login</h1>
        <ThemeToggle />
      </header>
      <section className="card">
        <Alert type="error">{error}</Alert>
        <form onSubmit={handleSubmit} noValidate>
          <InputField label="Email" id="email" name="email" type="email"
            value={form.email} onChange={handleChange} disabled={submitting} />
          <InputField label="Password" id="password" name="password" type="password"
            value={form.password} onChange={handleChange} disabled={submitting} />
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
      <p style={{ marginTop: '1rem' }}><Link to="/">← Back to events</Link></p>
    </div>
  );
}