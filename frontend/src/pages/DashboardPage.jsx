import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Trophy, Heart, Calendar, TrendingUp, Plus, Pencil, Trash2, Upload, CreditCard, CheckCircle, X, AlertCircle, Bell, Coins, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

function StatusBadge({ status }) {
  const map = { active: 'badge-active', past_due: 'badge-warning', cancelled: 'badge-error', lapsed: 'badge-error', pending: 'badge-neutral', under_review: 'badge-warning', approved: 'badge-active', paid: 'badge-active', rejected: 'badge-error' };
  return <span className={map[status] || 'badge-neutral'}>{status?.replace(/_/g, ' ')}</span>;
}

/* ── Score Entry Modal ───────────────────────────────────────── */
function ScoreModal({ score, onClose, onSave }) {
  const [form, setForm] = useState({ score: score?.score || '', played_at: score?.played_at || new Date().toISOString().split('T')[0], course_name: score?.course_name || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseInt(form.score);
    if (isNaN(val) || val < 1 || val > 45) { toast.error('Score must be 1–45'); return; }
    setLoading(true);
    try {
      if (score?.id) {
        await api.put(`/scores/${score.id}`, { ...form, score: val });
        toast.success('Score updated');
      } else {
        const { data } = await api.post('/scores', { ...form, score: val });
        toast.success(data.message || 'Score added');
      }
      onSave(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-xl text-white">{score?.id ? 'Edit Score' : 'Add Score'}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Stableford Score <span className="text-white/30">(1–45)</span></label>
            <input type="number" className="input" min={1} max={45} value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} required />
          </div>
          <div>
            <label className="label">Date Played</label>
            <input type="date" className="input" value={form.played_at} onChange={e => setForm({ ...form, played_at: e.target.value })} max={new Date().toISOString().split('T')[0]} required />
          </div>
          <div>
            <label className="label">Course Name <span className="text-white/30">(optional)</span></label>
            <input type="text" className="input" placeholder="e.g. Royal Birkdale" value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : (score?.id ? 'Update Score' : 'Add Score')}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Proof Upload Modal ──────────────────────────────────────── */
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
      onSave(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Submission failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-xl text-white">Submit Proof</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-white/40 text-sm mb-5">Upload a screenshot of your scores showing your <strong className="text-lime-400">{result.match_type}</strong> win. Prize: <strong className="text-lime-400">₹{Number(result.prize_amount).toFixed(2)}</strong></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Screenshot URL</label>
            <input type="url" className="input" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} required />
            <p className="text-white/20 text-xs mt-1">Upload to Imgur or Google Drive and paste the public link</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Submit Proof'}
          </button>
        </form>
      </div>
    </div>
  );
}

const TABS = ['Overview', 'Scores', 'Winnings', 'Charity', 'Credits', 'Account'];

/* ── Main Dashboard ──────────────────────────────────────────── */
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
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboard();
    if (searchParams.get('subscription') === 'success') {
      toast.success('Subscription activated! Welcome aboard 🎉');
      refreshUser();
    }
  }, []);

  const setTab = (tab) => setSearchParams({ tab: tab.toLowerCase() });
  const deleteScore = async (id) => {
    if (!confirm('Delete this score?')) return;
    try { await api.delete(`/scores/${id}`); toast.success('Score deleted'); fetchDashboard(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
  };
  const openPortal = async () => {
    try { const { data: d } = await api.post('/subscriptions/portal'); window.location.href = d.portalUrl; }
    catch { toast.error('Failed to open billing portal'); }
  };
  const markAllRead = async () => {
    try { await api.patch('/notifications/read-all'); fetchDashboard(); }
    catch {}
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>;

  const { subscription, scores, todaySession, todayScores, submittedToday, scoresEnteredToday, winnings, totalWon, upcomingDraw, unreadNotifications } = data || {};
  const hasActiveSub = subscription?.status === 'active';
  const scoresNeeded = Math.max(0, 5 - (scoresEnteredToday || 0));

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="font-display font-bold text-3xl text-white">Hey, {user?.full_name?.split(' ')[0]} 👋</h1>
            <p className="text-white/40 mt-1">Your GolfCharity dashboard</p>
          </div>
          {!hasActiveSub && <Link to="/pricing" className="btn-primary">Activate Subscription</Link>}
        </div>

        {/* No subscription warning */}
        {!hasActiveSub && (
          <div className="flex items-center gap-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4 mb-6">
            <AlertCircle size={18} className="text-yellow-400 shrink-0" />
            <p className="text-yellow-400/80 text-sm">You need an active subscription to enter draws and track scores.</p>
          </div>
        )}

        {/* Daily score prompt — shown when subscribed and not yet submitted today */}
        {hasActiveSub && !submittedToday && (
          <div className="bg-gradient-to-r from-forest-800/60 to-carbon-800 border border-lime-400/20 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-lime-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Submit today's scores</p>
                {scoresEnteredToday > 0
                  ? <p className="text-white/50 text-sm">{scoresEnteredToday}/5 scores entered — {scoresNeeded} more needed to complete your draw entry</p>
                  : <p className="text-white/50 text-sm">Submit all 5 Stableford scores today to enter this month's draw</p>
                }
              </div>
            </div>
            <button onClick={() => setTab('Scores')} className="btn-primary text-sm py-2.5 shrink-0">
              {scoresEnteredToday > 0 ? `Continue (${scoresEnteredToday}/5)` : 'Submit Scores'}
            </button>
          </div>
        )}

        {/* Submitted today success banner */}
        {hasActiveSub && submittedToday && (
          <div className="flex items-center gap-3 bg-lime-400/5 border border-lime-400/20 rounded-xl p-4 mb-6">
            <CheckCircle size={18} className="text-lime-400" />
            <p className="text-lime-400/80 text-sm font-medium">All 5 scores submitted today — you're entered in this month's draw! 🎉</p>
          </div>
        )}

        {/* Notifications */}
        {unreadNotifications?.length > 0 && (
          <div className="card mb-6 border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-lime-400" />
                <span className="text-white font-medium text-sm">Notifications</span>
                <span className="badge-active text-xs">{unreadNotifications.length}</span>
              </div>
              <button onClick={markAllRead} className="text-white/30 text-xs hover:text-white">Mark all read</button>
            </div>
            <div className="space-y-2">
              {unreadNotifications.slice(0, 3).map(n => (
                <div key={n.id} className="flex items-start gap-3 p-3 bg-carbon-700 rounded-xl">
                  <div className="w-2 h-2 mt-1.5 bg-lime-400 rounded-full shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">{n.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2"><CreditCard size={15} className="text-lime-400" /><span className="stat-label">Subscription</span></div>
            <div className="flex items-center gap-2 flex-wrap"><StatusBadge status={subscription?.status || 'none'} /><span className="text-white/30 text-xs capitalize">{subscription?.plan || '—'}</span></div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2"><TrendingUp size={15} className="text-lime-400" /><span className="stat-label">Today's scores</span></div>
            <div className="stat-value">{scoresEnteredToday || 0}<span className="text-white/20 text-base font-body">/5</span></div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2"><Trophy size={15} className="text-lime-400" /><span className="stat-label">Total won</span></div>
              <div className="stat-value text-lime-400">₹{totalWon?.toFixed(2) || '0.00'}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2"><Coins size={15} className="text-lime-400" /><span className="stat-label">Credits</span></div>
            <div className="stat-value">{data?.user?.credits || 0}</div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex overflow-x-auto gap-1 bg-carbon-800 p-1.5 rounded-xl mb-8">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setTab(tab)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${activeTab === tab.toLowerCase() ? 'bg-lime-400 text-carbon-950' : 'text-white/40 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-lg text-white">Rolling Scores (latest 5)</h3>
                {hasActiveSub && !submittedToday && (
                  <button onClick={() => setTab('Scores')} className="btn-ghost text-sm py-1.5 text-lime-400"><Plus size={15} /> Add Score</button>
                )}
              </div>
              {scores?.length ? (
                <div className="flex gap-3 flex-wrap">{scores.map(s => <div key={s.id} className="score-bubble" title={s.played_at}>{s.score}</div>)}</div>
              ) : <p className="text-white/30 text-sm">No scores yet.</p>}
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-4"><Heart size={16} className="text-red-400" /><h3 className="font-display font-semibold text-lg text-white">Your Charity</h3></div>
              {data?.user?.charities ? (
                <div>
                  <p className="text-white font-medium">{data.user.charities.name}</p>
                  <p className="text-white/40 text-sm mt-1">{data.user.charity_percentage}% of your subscription goes here</p>
                  <button onClick={() => setTab('Charity')} className="text-lime-400 text-sm hover:underline mt-3 inline-block">Change charity →</button>
                </div>
              ) : (
                <div><p className="text-white/40 text-sm mb-3">No charity selected yet.</p><button onClick={() => setTab('Charity')} className="btn-primary text-sm py-2">Choose Charity</button></div>
              )}
            </div>
            <div className="card lg:col-span-2">
              <h3 className="font-display font-semibold text-lg text-white mb-5">Recent Draw Results</h3>
              {winnings?.length ? (
                <div className="space-y-3">
                  {winnings.slice(0, 4).map(w => (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-carbon-700">
                      <div className="flex items-center gap-3">
                        <Trophy size={16} className="text-lime-400" />
                        <div>
                          <p className="text-white text-sm font-medium">{w.match_type} • ₹{Number(w.prize_amount).toFixed(2)}</p>
                          <p className="text-white/30 text-xs">{w.draws?.draw_date ? format(new Date(w.draws.draw_date), 'MMM yyyy') : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={w.status} />
                        {w.status === 'pending' && <button onClick={() => setProofModal(w)} className="btn-primary text-xs py-1.5 px-3"><Upload size={12} /> Submit Proof</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-white/30 text-sm">No winnings yet — good luck in the next draw!</p>}
            </div>
          </div>
        )}

        {/* ── Scores ── */}
        {activeTab === 'scores' && (
          <div className="animate-fade-in space-y-6">
            {/* Today's session */}
            <div className={`card ${submittedToday ? 'border-lime-400/20' : 'border-lime-400/10'}`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-semibold text-xl text-white">Today's Score Entry</h3>
                  <p className="text-white/40 text-sm mt-1">Submit all 5 scores to enter this month's draw</p>
                </div>
                {hasActiveSub && !submittedToday && (
                  <button onClick={() => setScoreModal({})} className="btn-primary text-sm py-2.5">
                    <Plus size={15} /> Add Score
                  </button>
                )}
              </div>

              {/* 5-slot progress */}
              <div className="flex gap-3 mb-4">
                {Array.from({ length: 5 }).map((_, i) => {
                  const s = todayScores?.[i];
                  return (
                    <div key={i} className={`flex-1 h-14 rounded-xl flex items-center justify-center border transition-all ${s ? 'bg-lime-400/10 border-lime-400/30 score-bubble' : 'bg-carbon-700 border-white/5 border-dashed'}`}>
                      {s ? <span className="font-mono font-bold text-lime-400 text-lg">{s.score}</span> : <span className="text-white/15 text-xl">·</span>}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <p className={`text-sm ${submittedToday ? 'text-lime-400 font-medium' : 'text-white/40'}`}>
                  {submittedToday ? '✓ Completed — entered in this month\'s draw' : `${scoresEnteredToday}/5 scores entered`}
                </p>
                {!submittedToday && scoresEnteredToday > 0 && (
                  <p className="text-white/30 text-xs">{scoresNeeded} more to complete entry</p>
                )}
              </div>
            </div>

            {/* Today's entered scores detail */}
            {todayScores?.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-white mb-4">Today's Entries</h3>
                <div className="space-y-2">
                  {todayScores.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-carbon-700 rounded-xl group">
                      <div className="flex items-center gap-3">
                        <span className="text-white/20 text-xs w-4">{i + 1}</span>
                        <div className="score-bubble w-10 h-10 text-base">{s.score}</div>
                        <div>
                          <p className="text-white text-sm">{s.course_name || 'Course not specified'}</p>
                          <p className="text-white/30 text-xs">{format(new Date(s.played_at), 'dd MMM yyyy')}</p>
                        </div>
                      </div>
                      {!submittedToday && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setScoreModal(s)} className="btn-ghost text-xs py-1 px-2"><Pencil size={12} /></button>
                          <button onClick={() => deleteScore(s.id)} className="btn-ghost text-xs py-1 px-2 text-red-400"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rolling 5 scores used for draw */}
            <div className="card">
              <h3 className="font-semibold text-white mb-2">Current Draw Scores (rolling latest 5)</h3>
              <p className="text-white/30 text-xs mb-4">These 5 scores are matched against the monthly draw numbers</p>
              {scores?.length ? (
                <div className="flex gap-3 flex-wrap">
                  {scores.map(s => <div key={s.id} className="score-bubble" title={format(new Date(s.played_at), 'dd MMM')}>{s.score}</div>)}
                </div>
              ) : <p className="text-white/30 text-sm">No scores yet</p>}
            </div>
          </div>
        )}

        {/* ── Winnings ── */}
        {activeTab === 'winnings' && (
          <div className="animate-fade-in space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div className="stat-card"><span className="stat-label">Total Won</span><span className="stat-value text-lime-400">₹{totalWon?.toFixed(2) || '0.00'}</span></div>
              <div className="stat-card"><span className="stat-label">Draw Entries</span><span className="stat-value">{winnings?.length || 0}</span></div>
            </div>
            {winnings?.length ? winnings.map(w => (
              <div key={w.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/10 flex items-center justify-center"><Trophy size={20} className="text-lime-400" /></div>
                    <div>
                      <p className="text-white font-semibold">{w.match_type} — ₹{Number(w.prize_amount).toFixed(2)}</p>
                      <p className="text-white/30 text-sm">Draw: {w.draws?.draw_date ? format(new Date(w.draws.draw_date), 'dd MMM yyyy') : '—'}</p>
                      {w.draws?.winning_numbers && <p className="text-white/20 text-xs mt-0.5">Numbers: [{w.draws.winning_numbers.join(', ')}]</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={w.status} />
                    {w.status === 'pending' && <button onClick={() => setProofModal(w)} className="btn-primary text-xs py-2 px-3"><Upload size={13} /> Submit Proof</button>}
                    {w.status === 'paid' && w.payment_reference && <span className="text-white/30 text-xs">Ref: {w.payment_reference}</span>}
                  </div>
                </div>
                {w.proof_url && <div className="mt-3 pt-3 border-t border-white/5"><a href={w.proof_url} target="_blank" rel="noopener noreferrer" className="text-lime-400 text-xs hover:underline">View submitted proof →</a></div>}
                {w.admin_note && <div className="mt-2 p-2 bg-carbon-700 rounded-lg"><p className="text-white/40 text-xs">Admin note: {w.admin_note}</p></div>}
              </div>
            )) : (
              <div className="card text-center py-16"><Trophy size={48} className="text-white/10 mx-auto mb-3" /><p className="text-white/30">No winnings yet — keep your scores updated!</p></div>
            )}
          </div>
        )}

        {/* ── Charity ── */}
        {activeTab === 'charity' && <CharityTab currentCharity={data?.user?.charities} currentPct={data?.user?.charity_percentage} onSave={fetchDashboard} />}

        {/* ── Credits ── */}
        {activeTab === 'credits' && <CreditsTab />}

        {/* ── Account ── */}
        {activeTab === 'account' && <AccountTab user={data?.user} subscription={subscription} onPortal={openPortal} onSave={fetchDashboard} />}
      </div>

      {scoreModal !== null && <ScoreModal score={scoreModal} onClose={() => setScoreModal(null)} onSave={fetchDashboard} />}
      {proofModal && <ProofModal result={proofModal} onClose={() => setProofModal(null)} onSave={fetchDashboard} />}
    </div>
  );
}

function CharityTab({ currentCharity, currentPct, onSave }) {
  const [charities, setCharities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pct, setPct] = useState(currentPct || 10);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/charities').then(r => setCharities(r.data.charities || [])); }, []);

  const handleSave = async () => {
    if (!selected) return toast.error('Select a charity first');
    setSaving(true);
    try { await api.patch('/users/charity', { charity_id: selected, charity_percentage: pct }); toast.success('Charity saved!'); onSave(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {currentCharity && (
        <div className="flex items-center gap-3 bg-lime-400/5 border border-lime-400/20 rounded-xl p-4">
          <CheckCircle size={16} className="text-lime-400" />
          <p className="text-white/70 text-sm">Currently supporting <strong className="text-lime-400">{currentCharity.name}</strong> with <strong>{currentPct}%</strong> of your subscription.</p>
        </div>
      )}
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-white mb-5">Choose a Charity</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-6 max-h-80 overflow-y-auto pr-1">
          {charities.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`text-left p-4 rounded-xl border transition-all ${selected === c.id ? 'border-lime-400/40 bg-lime-400/5' : 'border-white/5 bg-carbon-700 hover:border-white/20'}`}>
              <div className="flex items-start gap-3">
                <Heart size={15} className={`${selected === c.id ? 'text-lime-400' : 'text-white/20'} mt-0.5`} />
                <div><p className={`font-medium text-sm ${selected === c.id ? 'text-lime-400' : 'text-white'}`}>{c.name}</p><p className="text-white/30 text-xs line-clamp-2 mt-0.5">{c.description}</p></div>
              </div>
            </button>
          ))}
        </div>
        <div className="mb-6">
          <label className="label">Contribution: <span className="text-lime-400">{pct}%</span> of subscription</label>
          <input type="range" min={10} max={100} step={5} value={pct} onChange={e => setPct(+e.target.value)} className="w-full accent-lime-400 mt-2" />
          <div className="flex justify-between text-xs text-white/20 mt-1"><span>10% (min)</span><span>100%</span></div>
        </div>
        <button onClick={handleSave} disabled={saving || !selected} className="btn-primary py-3">
          {saving ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Save Charity'}
        </button>
      </div>
    </div>
  );
}

function CreditsTab() {
  const [creditData, setCreditData] = useState(null);
  useEffect(() => { api.get('/users/credits').then(r => setCreditData(r.data)).catch(() => {}); }, []);
  if (!creditData) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>;
  return (
    <div className="animate-fade-in space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card"><span className="stat-label">Current Balance</span><span className="stat-value text-lime-400">{creditData.credits}</span></div>
        <div className="stat-card"><span className="stat-label">Total Earned</span><span className="stat-value">{creditData.totalEarned}</span></div>
      </div>
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Credit History</h3>
        {creditData.history?.length ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {creditData.history.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white text-sm">{tx.description}</p>
                  <p className="text-white/30 text-xs">{tx.type.replace(/_/g, ' ')} · {format(new Date(tx.created_at), 'dd MMM yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${tx.amount > 0 ? 'text-lime-400' : 'text-red-400'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount}</p>
                  <p className="text-white/20 text-xs">bal: {tx.balance_after}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-white/30 text-sm">No credit transactions yet.</p>}
      </div>
    </div>
  );
}

function AccountTab({ user, subscription, onPortal, onSave }) {
  const [form, setForm] = useState({ full_name: user?.full_name || '', handicap: user?.handicap || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const updateProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.patch('/users/profile', { ...form, handicap: form.handicap ? +form.handicap : undefined }); toast.success('Profile updated'); onSave(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault(); setSavingPw(true);
    try { await api.post('/users/change-password', pwForm); toast.success('Password changed. Please log in again.'); setPwForm({ current_password: '', new_password: '' }); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSavingPw(false); }
  };

  return (
    <div className="animate-fade-in grid lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-white mb-5">Edit Profile</h3>
        <form onSubmit={updateProfile} className="space-y-4">
          <div><label className="label">Full Name</label><input type="text" className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required minLength={2} /></div>
          <div><label className="label">Handicap</label><input type="number" className="input" placeholder="e.g. 12.5" value={form.handicap} onChange={e => setForm({ ...form, handicap: e.target.value })} step="0.1" min="0" max="54" /></div>
          <div><label className="label">Phone</label><input type="tel" className="input" placeholder="+44..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <button type="submit" disabled={saving} className="btn-primary py-3">{saving ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Save Profile'}</button>
        </form>
      </div>
      <div className="space-y-5">
        <div className="card">
          <h3 className="font-display font-semibold text-lg text-white mb-4">Subscription</h3>
          {subscription ? (
            <div className="space-y-3">
              <div className="flex justify-between py-2.5 border-b border-white/5"><span className="text-white/40 text-sm">Plan</span><span className="text-white capitalize">{subscription.plan}</span></div>
              <div className="flex justify-between py-2.5 border-b border-white/5"><span className="text-white/40 text-sm">Status</span><StatusBadge status={subscription.status} /></div>
              <div className="flex justify-between py-2.5"><span className="text-white/40 text-sm">Renews</span><span className="text-white text-sm">{subscription.current_period_end ? format(new Date(subscription.current_period_end), 'dd MMM yyyy') : '—'}</span></div>
              <button onClick={onPortal} className="btn-outline w-full justify-center mt-3">Manage Billing</button>
            </div>
          ) : <div><p className="text-white/40 text-sm mb-3">No active subscription</p><Link to="/pricing" className="btn-primary text-sm py-2.5">Choose a Plan</Link></div>}
        </div>
        <div className="card">
          <h3 className="font-display font-semibold text-lg text-white mb-4">Change Password</h3>
          <form onSubmit={changePassword} className="space-y-4">
            <div><label className="label">Current Password</label><input type="password" className="input" value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} required /></div>
            <div><label className="label">New Password</label><input type="password" className="input" placeholder="Min 8 characters" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} required minLength={8} /></div>
            <button type="submit" disabled={savingPw} className="btn-primary py-3">{savingPw ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Update Password'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
