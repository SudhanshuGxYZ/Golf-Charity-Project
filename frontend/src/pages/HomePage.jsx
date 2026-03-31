import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Trophy, Target, ChevronRight, Star } from 'lucide-react';
import api from '../utils/api';

export default function HomePage() {
  const [upcomingDraw, setUpcomingDraw] = useState(null);
  const [charities, setCharities] = useState([]);

  useEffect(() => {
    api.get('/draws/upcoming').then(r => setUpcomingDraw(r.data)).catch(() => {});
    api.get('/charities').then(r => setCharities(r.data.charities?.slice(0, 4) || [])).catch(() => {});
  }, []);

  const steps = [
    { num: '01', title: 'Subscribe', desc: 'Join monthly or yearly. Cancel anytime.', icon: '⚡' },
    { num: '02', title: 'Enter Your Scores', desc: 'Log your last 5 Stableford rounds. The platform keeps a rolling record.', icon: '🏌️' },
    { num: '03', title: 'Choose Your Charity', desc: 'Select from our vetted charity directory. 10%+ of your sub goes directly to them.', icon: '💚' },
    { num: '04', title: 'Win Every Month', desc: 'Match 3, 4 or all 5 draw numbers against your scores to win prizes.', icon: '🏆' },
  ];

  const stats = [
    { value: '£' + ((upcomingDraw?.estimatedPool || 0) + (upcomingDraw?.jackpotRollover || 0)).toFixed(0), label: 'Current Prize Pool' },
    { value: upcomingDraw?.activeSubscribers || '—', label: 'Active Players' },
    { value: '10%+', label: 'Goes to Charity' },
    { value: '3', label: 'Ways to Win Monthly' },
  ];

  return (
    <div className="overflow-hidden">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-24 pb-20">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-forest-900 via-carbon-950 to-carbon-950" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-lime-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-lime-400/10 border border-lime-400/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-lime-400 rounded-full animate-pulse-slow" />
              <span className="text-lime-400 text-sm font-medium">Monthly draw now open</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black leading-[1.05] mb-6 text-white">
              Golf that{' '}
              <span className="gradient-text">gives back.</span>
            </h1>

            <p className="text-white/50 text-xl leading-relaxed mb-8 max-w-xl">
              Track your Stableford scores, enter monthly prize draws, and support the charity you believe in — all in one place.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Link to="/register" className="btn-primary text-base px-8 py-4">
                Start Playing
                <ArrowRight size={18} />
              </Link>
              <Link to="/draws" className="btn-outline text-base px-8 py-4">
                View Draws
              </Link>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((s, i) => (
                <div key={i} className="text-center sm:text-left">
                  <div className="text-2xl font-display font-bold text-lime-400">{s.value}</div>
                  <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual — Score card mockup */}
          <div className="hidden lg:block animate-float">
            <div className="relative">
              {/* Main card */}
              <div className="bg-carbon-800 border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white/40 text-sm">Your scores</p>
                    <p className="font-display font-bold text-white text-xl">This Month's Entry</p>
                  </div>
                  <div className="badge-active">Active</div>
                </div>

                <div className="flex gap-3 mb-6">
                  {[32, 28, 35, 31, 29].map((score, i) => (
                    <div key={i} className="score-bubble" style={{ animationDelay: `${i * 0.1}s` }}>
                      {score}
                    </div>
                  ))}
                </div>

                <div className="bg-carbon-700 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/50 text-sm">Draw numbers</span>
                    <span className="text-lime-400 text-sm font-semibold">3 matched! 🎉</span>
                  </div>
                  <div className="flex gap-3">
                    {[31, 28, 24, 35, 18].map((n, i) => (
                      <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-mono font-bold border ${
                        [32,28,35,31,29].includes(n)
                          ? 'bg-lime-400/10 border-lime-400/30 text-lime-400'
                          : 'bg-carbon-800 border-white/10 text-white/30'
                      }`}>{n}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-lime-400 text-carbon-950 rounded-2xl px-4 py-2 font-bold text-sm shadow-lg">
                £847 prize pool
              </div>

              {/* Charity chip */}
              <div className="absolute -bottom-4 -left-4 bg-carbon-800 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg">
                <Heart size={14} className="text-red-400" />
                <span className="text-white/70 text-sm">Supporting Cancer Research UK</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-lime-400 text-sm font-semibold uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="section-title">Simple as a birdie.</h2>
            <p className="section-subtitle mx-auto text-center">Four steps between you and a community that plays with purpose.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="card relative group hover:border-lime-400/20 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{step.icon}</span>
                  <span className="font-mono text-xs text-white/15 font-bold">{step.num}</span>
                </div>
                <h3 className="font-display font-bold text-white text-xl mb-2">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <ChevronRight size={16} className="absolute -right-3 top-1/2 -translate-y-1/2 text-white/10 hidden lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prize Pool breakdown ─────────────────────────────── */}
      <section className="py-24 bg-carbon-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-lime-400 text-sm font-semibold uppercase tracking-widest mb-3">Prize Structure</p>
              <h2 className="section-title mb-4">Three ways to win,<br/>every month.</h2>
              <p className="text-white/40 leading-relaxed mb-8">
                The prize pool is funded by subscriptions and distributed automatically. Match your scores against the monthly draw numbers for a chance to win.
              </p>

              <div className="space-y-4">
                {[
                  { type: 'Match 5', share: '40%', colour: 'text-lime-400', bg: 'bg-lime-400/10 border-lime-400/20', label: 'Jackpot — rolls over if unclaimed' },
                  { type: 'Match 4', share: '35%', colour: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', label: 'Split equally among winners' },
                  { type: 'Match 3', share: '25%', colour: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', label: 'Split equally among winners' },
                ].map((tier, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${tier.bg}`}>
                    <div className="flex items-center gap-3">
                      <Trophy size={18} className={tier.colour} />
                      <div>
                        <p className={`font-semibold ${tier.colour}`}>{tier.type}</p>
                        <p className="text-white/30 text-xs">{tier.label}</p>
                      </div>
                    </div>
                    <span className={`font-display font-bold text-2xl ${tier.colour}`}>{tier.share}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card border-lime-400/10">
              <h3 className="font-display font-bold text-xl text-white mb-6">This Month's Draw</h3>
              {upcomingDraw?.nextDraw ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-white/40 text-sm">Draw Date</span>
                    <span className="text-white font-medium">
                      {new Date(upcomingDraw.nextDraw.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-white/40 text-sm">Prize Pool</span>
                    <span className="text-lime-400 font-bold text-xl">£{(upcomingDraw.estimatedPool + upcomingDraw.jackpotRollover).toFixed(2)}</span>
                  </div>
                  {upcomingDraw.jackpotRollover > 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-white/40 text-sm">Jackpot Rollover</span>
                      <span className="text-lime-400/70 font-medium">+£{upcomingDraw.jackpotRollover.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-3">
                    <span className="text-white/40 text-sm">Active Players</span>
                    <span className="text-white font-medium">{upcomingDraw.activeSubscribers}</span>
                  </div>
                </div>
              ) : (
                <p className="text-white/30">Draw information loading...</p>
              )}

              <Link to="/register" className="btn-primary w-full justify-center mt-6">
                Enter This Month's Draw
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Charity section ───────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-lime-400 text-sm font-semibold uppercase tracking-widest mb-3">Giving Back</p>
            <h2 className="section-title">Your game,<br/>their future.</h2>
            <p className="section-subtitle mx-auto text-center">
              Every subscription automatically contributes to the charity you choose. No admin, no fuss.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {charities.map((charity, i) => (
              <div key={i} className="card-hover group">
                <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/10 flex items-center justify-center mb-3">
                  <Heart size={18} className="text-lime-400" />
                </div>
                <h4 className="font-semibold text-white mb-1 group-hover:text-lime-400 transition-colors">{charity.name}</h4>
                <p className="text-white/30 text-xs line-clamp-2">{charity.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/charities" className="btn-outline">
              Browse All Charities
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-br from-forest-800 via-forest-900 to-carbon-900 border border-lime-400/10 rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-transparent pointer-events-none" />
            <div className="relative">
              <span className="text-5xl mb-6 block">⛳</span>
              <h2 className="font-display font-black text-4xl md:text-5xl text-white mb-4">
                Ready to play with purpose?
              </h2>
              <p className="text-white/40 text-lg mb-8">
                Join today and enter this month's prize draw.
              </p>
              <Link to="/register" className="btn-primary text-lg px-10 py-4">
                Get Started — It's Free to Register
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
