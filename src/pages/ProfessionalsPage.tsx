import React, { useEffect, useMemo, useState } from 'react';
import { Star, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { professionalsApi, type Professional } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const ProfessionalsPage: React.FC = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    professionalsApi.list()
      .then(setProfessionals)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const uniqueProfessionals = useMemo(() => {
    const seen = new Set<string>();
    return professionals.filter((pro) => {
      const key = pro.user_id || pro.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [professionals]);

  return (
    <div className="pt-28 pb-24">
      <div className="px-6 max-w-7xl mx-auto space-y-8">
        <section className="mesh-panel rounded-[2.2rem] p-8 md:p-10 border border-white/70 dark:border-slate-800/70">
          <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold dark:text-white mb-3">Verified Professionals</h1>
              <p className="text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Every professional passes our verification pipeline including skill checks, identity confirmation,
                and customer-quality benchmarks.
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 min-w-44">
              <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">Available Pros</p>
              <p className="text-3xl font-display font-bold text-slate-900 dark:text-white">
                {isLoading ? '...' : uniqueProfessionals.filter((p) => p.is_available).length}
              </p>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="text-center py-20 text-slate-400">Loading professionals...</div>
        ) : uniqueProfessionals.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No verified professionals yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {uniqueProfessionals.map((pro) => (
              <Card key={pro.id} className="p-7">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="w-24 h-24 rounded-3xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 text-3xl font-bold border-4 border-slate-100 dark:border-slate-800">
                      {((pro.name ?? pro.specialty) || 'P').charAt(0).toUpperCase()}
                    </div>
                    {pro.is_kyc_verified && (
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                        <ShieldCheck size={16} />
                      </div>
                    )}
                  </div>

                  <p className="text-lg font-display font-bold text-slate-900 dark:text-white mb-1">{pro.name ?? 'Professional'}</p>
                  <p className="text-brand-600 dark:text-brand-300 font-semibold text-sm mb-4">{pro.specialty}</p>

                  <div className="flex items-center gap-6 mb-7">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Rating</p>
                      <div className="flex items-center gap-1 text-yellow-500 font-bold">
                        <Star size={14} fill="currentColor" /> {pro.avg_rating.toFixed(1)}
                      </div>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Jobs</p>
                      <p className="font-bold dark:text-white">{pro.total_jobs}+</p>
                    </div>
                  </div>

                  <div className="w-full space-y-2.5 mb-7">
                    {['Background Verified', 'Skill Certified', 'Equipped with Tools'].map((badge, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/70 py-2 px-4 rounded-xl border border-slate-200/70 dark:border-slate-700">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        {badge}
                      </div>
                    ))}
                  </div>

                  <div className="w-full space-y-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full inline-block mb-2 ${pro.is_available ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
                      {pro.is_available ? '● Available' : '○ Busy'}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/professionals/${pro.id}`)}
                      className="w-full"
                    >
                      View Profile
                    </Button>
                    <Button
                      onClick={() => navigate(`/book/${pro.id}`)}
                      disabled={!pro.is_available}
                      className="w-full"
                    >
                      {pro.is_available ? 'Book Now' : 'Currently Unavailable'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="gradient-bg rounded-[2.4rem] p-10 text-center text-white">
          <h2 className="text-3xl font-display font-bold mb-3">Become a Servify Professional</h2>
          <p className="text-white/85 mb-7 max-w-xl mx-auto">
            Join the fastest-growing network of home service experts and access high-intent booking demand.
          </p>
          <Button
            size="lg"
            className="bg-white text-brand-700 hover:bg-slate-100 shadow-none"
            onClick={() => navigate('/signup?role=professional')}
          >
            Apply Now
          </Button>
        </div>
      </div>
    </div>
  );
};
