import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function PricingPage() {
  const [loading, setLoading] = useState(null);
  const { user } = useAuthStore();

  const handleSubscribe = async (plan) => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    setLoading(plan);
    try {
      const { data } = await api.post('/subscriptions/create-checkout', { plan });
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start checkout');
      setLoading(null);
    }
  };

  const features = [
    'Monthly draw entry — 3 ways to win',
    'Rolling 5-score Stableford tracker',
    'Charity contribution with every payment',
    'Draw results & winner notifications',
    'Full dashboard & history',
    'Cancel anytime',
  ];

  return (
    <div className="min-h-screen pt-28 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14 animate-fade-in">
          <p className="text-lime-400 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
          <h1 className="section-title">One platform.<br />Two plans.</h1>
          <p className="section-subtitle mx-auto text-center">All features included in both plans. Save 17% with yearly.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 animate-slide-up">
          {/* Monthly */}
          <div className="card border-white/10 hover:border-lime-400/20 transition-all duration-300">
            <div className="mb-6">
              <h2 className="font-display font-bold text-2xl text-white mb-1">Monthly</h2>
              <p className="text-white/40 text-sm">Flexible — cancel anytime</p>
            </div>

            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-5xl font-display font-black text-white">£29</span>
              <span className="text-white/30">.99</span>
              <span className="text-white/30 text-sm ml-1">/ month</span>
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/60">
                  <Check size={14} className="text-lime-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('monthly')}
              disabled={loading === 'monthly'}
              className="btn-outline w-full justify-center py-3.5"
            >
              {loading === 'monthly' ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Subscribe Monthly'}
            </button>
          </div>

          {/* Yearly */}
          <div className="card border-lime-400/30 bg-gradient-to-br from-forest-800/40 to-carbon-800 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <div className="badge-active">
                <Zap size={10} />
                Best Value
              </div>
            </div>

            <div className="mb-6">
              <h2 className="font-display font-bold text-2xl text-white mb-1">Yearly</h2>
              <p className="text-white/40 text-sm">Save £60 per year</p>
            </div>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-5xl font-display font-black text-white">£24</span>
              <span className="text-white/30">.99</span>
              <span className="text-white/30 text-sm ml-1">/ month</span>
            </div>
            <p className="text-white/30 text-xs mb-8">Billed as £299.99 per year</p>

            <ul className="space-y-3 mb-8">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                  <Check size={14} className="text-lime-400 shrink-0" />
                  {f}
                </li>
              ))}
              <li className="flex items-center gap-3 text-sm text-lime-400 font-medium">
                <Check size={14} className="text-lime-400 shrink-0" />
                2 months free vs monthly
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe('yearly')}
              disabled={loading === 'yearly'}
              className="btn-primary w-full justify-center py-3.5"
            >
              {loading === 'yearly' ? (
                <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" />
              ) : 'Subscribe Yearly'}
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-white/20 text-sm">
          <span>🔒 Payments by Stripe</span>
          <span>💳 Cancel anytime</span>
          <span>💚 10% to charity guaranteed</span>
          <span>🏆 Monthly prize draw</span>
        </div>
      </div>
    </div>
  );
}
