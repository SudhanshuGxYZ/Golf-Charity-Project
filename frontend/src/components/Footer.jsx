import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-carbon-900 border-t border-white/5 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lime-400 text-xl">⛳</span>
              <span className="font-display font-bold text-white">GolfCharity</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              Play with purpose. Every round entered supports a cause that matters.
            </p>
          </div>

          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Platform</p>
            <div className="flex flex-col gap-2">
              <Link to="/draws" className="text-white/40 hover:text-white text-sm transition-colors">Monthly Draw</Link>
              <Link to="/charities" className="text-white/40 hover:text-white text-sm transition-colors">Charities</Link>
              <Link to="/pricing" className="text-white/40 hover:text-white text-sm transition-colors">Pricing</Link>
            </div>
          </div>

          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Account</p>
            <div className="flex flex-col gap-2">
              <Link to="/register" className="text-white/40 hover:text-white text-sm transition-colors">Sign Up</Link>
              <Link to="/login" className="text-white/40 hover:text-white text-sm transition-colors">Sign In</Link>
              <Link to="/dashboard" className="text-white/40 hover:text-white text-sm transition-colors">Dashboard</Link>
            </div>
          </div>

          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Legal</p>
            <div className="flex flex-col gap-2">
              <span className="text-white/40 text-sm">Privacy Policy</span>
              <span className="text-white/40 text-sm">Terms of Service</span>
              <span className="text-white/40 text-sm">Cookie Policy</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} GolfCharity. All rights reserved.</p>
          <p className="text-white/20 text-xs">Payments secured by Stripe · Responsible gambling</p>
        </div>
      </div>
    </footer>
  );
}
