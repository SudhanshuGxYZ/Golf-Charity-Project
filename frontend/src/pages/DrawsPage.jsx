import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Users, Zap, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';

export default function DrawsPage() {
  const [draws, setDraws] = useState([]);
  const [upcoming, setUpcoming] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/draws'),
      api.get('/draws/upcoming'),
    ]).then(([drawsRes, upcomingRes]) => {
      setDraws(drawsRes.data.draws || []);
      setUpcoming(upcomingRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getTierLabel = (num) => {
    if (num.includes('5')) return { label: 'Jackpot', cls: 'text-lime-400 bg-lime-400/10 border-lime-400/20' };
    if (num.includes('4')) return { label: '4-Match', cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20' };
    return { label: '3-Match', cls: 'text-purple-400 bg-purple-400/10 border-purple-400/20' };
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14 animate-fade-in">
          <p className="text-lime-400 text-sm font-semibold uppercase tracking-widest mb-3">Monthly Draw</p>
          <h1 className="section-title">Win big.<br/>Give bigger.</h1>
          <p className="section-subtitle mx-auto text-center">
            Match 3, 4, or 5 draw numbers against your Stableford scores each month to win from the prize pool.
          </p>
        </div>

        {/* Upcoming draw card */}
        <div className="card border-lime-400/20 bg-gradient-to-br from-forest-800/30 to-carbon-800 mb-10 animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse-slow" />
                <span className="text-lime-400 text-sm font-semibold uppercase tracking-wider">Next Draw</span>
              </div>
              <h2 className="font-display font-bold text-3xl text-white mb-1">
                {upcoming?.nextDraw
                  ? format(new Date(upcoming.nextDraw.draw_date), 'MMMM yyyy')
                  : 'Coming Soon'}
              </h2>
              {upcoming?.nextDraw && (
                <p className="text-white/40">
                  {format(new Date(upcoming.nextDraw.draw_date), 'EEEE, dd MMMM yyyy')}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="text-center">
                <div className="text-3xl font-display font-bold text-lime-400">
                  ₹{((upcoming?.estimatedPool || 0) + (upcoming?.jackpotRollover || 0)).toFixed(0)}
                </div>
                <div className="text-white/30 text-xs mt-0.5">Prize Pool</div>
              </div>
              {(upcoming?.jackpotRollover || 0) > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-display font-bold text-yellow-400">
                      +₹{upcoming.jackpotRollover.toFixed(0)}
                  </div>
                  <div className="text-white/30 text-xs mt-0.5">Jackpot Rollover</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-3xl font-display font-bold text-white">
                  {upcoming?.activeSubscribers || 0}
                </div>
                <div className="text-white/30 text-xs mt-0.5">Players</div>
              </div>
            </div>

            <Link to="/register" className="btn-primary shrink-0">
              Enter Draw
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* How it works banner */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { icon: '🏌️', title: 'Log Scores', desc: 'Enter up to 5 Stableford scores' },
            { icon: '🎯', title: 'Draw Numbers', desc: '5 numbers drawn each month' },
            { icon: '🏆', title: 'Win Prizes', desc: 'Match 3, 4 or 5 to win' },
          ].map((item, i) => (
            <div key={i} className="card text-center border-white/5">
              <span className="text-3xl block mb-2">{item.icon}</span>
              <p className="text-white font-semibold text-sm">{item.title}</p>
              <p className="text-white/30 text-xs mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Draw history */}
        <div>
          <h2 className="font-display font-bold text-2xl text-white mb-6">Draw History</h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : draws.length === 0 ? (
            <div className="card text-center py-16">
              <Calendar size={48} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/30">No draws yet. The first draw is coming soon!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {draws.map(draw => (
                <DrawCard key={draw.id} draw={draw} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DrawCard({ draw }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card hover:border-white/10 transition-all duration-200 cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/10 flex items-center justify-center">
            <Trophy size={20} className="text-lime-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white">
              {format(new Date(draw.draw_date), 'MMMM yyyy')}
            </h3>
            <p className="text-white/30 text-sm">
              {format(new Date(draw.draw_date), 'dd MMMM yyyy')}
              {draw.published_at && ` · Published ${format(new Date(draw.published_at), 'dd MMM')}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <div className="font-display font-bold text-lime-400">₹{Number(draw.total_pool || 0).toFixed(2)}</div>
            <div className="text-white/30 text-xs">Pool</div>
          </div>
          <div className="text-center">
            <div className="font-display font-bold text-white">{draw.winner_count}</div>
            <div className="text-white/30 text-xs">Winners</div>
          </div>
          {(draw.jackpot_rollover || 0) > 0 && (
            <div className="text-center">
              <div className="font-display font-bold text-yellow-400">+₹{Number(draw.jackpot_rollover).toFixed(2)}</div>
              <div className="text-white/30 text-xs">Rolled Over</div>
            </div>
          )}
          <span className={`badge-active text-xs ${draw.winner_count === 0 ? 'badge-neutral' : ''}`}>
            {draw.winner_count === 0 ? 'No jackpot winner' : `${draw.winner_count} winner${draw.winner_count !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {open && draw.winning_numbers && (
        <div className="mt-5 pt-5 border-t border-white/5 animate-fade-in">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Winning Numbers</p>
          <div className="flex gap-3">
            {draw.winning_numbers.map((n, i) => (
              <div key={i} className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center font-mono font-bold text-lime-400 text-lg">
                {n}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
