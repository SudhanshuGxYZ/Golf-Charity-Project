import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Heart, ExternalLink, Star } from 'lucide-react';
import api from '../utils/api';

export default function CharitiesPage() {
  const [charities, setCharities] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCharities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const { data } = await api.get(`/charities?${params}`);
      setCharities(data.charities || []);
    } catch {
      setCharities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchCharities, 300);
    return () => clearTimeout(t);
  }, [search, category]);

  const categories = ['Health', 'Community', 'Environment', 'Education', 'Children', 'Animals'];
  const featured = charities.filter(c => c.is_featured);
  const rest = charities.filter(c => !c.is_featured);

  return (
    <div className="min-h-screen pt-28 pb-20 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14 animate-fade-in">
          <p className="text-lime-400 text-sm font-semibold uppercase tracking-widest mb-3">Giving Back</p>
          <h1 className="section-title">Choose your cause.</h1>
          <p className="section-subtitle mx-auto text-center">
            Every subscription automatically funds your chosen charity. Browse our vetted directory and find a cause close to your heart.
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10 animate-slide-up">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Search charities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategory('')}
              className={`px-4 py-2.5 rounded-lg text-sm transition-all ${
                !category ? 'bg-lime-400 text-carbon-950 font-semibold' : 'bg-carbon-800 text-white/40 hover:text-white border border-white/5'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat === category ? '' : cat)}
                className={`px-4 py-2.5 rounded-lg text-sm transition-all ${
                  category === cat ? 'bg-lime-400 text-carbon-950 font-semibold' : 'bg-carbon-800 text-white/40 hover:text-white border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && !search && !category && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={15} className="text-lime-400" />
                  <span className="text-white/40 text-sm font-semibold uppercase tracking-wider">Featured</span>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  {featured.map(c => (
                    <CharityCard key={c.id} charity={c} featured />
                  ))}
                </div>
              </div>
            )}

            {/* All */}
            {rest.length > 0 && (
              <>
                {featured.length > 0 && !search && !category && (
                  <div className="flex items-center gap-2 mb-4">
                    <Heart size={15} className="text-white/30" />
                    <span className="text-white/40 text-sm font-semibold uppercase tracking-wider">All Charities</span>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rest.map(c => <CharityCard key={c.id} charity={c} />)}
                </div>
              </>
            )}

            {charities.length === 0 && (
              <div className="text-center py-20">
                <Heart size={48} className="text-white/10 mx-auto mb-4" />
                <p className="text-white/30">No charities found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CharityCard({ charity, featured }) {
  return (
    <Link
      to={`/charities/${charity.id}`}
      className={`group block card hover:border-lime-400/20 hover:bg-carbon-700 transition-all duration-200 ${
        featured ? 'border-lime-400/10' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/10 flex items-center justify-center shrink-0">
          {charity.logo_url
            ? <img src={charity.logo_url} alt={charity.name} className="w-8 h-8 object-contain" />
            : <Heart size={20} className="text-lime-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white group-hover:text-lime-400 transition-colors">{charity.name}</h3>
            {featured && <span className="badge-active text-[10px] shrink-0">Featured</span>}
          </div>
          {charity.category && (
            <span className="text-xs text-white/20 uppercase tracking-wider">{charity.category}</span>
          )}
          <p className="text-white/40 text-sm leading-relaxed mt-2 line-clamp-2">{charity.description}</p>
        </div>
      </div>
      {charity.website && (
        <div className="flex items-center gap-1.5 text-xs text-white/20 mt-4 hover:text-lime-400/60 transition-colors">
          <ExternalLink size={11} />
          {charity.website.replace(/^https?:\/\//, '')}
        </div>
      )}
    </Link>
  );
}
