import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <div className="text-8xl font-display font-black text-lime-400/10 mb-4 select-none">404</div>
        <h1 className="font-display font-bold text-3xl text-white mb-3">Page not found</h1>
        <p className="text-white/40 mb-8">Looks like this shot went wide of the fairway.</p>
        <Link to="/" className="btn-primary">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
