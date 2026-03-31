import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Trophy, Heart, Calendar, TrendingUp, Plus, Pencil, Trash2,
  Upload, CreditCard, CheckCircle, Clock, X, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

/* ── Helpers ─────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    active: 'badge-active',
    past_due: 'badge-warning',
    cancelled: 'badge-error',
    lapsed: 'badge-error',
    pending: 'badge-neutral',
    under_review: 'badge-warning',
    approved: 'badge-active',
    paid: 'badge-active',
    rejected: 'badge-error',
  };
  return <span className={map[status] || 'badge-neutral'}>{status?.replace('_', ' ')}</span>;
}

/* ── Score Entry Modal ───────────────────────────────────── */
function ScoreModal({ score, onClose, onSave }) {
  const [form, setForm] = useState({
    score: score?.score || '',
    played_at: score?.played_at || new Date().toISOString().split('T')[0],
    course_name: score?.course_name || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseInt(form.score);
    if (isNaN(val) || val < 1 || val > 45) {
      toast.error('Score must be between 1 and 45');
      return;
    }
    setLoading(true);
    try {
      if (score?.id) {
        await api.put(`/scores/${score.id}`, { ...form, score: val });
        toast.success('Score updated');
      } else {
        await api.post('/scores', { ...form, score: val });
        toast.success('Score added');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save score');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-bold text-xl text-white">
            {score?.id ? 'Edit Score' : 'Add Score'}
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Stableford Score <span className="text-white/30">(1–45)</span></label>
            <input type="number" className="input" min={1} max={45}
              value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} required />
          </div>
          <div>
            <label className="label">Date Played</label>
            <input type="date" className="input"
              value={form.played_at} onChange={e => setForm({ ...form, played_at: e.target.value })}
              max={new Date().toISOString().split('T')[0]} required />
          </div>
          <div>
            <label className="label">Course Name <span className="text-white/30">(optional)</span></label>
            <input type="text" className="input" placeholder="e.g. Royal Birkdale"
              value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : (score?.id ? 'Update Score' : 'Add Score')}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Proof Upload Modal ───────────────────────────────────── */
function ProofModal({ result, onClose, onSave }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      await api.post(`/draws/${result.id}/upload-proof`, { proof_url: url });
      toast.success('Proof submitted for review!');
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-xl text-white">Submit Proof</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-white/40 text-sm mb-5">
          Upload a screenshot of your scores from the golf platform showing your{' '}
          <strong className="text-lime-400">{result.match_type}</strong> match.
          Prize: <strong className="text-lime-400">£{Number(result.prize_amount).toFixed(2)}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Screenshot URL</label>
            <input type="url" className="input" placeholder="https://..."
              value={url} onChange={e => setUrl(e.target.value)} required />
            <p className="text-white/20 text-xs mt-1">Upload to Imgur, Google Drive, or similar and paste the public link</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Submit Proof'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Tab components ───────────────────────────────────────── */
const TABS = ['Overview', 'Scores', 'Winnings', 'Charity', 'Account'];

/* ── Main Dashboard ───────────────────────────────────────── */
export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoreModal, setScoreModal] = useState(null);
  const [proofModal, setProofModal] = useState(null);
  const { user, refreshUser } = useAuthStore();

  const fetchDashboard = async () => {
    try {
      const { data: d } = await api.get('/users/dashboard');
      setData(d);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Show success toast if coming from Stripe
    if (searchParams.get('subscription') === 'success') {
      toast.success('Subscription activated! Welcome aboard 🎉');
      refreshUser();
    }
  }, []);

  const setTab = (tab) => setSearchParams({ tab: tab.toLowerCase() });

  const deleteScore = async (id) => {
    if (!confirm('Delete this score?')) return;
    try {
      await api.delete(`/scores/${id}`);
      toast.success('Score deleted');
      fetchDashboard();
    } catch {
      toast.error('Failed to delete score');
    }
  };

  const openPortal = async () => {
    try {
      const { data: d } = await api.post('/subscriptions/portal');
      window.location.href = d.portalUrl;
    } catch {
      toast.error('Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { subscription, scores, winnings, totalWon, upcomingDraw } = data || {};
  const hasActiveSubscription = subscription?.status === 'active';

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="font-display font-bold text-3xl text-white">
              Hey, {user?.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-white/40 mt-1">Here's your GolfCharity overview</p>
          </div>
          {!hasActiveSubscription && (
            <Link to="/pricing" className="btn-primary">
              Activate Subscription
            </Link>
          )}
        </div>

        {/* No subscription warning */}
        {!hasActiveSubscription && (
          <div className="flex items-center gap-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4 mb-6 animate-fade-in">
            <AlertCircle size={18} className="text-yellow-400 shrink-0" />
            <p className="text-yellow-400/80 text-sm">
              You don't have an active subscription. Subscribe to enter draws and track your scores.
            </p>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={15} className="text-lime-400" />
              <span className="stat-label">Subscription</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={subscription?.status || 'none'} />
              <span className="text-white/30 text-xs">{subscription?.plan || '—'}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={15} className="text-lime-400" />
              <span className="stat-label">Scores logged</span>
            </div>
            <div className="stat-value">{scores?.length || 0}<span className="text-white/20 text-base font-body">/5</span></div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={15} className="text-lime-400" />
              <span className="stat-label">Total Won</span>
            </div>
            <div className="stat-value text-lime-400">£{totalWon?.toFixed(2) || '0.00'}</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={15} className="text-lime-400" />
              <span className="stat-label">Next Draw</span>
            </div>
            <div className="text-sm font-medium text-white">
              {upcomingDraw ? format(new Date(upcomingDraw.draw_date), 'dd MMM yyyy') : 'TBC'}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex overflow-x-auto gap-1 bg-carbon-800 p-1.5 rounded-xl mb-8 scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === tab.toLowerCase()
                  ? 'bg-lime-400 text-carbon-950'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6 animate-fade-in">
            {/* Recent scores */}
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-lg text-white">Your Scores</h3>
                {hasActiveSubscription && (
                  <button onClick={() => setScoreModal({})} className="btn-ghost text-sm py-1.5 text-lime-400">
                    <Plus size={15} /> Add Score
                  </button>
                )}
              </div>
              {scores?.length ? (
                <div className="flex gap-3 flex-wrap">
                  {scores.map(s => (
                    <div key={s.id} className="score-bubble" title={s.played_at}>{s.score}</div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-sm">No scores yet.{hasActiveSubscription ? ' Add your first score!' : ''}</p>
              )}
            </div>

            {/* Charity */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Heart size={16} className="text-red-400" />
                <h3 className="font-display font-semibold text-lg text-white">Your Charity</h3>
              </div>
              {data?.user?.charities ? (
                <div>
                  <p className="text-white font-medium">{data.user.charities.name}</p>
                  <p className="text-white/40 text-sm mt-1">
                    {data.user.charity_percentage}% of your subscription goes to this charity
                  </p>
                  <Link to="/dashboard?tab=charity" className="text-lime-400 text-sm hover:underline mt-3 inline-block">
                    Change charity →
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-white/40 text-sm mb-3">You haven't selected a charity yet.</p>
                  <button onClick={() => setTab('Charity')} className="btn-primary text-sm py-2">
                    Choose a Charity
                  </button>
                </div>
              )}
            </div>

            {/* Recent winnings */}
            <div className="card lg:col-span-2">
              <h3 className="font-display font-semibold text-lg text-white mb-5">Recent Draw Results</h3>
              {winnings?.length ? (
                <div className="space-y-3">
                  {winnings.slice(0, 4).map(w => (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-carbon-700">
                      <div className="flex items-center gap-3">
                        <Trophy size={16} className="text-lime-400" />
                        <div>
                          <p className="text-white text-sm font-medium">{w.match_type} • £{Number(w.prize_amount).toFixed(2)}</p>
                          <p className="text-white/30 text-xs">{w.draws?.draw_date ? format(new Date(w.draws.draw_date), 'MMM yyyy') : ''}</p>
                        </div>
                      </div>
                      <StatusBadge status={w.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-sm">No winnings yet — good luck in the next draw!</p>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Scores ──────────────────────────────────────── */}
        {activeTab === 'scores' && (
          <div className="animate-fade-in">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-semibold text-xl text-white">Stableford Scores</h3>
                  <p className="text-white/40 text-sm mt-1">Up to 5 scores are kept. Adding a 6th removes the oldest.</p>
                </div>
                {hasActiveSubscription && (
                  <button onClick={() => setScoreModal({})} className="btn-primary text-sm py-2.5">
                    <Plus size={15} /> Add Score
                  </button>
                )}
              </div>

              {scores?.length ? (
                <div className="space-y-3">
                  {scores.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-carbon-700 rounded-xl group">
                      <div className="flex items-center gap-4">
                        <div className="score-bubble">{s.score}</div>
                        <div>
                          <p className="text-white font-medium">{s.course_name || 'Course not specified'}</p>
                          <p className="text-white/30 text-xs">{format(new Date(s.played_at), 'dd MMMM yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setScoreModal(s)} className="btn-ghost text-xs py-1.5 px-3">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => deleteScore(s.id)} className="btn-ghost text-xs py-1.5 px-3 text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp size={40} className="text-white/10 mx-auto mb-3" />
                  <p className="text-white/30">No scores yet</p>
                  {hasActiveSubscription && (
                    <button onClick={() => setScoreModal({})} className="btn-primary mt-4 text-sm py-2.5">
                      <Plus size={15} /> Add Your First Score
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Winnings ────────────────────────────────────── */}
        {activeTab === 'winnings' && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="stat-card flex-1">
                <span className="stat-label">Total Won</span>
                <span className="stat-value text-lime-400">£{totalWon?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="stat-card flex-1">
                <span className="stat-label">Draws Entered</span>
                <span className="stat-value">{winnings?.length || 0}</span>
              </div>
            </div>

            {winnings?.length ? (
              winnings.map(w => (
                <div key={w.id} className="card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/10 flex items-center justify-center">
                        <Trophy size={20} className="text-lime-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{w.match_type} — £{Number(w.prize_amount).toFixed(2)}</p>
                        <p className="text-white/30 text-sm">
                          Draw: {w.draws?.draw_date ? format(new Date(w.draws.draw_date), 'dd MMM yyyy') : 'Unknown'}
                          {w.draws?.winning_numbers && (
                            <span className="ml-2 text-white/20">Winning numbers: [{w.draws.winning_numbers.join(', ')}]</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={w.status} />
                      {w.status === 'pending' && (
                        <button onClick={() => setProofModal(w)} className="btn-primary text-xs py-2 px-3">
                          <Upload size={13} /> Submit Proof
                        </button>
                      )}
                    </div>
                  </div>
                  {w.proof_url && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <a href={w.proof_url} target="_blank" rel="noopener noreferrer"
                        className="text-lime-400 text-xs hover:underline">View submitted proof →</a>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="card text-center py-16">
                <Trophy size={48} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/30">No winnings yet</p>
                <p className="text-white/20 text-sm mt-1">Enter draws by keeping your scores updated!</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Charity ─────────────────────────────────────── */}
        {activeTab === 'charity' && (
          <CharityTab userId={user?.id} currentCharity={data?.user?.charities} currentPct={data?.user?.charity_percentage} onSave={fetchDashboard} />
        )}

        {/* ── Tab: Account ─────────────────────────────────────── */}
        {activeTab === 'account' && (
          <AccountTab user={data?.user} subscription={subscription} onPortal={openPortal} />
        )}
      </div>

      {/* Modals */}
      {scoreModal !== null && (
        <ScoreModal score={scoreModal} onClose={() => setScoreModal(null)} onSave={fetchDashboard} />
      )}
      {proofModal && (
        <ProofModal result={proofModal} onClose={() => setProofModal(null)} onSave={fetchDashboard} />
      )}
    </div>
  );
}

/* ── Charity Tab ─────────────────────────────────────────── */
function CharityTab({ currentCharity, currentPct, onSave }) {
  const [charities, setCharities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pct, setPct] = useState(currentPct || 10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/charities').then(r => setCharities(r.data.charities || []));
  }, []);

  const handleSave = async () => {
    if (!selected) return toast.error('Select a charity first');
    setSaving(true);
    try {
      await api.patch('/charities/select', { charity_id: selected, charity_percentage: pct });
      toast.success('Charity selection saved!');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {currentCharity && (
        <div className="flex items-center gap-3 bg-lime-400/5 border border-lime-400/20 rounded-xl p-4">
          <CheckCircle size={16} className="text-lime-400" />
          <p className="text-white/70 text-sm">
            Currently supporting <strong className="text-lime-400">{currentCharity.name}</strong> with <strong>{currentPct}%</strong> of your subscription.
          </p>
        </div>
      )}

      <div className="card">
        <h3 className="font-display font-semibold text-lg text-white mb-5">Choose a Charity</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-6 max-h-80 overflow-y-auto pr-1">
          {charities.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-150 ${
                selected === c.id
                  ? 'border-lime-400/40 bg-lime-400/5'
                  : 'border-white/5 bg-carbon-700 hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <Heart size={15} className={selected === c.id ? 'text-lime-400 mt-0.5' : 'text-white/20 mt-0.5'} />
                <div>
                  <p className={`font-medium text-sm ${selected === c.id ? 'text-lime-400' : 'text-white'}`}>{c.name}</p>
                  <p className="text-white/30 text-xs line-clamp-2 mt-0.5">{c.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="label">Contribution Percentage: <span className="text-lime-400">{pct}%</span></label>
          <input type="range" min={10} max={100} step={5} value={pct}
            onChange={e => setPct(parseInt(e.target.value))}
            className="w-full accent-lime-400 mt-2"
          />
          <div className="flex justify-between text-xs text-white/20 mt-1">
            <span>10% (minimum)</span>
            <span>100%</span>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !selected} className="btn-primary py-3">
          {saving ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Save Charity Selection'}
        </button>
      </div>
    </div>
  );
}

/* ── Account Tab ─────────────────────────────────────────── */
function AccountTab({ user, subscription, onPortal }) {
  const [form, setForm] = useState({ current_password: '', new_password: '' });
  const [saving, setSaving] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/users/change-password', form);
      toast.success('Password changed. Please log in again.');
      setForm({ current_password: '', new_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in grid lg:grid-cols-2 gap-6">
      {/* Subscription management */}
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-white mb-5">Subscription</h3>
        {subscription ? (
          <div className="space-y-3">
            <div className="flex justify-between py-3 border-b border-white/5">
              <span className="text-white/40 text-sm">Plan</span>
              <span className="text-white capitalize">{subscription.plan}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-white/5">
              <span className="text-white/40 text-sm">Status</span>
              <StatusBadge status={subscription.status} />
            </div>
            <div className="flex justify-between py-3">
              <span className="text-white/40 text-sm">Renews</span>
              <span className="text-white text-sm">
                {subscription.current_period_end
                  ? format(new Date(subscription.current_period_end), 'dd MMM yyyy')
                  : '—'}
              </span>
            </div>
            <button onClick={onPortal} className="btn-outline w-full justify-center mt-4">
              Manage Billing
            </button>
          </div>
        ) : (
          <div>
            <p className="text-white/40 text-sm mb-4">No active subscription</p>
            <Link to="/pricing" className="btn-primary text-sm py-2.5">Choose a Plan</Link>
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-white mb-5">Change Password</h3>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input"
              value={form.current_password}
              onChange={e => setForm({ ...form, current_password: e.target.value })}
              required minLength={1}
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" placeholder="Min 8 characters"
              value={form.new_password}
              onChange={e => setForm({ ...form, new_password: e.target.value })}
              required minLength={8}
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary py-3">
            {saving ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
