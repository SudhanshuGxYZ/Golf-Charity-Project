import { useState, useEffect } from 'react';
import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Trophy, Heart, Calendar, BarChart2,
  Play, RefreshCw, CheckCircle, XCircle, ChevronRight, Plus,
  Shield, AlertTriangle, TrendingUp, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../utils/api';

/* ── Sidebar ─────────────────────────────────────────────── */
function AdminSidebar() {
  const links = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/draws', label: 'Draws', icon: Trophy },
    { to: '/admin/winners', label: 'Winners', icon: CheckCircle },
    { to: '/admin/charities', label: 'Charities', icon: Heart },
    { to: '/admin/reports', label: 'Reports', icon: BarChart2 },
  ];

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-24">
        <div className="flex items-center gap-2 mb-6 px-2">
          <Shield size={16} className="text-lime-400" />
          <span className="text-white/60 text-sm font-semibold uppercase tracking-wider">Admin</span>
        </div>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? 'bg-lime-400 text-carbon-950 font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

/* ── Overview ────────────────────────────────────────────── */
function AdminOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const cards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, colour: 'text-blue-400' },
    { label: 'Active Subscribers', value: stats.activeSubscriptions, icon: TrendingUp, colour: 'text-lime-400' },
    { label: 'Monthly Revenue', value: `£${stats.monthlyRevenue?.toFixed(2)}`, icon: DollarSign, colour: 'text-green-400' },
    { label: 'Prize Pool', value: `£${stats.estimatedPrizePool?.toFixed(2)}`, icon: Trophy, colour: 'text-yellow-400' },
    { label: 'Charity Contributed', value: `£${stats.totalCharityContributed?.toFixed(2)}`, icon: Heart, colour: 'text-red-400' },
    { label: 'Pending Verifications', value: stats.pendingVerifications, icon: AlertTriangle, colour: 'text-orange-400' },
  ] : [];

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-white mb-8">Admin Overview</h1>
      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <div key={i} className="card">
              <div className="flex items-center gap-2 mb-3">
                <c.icon size={16} className={c.colour} />
                <span className="text-white/40 text-sm">{c.label}</span>
              </div>
              <div className="text-3xl font-display font-bold text-white">{c.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/* ── Users ───────────────────────────────────────────────── */
function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users?search=${search}&limit=50`);
      setUsers(data.users || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggleActive = async (user) => {
    try {
      await api.patch(`/admin/users/${user.id}`, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? 'suspended' : 'restored'}`);
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-white mb-6">Users</h1>
      <input type="text" className="input mb-6 max-w-sm" placeholder="Search users..."
        value={search} onChange={e => setSearch(e.target.value)} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-lime-400/10 flex items-center justify-center text-lime-400 font-bold text-sm shrink-0">
                  {u.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{u.full_name}</p>
                  <p className="text-white/30 text-xs">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-neutral'}`}>{u.role}</span>
                <span className={`badge ${u.subscriptions?.[0]?.status === 'active' ? 'badge-active' : 'badge-neutral'}`}>
                  {u.subscriptions?.[0]?.status || 'no sub'}
                </span>
                <span className="text-white/20">{format(new Date(u.created_at), 'dd MMM yyyy')}</span>
                <button
                  onClick={() => toggleActive(u)}
                  className={`btn-ghost text-xs py-1 px-2 ${u.is_active ? 'text-red-400' : 'text-lime-400'}`}
                >
                  {u.is_active ? 'Suspend' : 'Restore'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Draws ───────────────────────────────────────────────── */
function AdminDraws() {
  const [draws, setDraws] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [simMethod, setSimMethod] = useState('random');
  const [simLoading, setSimLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDrawDate, setNewDrawDate] = useState('');

  const fetchDraws = async () => {
    const { data } = await api.get('/admin/draws');
    setDraws(data.draws || []);
  };

  useEffect(() => { fetchDraws(); }, []);

  const simulate = async () => {
    setSimLoading(true);
    setSimulation(null);
    try {
      const { data } = await api.post('/draws/simulate', { method: simMethod });
      setSimulation(data);
    } catch { toast.error('Simulation failed'); }
    finally { setSimLoading(false); }
  };

  const createDraw = async () => {
    if (!newDrawDate) return toast.error('Pick a draw date');
    setCreating(true);
    try {
      await api.post('/draws/create', { draw_date: newDrawDate, method: simMethod });
      toast.success('Draw created!');
      setNewDrawDate('');
      fetchDraws();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setCreating(false); }
  };

  const executeDraw = async (id) => {
    if (!confirm('This will publish the draw and notify winners. Continue?')) return;
    try {
      await api.post(`/draws/${id}/execute`);
      toast.success('Draw executed and published!');
      fetchDraws();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-8">
      <h1 className="font-display font-bold text-3xl text-white">Draw Management</h1>

      {/* Simulation panel */}
      <div className="card border-lime-400/10">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <RefreshCw size={16} className="text-lime-400" /> Simulate Draw
        </h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <select className="input max-w-xs" value={simMethod} onChange={e => setSimMethod(e.target.value)}>
            <option value="random">Random</option>
            <option value="algorithmic">Algorithmic (inverse frequency)</option>
          </select>
          <button onClick={simulate} disabled={simLoading} className="btn-outline">
            {simLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Run Simulation'}
          </button>
        </div>
        {simulation && (
          <div className="bg-carbon-700 rounded-xl p-4 animate-fade-in">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Simulated Numbers</p>
            <div className="flex gap-2 mb-4">
              {simulation.numbers.map((n, i) => (
                <div key={i} className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center font-mono font-bold text-lime-400">
                  {n}
                </div>
              ))}
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-white/40">5-match: <span className="text-lime-400 font-bold">{simulation.projectedMatches.five}</span></span>
              <span className="text-white/40">4-match: <span className="text-blue-400 font-bold">{simulation.projectedMatches.four}</span></span>
              <span className="text-white/40">3-match: <span className="text-purple-400 font-bold">{simulation.projectedMatches.three}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Create draw */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Plus size={16} className="text-lime-400" /> Create New Draw
        </h3>
        <div className="flex flex-wrap gap-3">
          <input type="date" className="input max-w-xs"
            value={newDrawDate} onChange={e => setNewDrawDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <select className="input max-w-xs" value={simMethod} onChange={e => setSimMethod(e.target.value)}>
            <option value="random">Random</option>
            <option value="algorithmic">Algorithmic</option>
          </select>
          <button onClick={createDraw} disabled={creating} className="btn-primary">
            {creating ? <span className="w-4 h-4 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Create Draw'}
          </button>
        </div>
      </div>

      {/* Draw list */}
      <div>
        <h3 className="font-semibold text-white mb-4">All Draws</h3>
        <div className="space-y-3">
          {draws.map(draw => (
            <div key={draw.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-white font-medium">{format(new Date(draw.draw_date), 'MMMM yyyy')}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`badge ${draw.status === 'published' ? 'badge-active' : draw.status === 'pending' ? 'badge-warning' : 'badge-error'}`}>
                    {draw.status}
                  </span>
                  <span className="text-white/20 text-xs">method: {draw.method}</span>
                </div>
                {draw.winning_numbers && (
                  <div className="flex gap-1.5 mt-2">
                    {draw.winning_numbers.map((n, i) => (
                      <span key={i} className="w-8 h-8 rounded-lg bg-lime-400/10 border border-lime-400/10 flex items-center justify-center font-mono text-lime-400 text-xs font-bold">
                        {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {draw.total_pool && <span className="text-white/40 text-sm">£{Number(draw.total_pool).toFixed(2)}</span>}
                {draw.status === 'pending' && (
                  <button onClick={() => executeDraw(draw.id)} className="btn-primary text-sm py-2 px-4">
                    <Play size={14} /> Execute & Publish
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Winners ─────────────────────────────────────────────── */
function AdminWinners() {
  const [winners, setWinners] = useState([]);
  const [filter, setFilter] = useState('');

  const fetchWinners = async () => {
    const { data } = await api.get(`/admin/winners${filter ? `?status=${filter}` : ''}`);
    setWinners(data.winners || []);
  };

  useEffect(() => { fetchWinners(); }, [filter]);

  const action = async (id, act, note = '') => {
    try {
      await api.patch(`/admin/winners/${id}`, { action: act, admin_note: note });
      toast.success('Updated');
      fetchWinners();
    } catch { toast.error('Failed'); }
  };

  const statusOptions = ['', 'pending', 'under_review', 'approved', 'rejected', 'paid'];

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-white mb-6">Winner Verification</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {statusOptions.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              filter === s ? 'bg-lime-400 text-carbon-950 font-semibold' : 'bg-carbon-800 text-white/40 hover:text-white'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {winners.map(w => (
          <div key={w.id} className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold">{w.users?.full_name} — {w.match_type}</p>
                <p className="text-white/30 text-sm">{w.users?.email}</p>
                <p className="text-white/40 text-xs mt-1">
                  Draw: {w.draws?.draw_date ? format(new Date(w.draws.draw_date), 'MMM yyyy') : '—'} ·
                  Prize: <span className="text-lime-400 font-semibold">£{Number(w.prize_amount).toFixed(2)}</span>
                </p>
                {w.proof_url && (
                  <a href={w.proof_url} target="_blank" rel="noopener noreferrer"
                    className="text-lime-400 text-xs hover:underline mt-1 inline-block">
                    View proof →
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${
                  w.status === 'paid' || w.status === 'approved' ? 'badge-active'
                    : w.status === 'rejected' ? 'badge-error'
                    : w.status === 'under_review' ? 'badge-warning' : 'badge-neutral'
                }`}>{w.status?.replace('_', ' ')}</span>

                {w.status === 'under_review' && (
                  <>
                    <button onClick={() => action(w.id, 'approve')} className="btn-primary text-xs py-1.5 px-3">
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button onClick={() => action(w.id, 'reject')} className="bg-red-400/10 border border-red-400/20 text-red-400 text-xs py-1.5 px-3 rounded-lg hover:bg-red-400/20 transition-colors">
                      <XCircle size={12} className="inline mr-1" /> Reject
                    </button>
                  </>
                )}
                {w.status === 'approved' && (
                  <button onClick={() => action(w.id, 'mark_paid')} className="btn-primary text-xs py-1.5 px-3">
                    Mark as Paid
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {winners.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-white/30">No winners found with this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Charities ───────────────────────────────────────────── */
function AdminCharities() {
  const [charities, setCharities] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', category: '', website: '', is_featured: false });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchCharities = async () => {
    const { data } = await api.get('/admin/charities');
    setCharities(data.charities || []);
  };

  useEffect(() => { fetchCharities(); }, []);

  const createCharity = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/charities', form);
      toast.success('Charity created!');
      setForm({ name: '', description: '', category: '', website: '', is_featured: false });
      setShowForm(false);
      fetchCharities();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setCreating(false); }
  };

  const toggleActive = async (c) => {
    try {
      await (c.is_active ? api.delete(`/charities/${c.id}`) : api.put(`/charities/${c.id}`, { is_active: true }));
      toast.success(`Charity ${c.is_active ? 'deactivated' : 'activated'}`);
      fetchCharities();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-3xl text-white">Charities</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2.5">
          <Plus size={15} /> Add Charity
        </button>
      </div>

      {showForm && (
        <div className="card border-lime-400/10 mb-6 animate-slide-up">
          <h3 className="font-semibold text-white mb-4">New Charity</h3>
          <form onSubmit={createCharity} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input type="text" className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <input type="text" className="input" placeholder="Health, Community..." value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={3} required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Website URL</label>
              <input type="url" className="input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="flex items-center gap-3 mt-6">
              <input type="checkbox" id="featured" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} className="accent-lime-400" />
              <label htmlFor="featured" className="text-white/60 text-sm">Featured charity</label>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? <span className="w-4 h-4 border-2 border-carbon-950 border-t-transparent rounded-full animate-spin" /> : 'Create Charity'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {charities.map(c => (
          <div key={c.id} className={`card flex items-center justify-between gap-4 ${!c.is_active ? 'opacity-50' : ''}`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-medium">{c.name}</p>
                {c.is_featured && <span className="badge-active text-[10px]">Featured</span>}
                {!c.is_active && <span className="badge-error text-[10px]">Inactive</span>}
              </div>
              <p className="text-white/30 text-xs mt-0.5">{c.category}</p>
            </div>
            <button onClick={() => toggleActive(c)}
              className={`text-xs font-medium transition-colors ${c.is_active ? 'text-red-400 hover:text-red-300' : 'text-lime-400 hover:text-lime-300'}`}>
              {c.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Reports ─────────────────────────────────────────────── */
function AdminReports() {
  const [contributions, setContributions] = useState([]);

  useEffect(() => {
    api.get('/admin/reports/charity-contributions').then(r => setContributions(r.data.contributions || [])).catch(() => {});
  }, []);

  const total = contributions.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-white mb-6">Charity Reports</h1>

      <div className="card border-lime-400/10 mb-6">
        <p className="text-white/40 text-sm mb-1">Total Contributed to Charities</p>
        <p className="text-4xl font-display font-bold text-lime-400">£{total.toFixed(2)}</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-white mb-4">Recent Contributions</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {contributions.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white text-sm">{c.charities?.name}</p>
                <p className="text-white/30 text-xs">{c.users?.email} · {c.type}</p>
              </div>
              <div className="text-right">
                <p className="text-lime-400 font-semibold text-sm">£{Number(c.amount).toFixed(2)}</p>
                <p className="text-white/20 text-xs">{format(new Date(c.created_at), 'dd MMM yyyy')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Admin Shell ─────────────────────────────────────────── */
export default function AdminPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto flex gap-8">
        <AdminSidebar />
        <div className="flex-1 min-w-0 animate-fade-in">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="draws" element={<AdminDraws />} />
            <Route path="winners" element={<AdminWinners />} />
            <Route path="charities" element={<AdminCharities />} />
            <Route path="reports" element={<AdminReports />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
