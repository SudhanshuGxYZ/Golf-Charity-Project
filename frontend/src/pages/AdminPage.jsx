import { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Trophy, Heart, BarChart2, Shield, RefreshCw, Plus, CheckCircle, XCircle, Coins, Settings, Bell, FileText, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../utils/api';

/* ── Sidebar ─────────────────────────────────────────────────── */
function Sidebar() {
  const links = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/draws', label: 'Draws', icon: Trophy },
    { to: '/admin/winners', label: 'Winners', icon: CheckCircle },
    { to: '/admin/charities', label: 'Charities', icon: Heart },
    { to: '/admin/config', label: 'Prize Config', icon: Settings },
    { to: '/admin/notify', label: 'Notifications', icon: Bell },
    { to: '/admin/reports', label: 'Reports', icon: BarChart2 },
    { to: '/admin/audit', label: 'Audit Log', icon: FileText },
  ];
  return (
    <aside className="w-52 shrink-0">
      <div className="sticky top-24">
        <div className="flex items-center gap-2 mb-5 px-2"><Shield size={15} className="text-lime-400" /><span className="text-white/40 text-xs font-semibold uppercase tracking-wider">Admin Panel</span></div>
        <nav className="space-y-0.5">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? 'bg-lime-400 text-carbon-950 font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

/* ── Overview ─────────────────────────────────────────────────── */
function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {}); }, []);
  const cards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, color: 'text-blue-400' },
    { label: 'Active Subscribers', value: stats.activeSubscriptions, color: 'text-lime-400' },
      { label: 'Monthly Revenue', value: `₹${stats.monthlyRevenue?.toFixed(2)}`, color: 'text-green-400' },
      { label: 'Prize Pool', value: `₹${stats.estimatedPrizePool?.toFixed(2)}`, color: 'text-yellow-400' },
      { label: 'Jackpot Rollover', value: `₹${stats.jackpotRollover?.toFixed(2) || '0.00'}`, color: 'text-orange-400' },
      { label: 'Charity Contributed', value: `₹${stats.totalCharityContributed?.toFixed(2)}`, color: 'text-red-400' },
    { label: 'Score Sessions', value: stats.totalScoreSessions, color: 'text-purple-400' },
    { label: 'Pending Verifications', value: stats.pendingVerifications, color: 'text-pink-400' },
  ] : [];
  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-white mb-8">Overview</h1>
      {stats ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map((c, i) => (<div key={i} className="card"><p className="text-white/40 text-xs mb-2">{c.label}</p><p className={`text-3xl font-display font-bold ${c.color}`}>{c.value}</p></div>))}</div>
        : <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>}
    </div>
  );
}

/* ── Users ────────────────────────────────────────────────────── */
function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedData, setExpandedData] = useState({});
  const [creditForm, setCreditForm] = useState({});
  const [fundForm, setFundForm] = useState({});
  const [subForm, setSubForm] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users?search=${search}&limit=50`);
      setUsers(data.users || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { const t = setTimeout(fetchUsers, 300); return () => clearTimeout(t); }, [search]);

  const loadUserDetail = async (id) => {
    if (expandedUser === id) { setExpandedUser(null); return; }
    setExpandedUser(id);
    if (!expandedData[id]) {
      try {
        const { data } = await api.get(`/admin/users/${id}`);
        setExpandedData(prev => ({ ...prev, [id]: data }));
      } catch (err) {
        toast.error(err.response?.data?.error || 'Unable to load user details');
      }
    }
  };

  const toggleActive = async (u) => {
    try { await api.patch(`/admin/users/${u.id}`, { is_active: !u.is_active }); toast.success(u.is_active ? 'User suspended' : 'User restored'); fetchUsers(); }
    catch { toast.error('Failed'); }
  };

  const grantCredits = async (userId) => {
    const f = creditForm[userId] || {};
    if (!f.amount || !f.description) return toast.error('Amount and description required');
    try {
      const { data } = await api.post(`/admin/users/${userId}/credits`, { amount: +f.amount, description: f.description });
      toast.success(`Credits adjusted. New balance: ${data.balance}`);
      setCreditForm(prev => ({ ...prev, [userId]: {} }));
      loadUserDetail(userId);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const addFunds = async (userId) => {
    const f = fundForm[userId] || {};
    if (!f.amount || !f.description) return toast.error('Amount and description required');
    try {
      await api.post(`/admin/users/${userId}/funds`, { amount: parseFloat(f.amount), description: f.description });
      toast.success('Fund transaction completed');
      setFundForm(prev => ({ ...prev, [userId]: {} }));
      loadUserDetail(userId);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const activateSubscription = async (userId) => {
    const f = subForm[userId] || { plan: 'monthly' };
    if (!['monthly', 'yearly'].includes(f.plan)) return toast.error('Invalid plan');
    try {
      await api.post(`/admin/users/${userId}/subscription/activate`, { plan: f.plan });
      toast.success('Subscription activated');
      setSubForm(prev => ({ ...prev, [userId]: {} }));
      loadUserDetail(userId);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const updateSubscription = async (subId, updates) => {
    try {
      await api.patch(`/admin/subscriptions/${subId}`, updates);
      toast.success('Subscription updated');
      loadUserDetail(expandedUser);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const toggleUnlimited = async (userId, currentState) => {
    try {
      await api.post(`/admin/users/${userId}/unlimited`, { enable: !currentState });
      toast.success(currentState ? 'Unlimited disabled' : 'Unlimited enabled');
      loadUserDetail(userId);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const editScore = async (scoreId, newScore) => {
    const val = parseInt(newScore);
    if (!val || val < 1 || val > 45) return toast.error('Score must be 1-45');
    try { await api.put(`/admin/scores/${scoreId}`, { score: val }); toast.success('Score updated'); loadUserDetail(expandedUser); }
    catch { toast.error('Failed'); }
  };

  const deleteScore = async (scoreId) => {
    if (!confirm('Delete this score?')) return;
    try { await api.delete(`/admin/scores/${scoreId}`); toast.success('Score deleted'); loadUserDetail(expandedUser); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-white mb-6">Users</h1>
      <input type="text" className="input mb-6 max-w-sm" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="card border-white/5 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer" onClick={() => loadUserDetail(u.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-lime-400/10 flex items-center justify-center text-lime-400 font-bold text-sm shrink-0">{u.full_name?.[0]?.toUpperCase()}</div>
                  <div>
                    <p className="text-white font-medium text-sm">{u.full_name}</p>
                    <p className="text-white/30 text-xs">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-neutral'}`}>{u.role}</span>
                  <span className={`badge ${u.subscriptions?.[0]?.status === 'active' ? 'badge-active' : 'badge-neutral'}`}>{u.subscriptions?.[0]?.status || 'no sub'}</span>
                  <span className="text-lime-400/60 text-xs">{u.credits} credits</span>
                  <span className="text-white/20">{u.last_score_submission_date ? `Last score: ${u.last_score_submission_date}` : 'No scores'}</span>
                  {expandedUser === u.id ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                </div>
              </div>

              {expandedUser === u.id && (
                <div className="mt-5 pt-5 border-t border-white/5 animate-fade-in space-y-5">
                  {/* Quick actions */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => toggleActive(u)} className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${u.is_active ? 'border-red-400/20 text-red-400 hover:bg-red-400/5' : 'border-lime-400/20 text-lime-400 hover:bg-lime-400/5'}`}>
                      {u.is_active ? 'Suspend User' : 'Restore User'}
                    </button>
                  </div>

                  {/* Subscription Management */}
                  <div className="bg-carbon-700/30 border border-white/5 rounded-lg p-3">
                    <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2 flex items-center gap-1"><Shield size={12} /> Subscription</p>
                    {u.subscriptions?.[0]?.status === 'active' ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <select value={u.subscriptions[0].plan} onChange={e => updateSubscription(u.subscriptions[0].id, { plan: e.target.value })} className="input py-1.5 text-sm max-w-[120px]">
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="unlimited">Unlimited</option>
                          </select>
                          <button onClick={() => deactivateSubscription(u.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/5 transition-colors">
                            Deactivate
                          </button>
                          <button onClick={() => toggleUnlimited(u.id, u.subscriptions[0].plan === 'unlimited')} className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${u.subscriptions[0].plan === 'unlimited' ? 'border-orange-400/20 text-orange-400 hover:bg-orange-400/5' : 'border-lime-400/20 text-lime-400 hover:bg-lime-400/5'}`}>
                            {u.subscriptions[0].plan === 'unlimited' ? 'Disable Unlimited' : 'Enable Unlimited'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <select value={subForm[u.id]?.plan || 'monthly'} onChange={e => setSubForm(prev => ({ ...prev, [u.id]: { ...prev[u.id], plan: e.target.value } }))} className="input py-1.5 text-sm max-w-[120px]">
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                          <option value="unlimited">Unlimited</option>
                        </select>
                        <button onClick={() => activateSubscription(u.id)} className="btn-primary text-xs py-1.5 px-3">Activate</button>
                      </div>
                    )}
                  </div>

                  {/* Credits management */}
                  <div className="bg-carbon-700/30 border border-white/5 rounded-lg p-3">
                    <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2 flex items-center gap-1"><Coins size={12} /> Credits (balance: <span className="text-lime-400">{u.credits}</span>)</p>
                    <div className="flex flex-wrap gap-2">
                      <input type="number" className="input max-w-[100px] py-1.5 text-sm" placeholder="Amount" value={creditForm[u.id]?.amount || ''} onChange={e => setCreditForm(prev => ({ ...prev, [u.id]: { ...prev[u.id], amount: e.target.value } }))} />
                      <input type="text" className="input flex-1 min-w-[160px] py-1.5 text-sm" placeholder="Description" value={creditForm[u.id]?.description || ''} onChange={e => setCreditForm(prev => ({ ...prev, [u.id]: { ...prev[u.id], description: e.target.value } }))} />
                      <button onClick={() => grantCredits(u.id)} className="btn-primary text-xs py-1.5 px-3">Apply</button>
                    </div>
                    <p className="text-white/20 text-xs mt-1">Positive = grant, negative = deduct</p>
                  </div>

                  {/* Funds Management */}
                  <div className="bg-carbon-700/30 border border-white/5 rounded-lg p-3">
                    <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">💷 Funds / Money</p>
                    <div className="flex flex-wrap gap-2">
                      <input type="number" step="0.01" className="input max-w-[100px] py-1.5 text-sm" placeholder="₹ Amount" value={fundForm[u.id]?.amount || ''} onChange={e => setFundForm(prev => ({ ...prev, [u.id]: { ...prev[u.id], amount: e.target.value } }))} />
                      <input type="text" className="input flex-1 min-w-[160px] py-1.5 text-sm" placeholder="Description" value={fundForm[u.id]?.description || ''} onChange={e => setFundForm(prev => ({ ...prev, [u.id]: { ...prev[u.id], description: e.target.value } }))} />
                      <button onClick={() => addFunds(u.id)} className="btn-primary text-xs py-1.5 px-3">Apply</button>
                    </div>
                    <p className="text-white/20 text-xs mt-1">Add or deduct funds from user account</p>
                  </div>

                  {/* Scores */}
                  {expandedData[u.id]?.scores?.length > 0 && (
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2">Scores</p>
                      <div className="space-y-1">
                        {expandedData[u.id].scores.slice(0, 10).map(s => (
                          <div key={s.id} className="flex items-center justify-between p-2 bg-carbon-700 rounded-lg group">
                            <div className="flex items-center gap-3">
                              <span className="score-bubble w-9 h-9 text-sm">{s.score}</span>
                              <span className="text-white/40 text-xs">{s.played_at} {s.course_name ? `· ${s.course_name}` : ''}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { const v = prompt('New score (1-45):', s.score); if (v) editScore(s.id, v); }} className="btn-ghost text-xs py-1 px-2"><Pencil size={11} /></button>
                              <button onClick={() => deleteScore(s.id)} className="btn-ghost text-xs py-1 px-2 text-red-400">✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Winnings */}
                  {expandedData[u.id]?.winnings?.length > 0 && (
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2">Win History</p>
                      <div className="space-y-1">
                        {expandedData[u.id].winnings.map(w => (
                          <div key={w.id} className="flex items-center justify-between p-2 bg-carbon-700 rounded-lg text-xs">
                  <span className="text-white">{w.match_type} — ₹{Number(w.prize_amount).toFixed(2)}</span>
                            <span className={`badge ${w.status === 'paid' ? 'badge-active' : w.status === 'rejected' ? 'badge-error' : 'badge-neutral'}`}>{w.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Credit history */}
                  {expandedData[u.id]?.credits?.length > 0 && (
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2">Credit History</p>
                      <div className="space-y-1">
                        {expandedData[u.id].credits.slice(0, 5).map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-2 bg-carbon-700 rounded-lg text-xs">
                            <span className="text-white/60">{tx.description}</span>
                            <span className={tx.amount > 0 ? 'text-lime-400' : 'text-red-400'}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Draws ────────────────────────────────────────────────────── */
function AdminDraws() {
  const [draws, setDraws] = useState([]);
  const [sim, setSim] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [method, setMethod] = useState('random');
  const [newDate, setNewDate] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchDraws = async () => { const { data } = await api.get('/admin/draws'); setDraws(data.draws || []); };
  useEffect(() => { fetchDraws(); }, []);

  const simulate = async () => {
    setSimLoading(true); setSim(null);
    try { const { data } = await api.post('/admin/draws/simulate', { method }); setSim(data); }
    catch { toast.error('Simulation failed'); }
    finally { setSimLoading(false); }
  };

  const createDraw = async () => {
    if (!newDate) return toast.error('Pick a date');
    setCreating(true);
    try { await api.post('/admin/draws/create', { draw_date: newDate, method }); toast.success('Draw created!'); setNewDate(''); fetchDraws(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setCreating(false); }
  };

  const executeDraw = async (id) => {
    if (!confirm('Execute and publish this draw? This will notify all eligible players.')) return;
    try { await api.post(`/admin/draws/${id}/execute`); toast.success('Draw executed!'); fetchDraws(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to execute'); }
  };

  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-3xl text-white">Draw Management</h1>

      {/* Simulate */}
      <div className="card border-lime-400/10">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><RefreshCw size={15} className="text-lime-400" /> Simulate Draw</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <select className="input max-w-xs" value={method} onChange={e => setMethod(e.target.value)}>
            <option value="random">Random</option>
            <option value="algorithmic">Algorithmic (inverse frequency)</option>
          </select>
          <button onClick={simulate} disabled={simLoading} className="btn-outline">
            {simLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Run Simulation'}
          </button>
        </div>
        {sim && (
          <div className="bg-carbon-700 rounded-xl p-4 animate-fade-in">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Simulated Numbers</p>
            <div className="flex gap-2 mb-3">{sim.numbers.map((n, i) => (<div key={i} className="w-11 h-11 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center font-mono font-bold text-lime-400">{n}</div>))}</div>
            <div className="flex gap-5 text-sm">
              <span className="text-white/40">5-match: <span className="text-lime-400 font-bold">{sim.projectedMatches.five}</span></span>
              <span className="text-white/40">4-match: <span className="text-blue-400 font-bold">{sim.projectedMatches.four}</span></span>
              <span className="text-white/40">3-match: <span className="text-purple-400 font-bold">{sim.projectedMatches.three}</span></span>
              <span className="text-white/40">Eligible: <span className="text-white font-bold">{sim.totalEligible}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Create */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Plus size={15} className="text-lime-400" /> Create New Draw</h3>
        <div className="flex flex-wrap gap-3">
          <input type="date" className="input max-w-xs" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
          <select className="input max-w-xs" value={method} onChange={e => setMethod(e.target.value)}>
            <option value="random">Random</option>
            <option value="algorithmic">Algorithmic</option>
          </select>
          <button onClick={createDraw} disabled={creating} className="btn-primary">
            {creating ? <span className="w-4 h-4 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Create Draw'}
          </button>
        </div>
      </div>

      {/* List */}
      <div>
        <h3 className="font-semibold text-white mb-4">All Draws</h3>
        <div className="space-y-3">
          {draws.map(d => (
            <div key={d.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-white font-medium">{d.draw_month} — {format(new Date(d.draw_date), 'dd MMM yyyy')}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`badge ${d.status === 'published' ? 'badge-active' : d.status === 'pending' ? 'badge-warning' : 'badge-error'}`}>{d.status}</span>
                  <span className="text-white/20 text-xs">{d.method} · {d.participants_count || 0} participants</span>
                </div>
                {d.winning_numbers && (
                  <div className="flex gap-1.5 mt-2">{d.winning_numbers.map((n, i) => (<span key={i} className="w-8 h-8 rounded-lg bg-lime-400/10 border border-lime-400/10 flex items-center justify-center font-mono text-lime-400 text-xs font-bold">{n}</span>))}</div>
                )}
                {d.total_pool && <p className="text-white/30 text-xs mt-1">Pool: ₹{Number(d.total_pool).toFixed(2)} · Winners: {d.winner_count} · Rollover: ₹{Number(d.jackpot_rollover || 0).toFixed(2)}</p>}
              </div>
              {d.status === 'pending' && (
                <button onClick={() => executeDraw(d.id)} className="btn-primary text-sm py-2 px-4 shrink-0">Execute & Publish</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Winners ──────────────────────────────────────────────────── */
function AdminWinners() {
  const [winners, setWinners] = useState([]);
  const [filter, setFilter] = useState('');
  const [payRef, setPayRef] = useState({});

  const fetch = async () => { const { data } = await api.get(`/admin/winners${filter ? `?status=${filter}` : ''}`); setWinners(data.winners || []); };
  useEffect(() => { fetch(); }, [filter]);

  const act = async (id, action, note = '') => {
    const ref = action === 'mark_paid' ? payRef[id] : undefined;
    try { await api.patch(`/admin/winners/${id}`, { action, admin_note: note, payment_reference: ref }); toast.success('Updated'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const statuses = ['', 'pending', 'under_review', 'approved', 'rejected', 'paid'];

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-white mb-6">Winner Verification</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg text-sm transition-all ${filter === s ? 'bg-lime-400 text-carbon-950 font-semibold' : 'bg-carbon-800 text-white/40 hover:text-white'}`}>{s || 'All'}</button>
        ))}
      </div>
      <div className="space-y-4">
        {winners.map(w => (
          <div key={w.id} className="card">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-white font-semibold">{w.users?.full_name} — {w.match_type}</p>
                <p className="text-white/30 text-sm">{w.users?.email}</p>
                <p className="text-white/40 text-xs mt-1">
                  Draw: {w.draws?.draw_month || '—'} · Prize: <span className="text-lime-400 font-semibold">₹{Number(w.prize_amount).toFixed(2)}</span>
                  {w.draws?.winning_numbers && <span className="ml-2">Numbers: [{w.draws.winning_numbers.join(', ')}]</span>}
                </p>
                {w.proof_url && <a href={w.proof_url} target="_blank" rel="noopener noreferrer" className="text-lime-400 text-xs hover:underline mt-1 inline-block">View proof screenshot →</a>}
                {w.admin_note && <p className="text-white/30 text-xs mt-1">Note: {w.admin_note}</p>}
                {w.payment_reference && <p className="text-white/30 text-xs">Payment ref: {w.payment_reference}</p>}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <span className={`badge ${w.status === 'paid' || w.status === 'approved' ? 'badge-active' : w.status === 'rejected' ? 'badge-error' : w.status === 'under_review' ? 'badge-warning' : 'badge-neutral'}`}>{w.status?.replace('_', ' ')}</span>
                {w.status === 'under_review' && (
                  <div className="flex gap-2">
                    <button onClick={() => act(w.id, 'approve')} className="btn-primary text-xs py-1.5 px-3"><CheckCircle size={12} /> Approve</button>
                    <button onClick={() => { const note = prompt('Rejection reason:'); if (note !== null) act(w.id, 'reject', note); }} className="bg-red-400/10 border border-red-400/20 text-red-400 text-xs py-1.5 px-3 rounded-lg hover:bg-red-400/20 transition-colors flex items-center gap-1"><XCircle size={12} /> Reject</button>
                  </div>
                )}
                {w.status === 'approved' && (
                  <div className="flex gap-2 items-center">
                    <input type="text" className="input py-1.5 text-xs max-w-[140px]" placeholder="Payment ref..." value={payRef[w.id] || ''} onChange={e => setPayRef(p => ({ ...p, [w.id]: e.target.value }))} />
                    <button onClick={() => act(w.id, 'mark_paid')} className="btn-primary text-xs py-1.5 px-3">Mark Paid</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {winners.length === 0 && <div className="card text-center py-12"><p className="text-white/30">No winners found.</p></div>}
      </div>
    </div>
  );
}

/* ── Charities ────────────────────────────────────────────────── */
function AdminCharities() {
  const [charities, setCharities] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', long_description: '', category: '', website: '', registration_number: '', is_featured: false, sort_order: 99 });
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [eventForms, setEventForms] = useState({});

  const fetch = async () => { const { data } = await api.get('/admin/charities'); setCharities(data.charities || []); };
  useEffect(() => { fetch(); }, []);

  const create = async (e) => {
    e.preventDefault(); setCreating(true);
    try { await api.post('/admin/charities', form); toast.success('Charity created!'); setForm({ name: '', description: '', long_description: '', category: '', website: '', registration_number: '', is_featured: false, sort_order: 99 }); setShowForm(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setCreating(false); }
  };

  const toggleActive = async (c) => {
    try { await api.put(`/admin/charities/${c.id}`, { is_active: !c.is_active }); toast.success(`Charity ${c.is_active ? 'deactivated' : 'activated'}`); fetch(); }
    catch { toast.error('Failed'); }
  };

  const toggleFeatured = async (c) => {
    try { await api.put(`/admin/charities/${c.id}`, { is_featured: !c.is_featured }); fetch(); }
    catch { toast.error('Failed'); }
  };

  const addEvent = async (charityId) => {
    const ef = eventForms[charityId] || {};
    if (!ef.title || !ef.event_date) return toast.error('Title and date required');
    try { await api.post(`/admin/charities/${charityId}/events`, ef); toast.success('Event added!'); setEventForms(p => ({ ...p, [charityId]: {} })); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-3xl text-white">Charities</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2.5"><Plus size={14} /> Add Charity</button>
      </div>

      {showForm && (
        <div className="card border-lime-400/10 mb-6 animate-slide-up">
          <h3 className="font-semibold text-white mb-4">New Charity</h3>
          <form onSubmit={create} className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Name *</label><input type="text" className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Category</label><input type="text" className="input" placeholder="Health, Community..." value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Short Description *</label><textarea className="input" rows={2} required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Long Description</label><textarea className="input" rows={3} value={form.long_description} onChange={e => setForm({ ...form, long_description: e.target.value })} /></div>
            <div><label className="label">Website URL</label><input type="url" className="input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
            <div><label className="label">Charity Reg. No.</label><input type="text" className="input" value={form.registration_number} onChange={e => setForm({ ...form, registration_number: e.target.value })} /></div>
            <div><label className="label">Sort Order</label><input type="number" className="input" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: +e.target.value })} /></div>
            <div className="flex items-center gap-3 mt-4"><input type="checkbox" id="ft" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} className="accent-lime-400" /><label htmlFor="ft" className="text-white/60 text-sm">Featured charity</label></div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary">{creating ? <span className="w-4 h-4 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Create Charity'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {charities.map(c => (
          <div key={c.id} className={`card transition-all ${!c.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium">{c.name}</p>
                  {c.is_featured && <span className="badge-active text-[10px]">Featured</span>}
                  {!c.is_active && <span className="badge-error text-[10px]">Inactive</span>}
                  {c.category && <span className="badge-neutral text-[10px]">{c.category}</span>}
                </div>
                <p className="text-white/30 text-xs mt-0.5">{c.registration_number ? `Reg: ${c.registration_number}` : ''}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <button onClick={() => toggleFeatured(c)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${c.is_featured ? 'border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/5' : 'border-white/10 text-white/40 hover:text-white'}`}>
                  {c.is_featured ? 'Unfeature' : 'Feature'}
                </button>
                <button onClick={() => toggleActive(c)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${c.is_active ? 'border-red-400/20 text-red-400 hover:bg-red-400/5' : 'border-lime-400/20 text-lime-400 hover:bg-lime-400/5'}`}>
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>

            {/* Add event */}
            {c.is_active && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-white/40 text-xs mb-2">Add Event</p>
                <div className="flex flex-wrap gap-2">
                  <input type="text" className="input flex-1 min-w-[140px] py-2 text-xs" placeholder="Event title" value={eventForms[c.id]?.title || ''} onChange={e => setEventForms(p => ({ ...p, [c.id]: { ...p[c.id], title: e.target.value } }))} />
                  <input type="datetime-local" className="input max-w-[180px] py-2 text-xs" value={eventForms[c.id]?.event_date || ''} onChange={e => setEventForms(p => ({ ...p, [c.id]: { ...p[c.id], event_date: e.target.value } }))} />
                  <input type="text" className="input max-w-[140px] py-2 text-xs" placeholder="Location" value={eventForms[c.id]?.location || ''} onChange={e => setEventForms(p => ({ ...p, [c.id]: { ...p[c.id], location: e.target.value } }))} />
                  <button onClick={() => addEvent(c.id)} className="btn-primary text-xs py-2 px-3">Add Event</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Prize Pool Config ────────────────────────────────────────── */
function PrizeConfig() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/config/prize-pool').then(r => { setConfig(r.data.config); setForm(r.data.config); }).catch(() => {});
  }, []);

  const sum = (+form.five_match_pct || 0) + (+form.four_match_pct || 0) + (+form.three_match_pct || 0);

  const save = async () => {
    if (Math.abs(sum - 100) > 0.01) return toast.error(`Match percentages must sum to 100 (currently ${sum})`);
    setSaving(true);
    try { const { data } = await api.put('/admin/config/prize-pool', form); setConfig(data.config); setForm(data.config); toast.success('Config saved!'); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  if (!config) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-3xl text-white mb-8">Prize Pool Configuration</h1>
      <div className="card space-y-5">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-3">Match Prize Distribution (must sum to 100%)</p>
          <div className="grid grid-cols-3 gap-4">
            {[['five_match_pct', '5-Match (Jackpot)'], ['four_match_pct', '4-Match'], ['three_match_pct', '3-Match']].map(([key, label]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="relative"><input type="number" className="input pr-7" step="0.01" min="0" max="100" value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span></div>
              </div>
            ))}
          </div>
          <p className={`text-xs mt-2 ${Math.abs(sum - 100) > 0.01 ? 'text-red-400' : 'text-lime-400'}`}>Sum: {sum}% {Math.abs(sum - 100) > 0.01 ? '⚠ must be 100%' : '✓'}</p>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-3">Revenue Split</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Pool % from subscriptions</label><div className="relative"><input type="number" className="input pr-7" step="0.01" value={form.subscription_pool_pct || ''} onChange={e => setForm(p => ({ ...p, subscription_pool_pct: e.target.value }))} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span></div></div>
            <div><label className="label">Minimum charity %</label><div className="relative"><input type="number" className="input pr-7" step="0.01" value={form.charity_min_pct || ''} onChange={e => setForm(p => ({ ...p, charity_min_pct: e.target.value }))} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">%</span></div></div>
          </div>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-3">Subscription Prices</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Monthly Price (₹)</label><input type="number" className="input" step="0.01" value={form.monthly_price || ''} onChange={e => setForm(p => ({ ...p, monthly_price: e.target.value }))} /></div>
            <div><label className="label">Yearly Price (₹)</label><input type="number" className="input" step="0.01" value={form.yearly_price || ''} onChange={e => setForm(p => ({ ...p, yearly_price: e.target.value }))} /></div>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary py-3">
          {saving ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

/* ── Broadcast Notifications ──────────────────────────────────── */
function AdminNotify() {
  const [form, setForm] = useState({ title: '', message: '', user_ids_text: '' });
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!form.title || !form.message) return toast.error('Title and message required');
    const user_ids = form.user_ids_text.trim() ? form.user_ids_text.split(',').map(s => s.trim()).filter(Boolean) : [];
    setSending(true);
    try { const { data } = await api.post('/admin/notifications/broadcast', { title: form.title, message: form.message, user_ids }); toast.success(data.message); setForm({ title: '', message: '', user_ids_text: '' }); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSending(false); }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-bold text-3xl text-white mb-8">Send Notification</h1>
      <div className="card space-y-5">
        <div><label className="label">Title</label><input type="text" className="input" placeholder="Notification title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">Message</label><textarea className="input" rows={4} placeholder="Notification message..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
        <div>
          <label className="label">Target User IDs <span className="text-white/20">(comma-separated, leave blank for all active subscribers)</span></label>
          <input type="text" className="input" placeholder="uuid1, uuid2, ... or leave blank for broadcast" value={form.user_ids_text} onChange={e => setForm({ ...form, user_ids_text: e.target.value })} />
        </div>
        <button onClick={send} disabled={sending} className="btn-primary py-3">
          {sending ? <span className="w-5 h-5 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Send Notification'}
        </button>
      </div>
    </div>
  );
}

/* ── Reports ──────────────────────────────────────────────────── */
function Reports() {
  const [data, setData] = useState(null);
  const [contribs, setContribs] = useState([]);
  useEffect(() => {
    api.get('/admin/reports/overview').then(r => setData(r.data)).catch(() => {});
    api.get('/admin/reports/charity-contributions').then(r => setContribs(r.data.contributions || [])).catch(() => {});
  }, []);
  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-white mb-8">Reports</h1>
      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="card"><p className="stat-label">Monthly subscribers</p><p className="stat-value">{data.subscriptionsByPlan.monthly}</p></div>
            <div className="card"><p className="stat-label">Yearly subscribers</p><p className="stat-value">{data.subscriptionsByPlan.yearly}</p></div>
            <div className="card"><p className="stat-label">Total contributed</p><p className="stat-value text-lime-400">₹{Number(data.totalContributions).toFixed(2)}</p></div>
          </div>
          {data.charityLeaderboard?.length > 0 && (
            <div className="card mb-6">
              <h3 className="font-semibold text-white mb-4">Charity Leaderboard</h3>
              <div className="space-y-2">
                {data.charityLeaderboard.map(([name, amt], i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3"><span className="text-white/20 text-sm font-mono">{i + 1}</span><span className="text-white text-sm">{name}</span></div>
                    <span className="text-lime-400 font-semibold">₹{Number(amt).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Recent Charity Contributions</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {contribs.map((c, i) => (
            <div key={i} className="flex justify-between py-2.5 border-b border-white/5 last:border-0">
              <div><p className="text-white text-sm">{c.charities?.name}</p><p className="text-white/30 text-xs">{c.users?.email} · {c.type}</p></div>
              <div className="text-right"><p className="text-lime-400 font-semibold text-sm">₹{Number(c.amount).toFixed(2)}</p><p className="text-white/20 text-xs">{format(new Date(c.created_at), 'dd MMM yyyy')}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Audit Log ────────────────────────────────────────────────── */
function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get(`/admin/audit-log?page=${page}&limit=30${filter ? `&action=${filter}` : ''}`)
      .then(r => { setLogs(r.data.logs || []); setTotal(r.data.total || 0); }).catch(() => {});
  }, [page, filter]);

  const actions = ['', 'update_user', 'grant_credits', 'deduct_credits', 'edit_score', 'delete_score', 'create_draw', 'execute_draw', 'winner_approve', 'winner_reject', 'winner_mark_paid', 'create_charity', 'update_charity', 'update_prize_config', 'update_subscription', 'broadcast_notification'];

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-white mb-6">Audit Log</h1>
      <div className="flex gap-3 mb-6 flex-wrap">
        <select className="input max-w-xs" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
          {actions.map(a => <option key={a} value={a}>{a || 'All Actions'}</option>)}
        </select>
        <span className="text-white/30 text-sm self-center">{total} entries</span>
      </div>
      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="card py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium">{log.action.replace(/_/g, ' ')}</span>
                  {log.target_type && <span className="badge-neutral text-[10px]">{log.target_type}</span>}
                </div>
                <p className="text-white/30 text-xs mt-0.5">by {log.users?.email || 'unknown'}</p>
              </div>
            </div>
            <span className="text-white/20 text-xs shrink-0">{format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}</span>
          </div>
        ))}
      </div>
      {total > 30 && (
        <div className="flex gap-3 mt-6 justify-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline py-2 px-4 text-sm">Previous</button>
          <span className="text-white/30 self-center text-sm">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 30 >= total} className="btn-outline py-2 px-4 text-sm">Next</button>
        </div>
      )}
    </div>
  );
}

/* ── Admin Shell ──────────────────────────────────────────────── */
export default function AdminPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto flex gap-8">
        <Sidebar />
        <div className="flex-1 min-w-0 animate-fade-in">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="draws" element={<AdminDraws />} />
            <Route path="winners" element={<AdminWinners />} />
            <Route path="charities" element={<AdminCharities />} />
            <Route path="config" element={<PrizeConfig />} />
            <Route path="notify" element={<AdminNotify />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit" element={<AuditLog />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
