import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';

export default function SignUpScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: ''
  });

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.register(form);
      navigate('/login', { state: { message: 'Account created! Please log in.' } });
    } catch (err) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 64 64" fill="none"><rect x="28" y="4" width="8" height="56" rx="4" fill="white"/><rect x="4" y="28" width="56" height="8" rx="4" fill="white"/></svg>
          </div>
          <span className="text-primary-800 font-bold text-xl">OsteoCare</span>
        </div>

        <div className="card">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
            <p className="text-gray-500 text-sm mt-1">Register to access the Patient Dashboard.</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3.5 text-sm">
              <span>⚠️</span><p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            <div>
              <label className="label">Full Name</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe" className="input-field" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" className="input-field" />
            </div>
            <div>
              <label className="label">Password</label>
              <input required type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 characters" className="input-field" />
            </div>
            
            <button type="submit" className="btn-primary w-full mt-4" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account? <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
