import React, { useEffect, useState } from 'react';
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

  return (
    <div className="pt-28 pb-20 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-display font-bold dark:text-white mb-4">Our Verified Professionals</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Every professional on Servify undergoes a rigorous 5-step verification process including background checks and skill assessments.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400">Loading professionals...</div>
      ) : professionals.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No verified professionals yet.</div>
      ) : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {professionals.map((pro) => (
          <Card key={pro.id} className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 text-3xl font-bold border-4 border-slate-100 dark:border-slate-800">
                  {pro.specialty.charAt(0)}
                </div>
                {pro.is_kyc_verified && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                    <ShieldCheck size={16} />
                  </div>
                )}
              </div>
              
              <p className="text-brand-600 font-semibold text-sm mb-4">{pro.specialty}</p>
              
              <div className="flex items-center gap-6 mb-8">
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

              <div className="w-full space-y-3 mb-8">
                {['Background Verified', 'Skill Certified', 'Equipped with Tools'].map((badge, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 py-2 px-4 rounded-xl">
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

      <div className="mt-20 bg-brand-50 dark:bg-brand-900/10 rounded-[3rem] p-12 text-center">
        <h2 className="text-3xl font-display font-bold dark:text-white mb-4">Become a Servify Professional</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">
          Join the largest network of home service professionals and grow your business with us.
        </p>
        <Button size="lg">Apply Now</Button>
      </div>
    </div>
  );
};
