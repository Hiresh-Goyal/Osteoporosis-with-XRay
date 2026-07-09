import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api, saveSession } from '../utils/api';

export default function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const successMsg = location.state?.message;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, password);
      saveSession(data.token, data.user);
      const role = data.user.role;
      if (role === 'Patient') navigate('/patient');
      else if (role === 'Doctor') navigate('/doctor');
      else if (role === 'Admin') navigate('/admin');
      else if (role === 'QueryManager') navigate('/querymanager');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary-50 to-accent-100">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 64 64" fill="none"><rect x="28" y="4" width="8" height="56" rx="4" fill="white"/><rect x="4" y="28" width="56" height="8" rx="4" fill="white"/></svg>
            </div>
            <span className="text-white font-bold text-xl">OsteoCare</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight">Advanced Bone<br />Health Platform</h2>
          <p className="text-primary-200 mt-4 text-base leading-relaxed">Catch osteoporosis before the fracture does.</p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: '🧠', title: 'AI-Powered Analysis', desc: 'Advanced bone density prediction engine' },
            { icon: '🔒', title: 'Secure Access', desc: 'Hospital-grade data protection' },
            { icon: '📊', title: 'Priority Triage', desc: 'Smart queue for urgent care cases' },
          ].map(f => (
            <div key={f.title} className="flex items-center gap-4 bg-white/10 rounded-xl px-4 py-3 border border-white/10">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-primary-300 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 64 64" fill="none"><rect x="28" y="4" width="8" height="56" rx="4" fill="white"/><rect x="4" y="28" width="56" height="8" rx="4" fill="white"/></svg>
            </div>
            <span className="text-primary-800 font-bold text-xl">OsteoCare</span>
          </div>

          <div className="card">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-800">Welcome back</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            {successMsg && (
              <div className="mb-5 flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-3.5 text-sm">
                <span>✅</span>
                <p>{successMsg}</p>
              </div>
            )}
            {error && (
              <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3.5 text-sm">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@hospital.com"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              New patient?{' '}
              <Link to="/signup" className="text-primary-600 font-semibold hover:text-primary-700">Create an account</Link>
            </p>
          </div>

        </div>
      </div>
      {/* Chatbot Tooltip & Embed */}
      <div className="fixed bottom-[90px] right-[28px] z-50 animate-bounce pointer-events-none">
        <div className="relative">
          <div className="bg-white px-4 py-2 rounded-2xl shadow-lg border border-teal-100 text-teal-800 font-bold text-sm whitespace-nowrap">
            Ask me anything!
          </div>
          <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-b border-r border-teal-100 rotate-45 shadow-sm rounded-br-sm"></div>
        </div>
      </div>
      <zapier-interfaces-chatbot-embed is-popup="true" chatbot-id="cmr8uxrg5002tkpepo5u4omgi"></zapier-interfaces-chatbot-embed>
    </div>
  );
}
