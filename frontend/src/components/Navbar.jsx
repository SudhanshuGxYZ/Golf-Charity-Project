import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, LogOut, User, LayoutDashboard, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setProfileOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-carbon-950/95 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lime-400 text-2xl">⛳</span>
          <span className="font-display font-bold text-lg text-white">GolfCharity</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/draws" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Monthly Draw
          </NavLink>
          <NavLink to="/charities" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Charities
          </NavLink>
          <NavLink to="/pricing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Pricing
          </NavLink>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-carbon-800 border border-white/10 rounded-xl px-4 py-2 hover:border-lime-400/30 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                  <span className="text-lime-400 text-xs font-bold">
                    {user.full_name?.[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-white/80">{user.full_name?.split(' ')[0]}</span>
                <ChevronDown size={14} className={`text-white/40 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-carbon-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                  <div className="p-3 border-b border-white/5">
                    <p className="text-sm font-medium text-white">{user.full_name}</p>
                    <p className="text-xs text-white/40 truncate">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      to="/dashboard"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <LayoutDashboard size={15} />
                      Dashboard
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-lime-400/80 hover:text-lime-400 hover:bg-lime-400/5 transition-colors"
                      >
                        <Shield size={15} />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm py-2">Sign in</Link>
              <Link to="/register" className="btn-primary text-sm py-2">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-white/60 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-carbon-900 border-t border-white/5 animate-slide-up">
          <div className="p-4 flex flex-col gap-1">
            <NavLink to="/draws" onClick={() => setOpen(false)} className="px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5">Monthly Draw</NavLink>
            <NavLink to="/charities" onClick={() => setOpen(false)} className="px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5">Charities</NavLink>
            <NavLink to="/pricing" onClick={() => setOpen(false)} className="px-4 py-3 rounded-lg text-white/70 hover:text-white hover:bg-white/5">Pricing</NavLink>

            <div className="border-t border-white/5 pt-3 mt-2 flex flex-col gap-2">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setOpen(false)} className="btn-outline justify-center">Dashboard</Link>
                  <button onClick={handleLogout} className="btn-ghost justify-center text-red-400">Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-outline justify-center">Sign in</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="btn-primary justify-center">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
