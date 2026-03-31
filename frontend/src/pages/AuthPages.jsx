import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <span className="text-4xl block mb-3">⛳</span>
          <h1 className="font-display font-bold text-3xl text-white">Welcome back</h1>
          <p className="text-white/40 mt-2">Sign in to your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
              {loading ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : <>Sign In <ArrowRight size={17} /></>}
            </button>
          </form>

          <p className="text-center text-white/30 text-sm mt-6">
            No account?{' '}
            <Link to="/register" className="text-lime-400 hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', handicap: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register({
        ...form,
        handicap: form.handicap ? parseFloat(form.handicap) : undefined,
      });
      toast.success('Account created! Welcome to GolfCharity 🎉');
      navigate('/pricing');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <span className="text-4xl block mb-3">⛳</span>
          <h1 className="font-display font-bold text-3xl text-white">Create your account</h1>
          <p className="text-white/40 mt-2">Start playing with purpose</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Full name</label>
              <input type="text" className="input" placeholder="John Smith"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                required minLength={2}
              />
            </div>
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required minLength={8}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Handicap <span className="text-white/20">(optional)</span></label>
              <input type="number" className="input" placeholder="e.g. 12.5"
                value={form.handicap}
                onChange={e => setForm({ ...form, handicap: e.target.value })}
                step="0.1" min="0" max="54"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
              {loading ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : <>Create Account <ArrowRight size={17} /></>}
            </button>
          </form>

          <p className="text-center text-white/30 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-lime-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
