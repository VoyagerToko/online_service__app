import React from 'react';
import { motion } from 'motion/react';
import { Search, ShieldCheck, Star, Clock, ArrowRight, Zap, Droplets, Sparkles, Tv, Paintbrush, Hammer } from 'lucide-react';
import { CATEGORIES, SERVICES } from '../data/mockData';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';

const iconMap: Record<string, any> = {
  Zap, Droplets, Sparkles, Tv, Paintbrush, Hammer
};

export const LandingPage: React.FC = () => {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 blur-3xl rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-sm font-bold tracking-wide uppercase mb-6">
                Trusted by 10,000+ Households
              </span>
              <h1 className="text-5xl lg:text-7xl font-display font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-8">
                Home services, <br />
                <span className="gradient-text">reimagined.</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                Book verified professionals for everything from plumbing to deep cleaning. 
                Transparent pricing, real-time tracking, and guaranteed quality.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="Search for 'AC repair' or 'Cleaning'..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition-all text-slate-900 dark:text-white"
                  />
                </div>
                <Button size="lg" className="sm:w-auto">Search</Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-display font-bold dark:text-white mb-2">Explore Categories</h2>
              <p className="text-slate-500 dark:text-slate-400">Professional help for every corner of your home</p>
            </div>
            <Link to="/categories" className="text-brand-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              View All <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {CATEGORIES.map((cat, idx) => {
              const Icon = iconMap[cat.icon];
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Link to={`/category/${cat.id}`}>
                    <Card className="flex flex-col items-center text-center p-8 group">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300">
                        {Icon && <Icon size={32} />}
                      </div>
                      <h3 className="font-bold dark:text-white">{cat.name}</h3>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://picsum.photos/seed/service/800/800" 
                  alt="Professional Service" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-10 -right-10 glass p-8 rounded-3xl shadow-xl max-w-xs hidden md:block">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">Verified Pros</p>
                    <p className="text-sm text-slate-500">100% Background Checked</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <span className="text-slate-900 dark:text-white font-bold ml-2">4.9/5</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-display font-bold dark:text-white mb-8 leading-tight">
                The most transparent way to <br />
                <span className="gradient-text">book home services.</span>
              </h2>
              
              <div className="space-y-8">
                {[
                  {
                    title: 'Transparent Pricing',
                    desc: 'No hidden fees. See the exact breakdown of labor and material costs before you book.',
                    icon: <Zap className="text-brand-500" />
                  },
                  {
                    title: 'Real-time Tracking',
                    desc: 'Track your technician live on the map. Get instant notifications at every step.',
                    icon: <Clock className="text-blue-500" />
                  },
                  {
                    title: 'Quality Guaranteed',
                    desc: 'Not satisfied? We offer a 100% money-back guarantee or a free re-service.',
                    icon: <ShieldCheck className="text-emerald-500" />
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold dark:text-white mb-2">{item.title}</h4>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="gradient-bg rounded-[3rem] p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-brand-500/40">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl"></div>
            </div>
            
            <h2 className="text-4xl lg:text-6xl font-display font-bold mb-8 relative z-10">
              Ready to experience <br /> better service?
            </h2>
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto relative z-10">
              Join thousands of happy customers who trust Servify for their home needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Button size="lg" className="bg-white text-brand-600 hover:bg-slate-100 shadow-none">
                Book a Service
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Become a Professional
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
