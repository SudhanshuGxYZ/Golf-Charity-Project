import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Heart, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function CharityDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    api.get(`/charities/${id}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDonate = async () => {
    const amount = parseFloat(donationAmount);
    if (!amount || amount < 1) return toast.error('Minimum donation is £1');
    setDonating(true);
    try {
      await api.post('/charities/donate', { charity_id: id, amount });
      toast.success(`Thank you! £${amount.toFixed(2)} donated 💚`);
      setDonationAmount('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Donation failed');
    } finally {
      setDonating(false);
    }
  };

  const handleSelect = async () => {
    if (!user) return (window.location.href = '/register');
    try {
      await api.patch('/charities/select', { charity_id: id, charity_percentage: 10 });
      toast.success('Charity selected! Update percentage in your dashboard.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to select charity');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/40">Charity not found.</p>
        <Link to="/charities" className="btn-outline">← Back to Charities</Link>
      </div>
    );
  }

  const { charity, events, totalContributed } = data;

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <Link to="/charities" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={15} /> Back to Charities
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/10 flex items-center justify-center shrink-0">
                  {charity.logo_url
                    ? <img src={charity.logo_url} alt={charity.name} className="w-10 h-10 object-contain" />
                    : <Heart size={28} className="text-lime-400" />
                  }
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="font-display font-bold text-3xl text-white">{charity.name}</h1>
                    {charity.category && <span className="badge-neutral">{charity.category}</span>}
                    {charity.is_featured && <span className="badge-active">Featured</span>}
                  </div>
                  {charity.website && (
                    <a href={charity.website} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-lime-400/60 hover:text-lime-400 text-sm mt-1 transition-colors">
                      <ExternalLink size={12} /> {charity.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>

              <p className="text-white/50 leading-relaxed mt-6">{charity.description}</p>
            </div>

            {/* Upcoming events */}
            {events?.length > 0 && (
              <div className="card">
                <h2 className="font-display font-semibold text-xl text-white mb-5">Upcoming Events</h2>
                <div className="space-y-4">
                  {events.map(ev => (
                    <div key={ev.id} className="flex items-start gap-4 p-4 bg-carbon-700 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center shrink-0">
                        <Calendar size={16} className="text-lime-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{ev.title}</p>
                        <p className="text-white/30 text-sm">
                          {format(new Date(ev.event_date), 'EEEE dd MMMM yyyy')}
                          {ev.location && <span> · <MapPin size={11} className="inline" /> {ev.location}</span>}
                        </p>
                        {ev.description && <p className="text-white/40 text-sm mt-1">{ev.description}</p>}
                        {ev.registration_url && (
                          <a href={ev.registration_url} target="_blank" rel="noopener noreferrer"
                            className="text-lime-400 text-sm hover:underline mt-1 inline-block">
                            Register →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Impact */}
            <div className="card border-lime-400/10">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Community Impact</p>
              <div className="text-3xl font-display font-bold text-lime-400">
                £{totalContributed?.toFixed(2) || '0.00'}
              </div>
              <p className="text-white/30 text-sm mt-1">contributed by GolfCharity members</p>
            </div>

            {/* Select charity */}
            <div className="card">
              <h3 className="font-semibold text-white mb-3">Support This Charity</h3>
              <p className="text-white/40 text-sm mb-4">
                Select this as your charity and 10%+ of your subscription will go directly to {charity.name}.
              </p>
              <button onClick={handleSelect} className="btn-primary w-full justify-center py-3">
                <Heart size={15} /> Choose This Charity
              </button>
            </div>

            {/* Direct donation */}
            {user && (
              <div className="card">
                <h3 className="font-semibold text-white mb-3">One-Time Donation</h3>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">£</span>
                    <input
                      type="number" min={1} step={1}
                      className="input pl-7"
                      placeholder="Amount"
                      value={donationAmount}
                      onChange={e => setDonationAmount(e.target.value)}
                    />
                  </div>
                  <button onClick={handleDonate} disabled={donating} className="btn-primary shrink-0 px-4">
                    {donating
                      ? <span className="w-4 h-4 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" />
                      : 'Donate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
