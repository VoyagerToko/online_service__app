import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BadgeCheck, CheckCircle2, Search, ShieldCheck, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../data/mockData';
import { professionalsApi, servicesApi, type Category, type Professional } from '../api/client';
import { Button } from '../components/ui/Button';
import { getMeaningfulImage } from '../utils/meaningfulImages';

const landingImages = {
  hero: getMeaningfulImage('premium professional at home service visit', 'landing-hero'),
  testimonial: getMeaningfulImage('happy customer portrait after successful service', 'landing-testimonial'),
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [serviceCount, setServiceCount] = useState(0);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isMetaLoading, setIsMetaLoading] = useState(true);

  useEffect(() => {
    Promise.all([servicesApi.listCategories(), servicesApi.listServices(), professionalsApi.list()])
      .then(([cats, services, pros]) => {
        setCategories(cats);
        setServiceCount(services.length);
        setProfessionals(pros);
      })
      .catch(console.error)
      .finally(() => setIsMetaLoading(false));
  }, []);

  const avgRating = useMemo(() => {
    const rated = professionals.filter((p) => p.avg_rating > 0);
    if (!rated.length) return 4.9;
    const total = rated.reduce((sum, p) => sum + p.avg_rating, 0);
    return Number((total / rated.length).toFixed(1));
  }, [professionals]);

  const categoryCards = categories.length > 0
    ? categories
    : CATEGORIES.map((c) => ({ id: c.id, name: c.name, icon: c.icon, description: c.description, is_active: true }));

  const mainCategory = categoryCards[0];
  const sideCategoryA = categoryCards[1];
  const sideCategoryB = categoryCards[2];
  const primaryCategoryImage = getMeaningfulImage(mainCategory?.name ?? 'interior design', `landing-primary-${mainCategory?.id ?? 'default'}`);
  const secondaryCategoryImageA = getMeaningfulImage(sideCategoryB?.name ?? 'software development', `landing-secondary-a-${sideCategoryB?.id ?? 'default'}`);
  const secondaryCategoryImageB = getMeaningfulImage('brand identity design studio', 'landing-secondary-b');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/services?q=${encodeURIComponent(searchQuery.trim())}`);
      return;
    }
    navigate('/services');
  };

  return (
    <div className="overflow-hidden">
      <main className="pt-24">
        <section className="relative px-8 py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="lg:w-1/2 space-y-8"
            >
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-spark-500 text-[#ffcaaf] text-xs font-bold tracking-widest uppercase">
                Curated Excellence
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                The <span className="gradient-text">Architectural</span> Curator for Every Professional Need.
              </h1>

              <p className="text-xl text-[#3f4949] max-w-xl leading-relaxed">
                Access an elite network of vetted experts across creative, technical, and strategic domains.
                We bridge the gap between vision and execution.
              </p>

              <div className="bg-white p-2 rounded-xl servify-shadow flex flex-col md:flex-row gap-2 max-w-2xl border border-brand-200/10">
                <div className="flex-1 flex items-center px-4 gap-3 bg-brand-50 rounded-lg py-4">
                  <Search size={18} className="text-brand-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="What service do you need?"
                    className="bg-transparent border-none outline-none w-full text-[#1a1c1e] font-medium"
                  />
                </div>
                <Button className="px-10 py-4 rounded-lg font-bold text-lg" onClick={handleSearch}>
                  Find Experts
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm font-semibold text-[#3f4949]">
                <span className="inline-flex items-center gap-2"><BadgeCheck size={16} className="text-brand-500" /> {isMetaLoading ? '...' : `${professionals.length || 120}+`} vetted pros</span>
                <span className="inline-flex items-center gap-2"><Star size={16} className="text-brand-500" /> {avgRating}/5 average rating</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-brand-500" /> {isMetaLoading ? '...' : serviceCount} services</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="lg:w-1/2 relative"
            >
              <div className="relative w-full aspect-4/5 rounded-[2.5rem] overflow-hidden servify-shadow group">
                <img src={landingImages.hero} alt="Professional working in a client home" className="w-full h-full object-cover grayscale-[0.2] group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-linear-to-tr from-brand-500/40 to-transparent" />
              </div>

              <div className="absolute -bottom-12 -left-12 bg-white p-8 rounded-2xl servify-shadow max-w-70 hidden xl:block">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-[#c7e5e6] flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Vetted Network</p>
                    <p className="text-xs text-[#3f4949] mt-1">Top 2% of industry leaders across all categories.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-50 -z-10 rounded-l-[10rem]" />
        </section>

        <section className="bg-brand-50 py-24 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">Curated Categories</h2>
              <p className="text-[#3f4949] text-lg">Masterfully selected professionals for high-impact results.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-8 group cursor-pointer" onClick={() => navigate('/services')}>
                <div className="relative h-120 rounded-4xl overflow-hidden transition-all duration-500">
                  <img src={primaryCategoryImage} alt={mainCategory?.name ?? 'Interior Design'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" loading="lazy" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-10 left-10 text-white">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#cae8e8] mb-2 block">Lifestyle Architecture</span>
                    <h3 className="text-3xl font-bold">{mainCategory?.name ?? 'Interior Design'}</h3>
                    <p className="mt-2 text-white/80 max-w-sm">{mainCategory?.description ?? 'From residential sanctuaries to high-performance workspaces.'}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col gap-8">
                <div className="bg-white p-10 rounded-4xl h-full flex flex-col justify-between servify-shadow hover:-translate-y-2 transition-transform">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{sideCategoryA?.name ?? 'Legal Consultation'}</h3>
                    <p className="text-[#3f4949] text-sm leading-relaxed">{sideCategoryA?.description ?? 'Strategic council for intellectual property, corporate structuring, and private equity.'}</p>
                  </div>
                  <Link to="/services" className="mt-6 flex items-center gap-2 font-bold text-brand-500 text-sm hover:translate-x-2 transition-transform">
                    Explore {sideCategoryA?.name ?? 'Legal'} <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              <div className="md:col-span-4 group cursor-pointer" onClick={() => navigate('/services')}>
                <div className="relative h-100 rounded-4xl overflow-hidden">
                  <img src={secondaryCategoryImageA} alt={sideCategoryB?.name ?? 'Software Development'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" loading="lazy" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 to-transparent" />
                  <div className="absolute bottom-8 left-8 text-white">
                    <h3 className="text-xl font-bold">{sideCategoryB?.name ?? 'Software Development'}</h3>
                    <p className="text-sm text-white/70">{sideCategoryB?.description ?? 'Custom enterprise solutions & platforms.'}</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col gap-8">
                <div className="bg-brand-500 p-10 rounded-4xl h-full text-white flex flex-col justify-center text-center">
                  <h3 className="text-xl font-bold mb-4">Need something bespoke?</h3>
                  <p className="text-[#a2f0f2] text-sm mb-8">Our concierge team can find the exact match for non-standard requests.</p>
                  <Button variant="outline" className="border-[#a2f0f2]/30! text-white! bg-transparent! hover:bg-brand-400! rounded-xl">
                    Contact Concierge
                  </Button>
                </div>
              </div>

              <div className="md:col-span-4 group cursor-pointer" onClick={() => navigate('/services')}>
                <div className="relative h-100 rounded-4xl overflow-hidden">
                  <img src={secondaryCategoryImageB} alt="Brand Identity" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" loading="lazy" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 to-transparent" />
                  <div className="absolute bottom-8 left-8 text-white">
                    <h3 className="text-xl font-bold">Brand Identity</h3>
                    <p className="text-sm text-white/70">Visual narratives for modern leaders.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-8 bg-[#f9f9fc]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 max-w-3xl mx-auto">
              <span className="text-brand-500 font-bold tracking-[0.2em] uppercase text-sm">The Process</span>
              <h2 className="text-5xl font-bold tracking-tight mt-4 leading-tight">A Frictionless Bridge to Expertise.</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              {[
                {
                  idx: '01',
                  title: 'Curate Your Brief',
                  body: 'Define your requirements with our architectural briefing tool. We focus on outcome-based specifications to ensure precision.',
                },
                {
                  idx: '02',
                  title: 'Select Your Pro',
                  body: 'Review a hand-picked shortlist of vetted experts. View their servify portfolios and verified performance metrics.',
                },
                {
                  idx: '03',
                  title: 'Execute & Refine',
                  body: 'Collaborate through our integrated workflow tools. We manage the administrative layers so you can focus on the results.',
                },
              ].map((step) => (
                <div key={step.idx} className="relative group">
                  <div className="text-[7rem] font-black text-brand-100 absolute -top-20 -left-4 -z-10">{step.idx}</div>
                  <div className="space-y-6">
                    <div className="w-14 h-14 bg-[#e2e2e5] rounded-xl flex items-center justify-center text-brand-500 font-bold">{step.idx}</div>
                    <h3 className="text-2xl font-bold">{step.title}</h3>
                    <p className="text-[#3f4949] leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-8 bg-brand-50/70">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <h2 className="text-4xl font-bold tracking-tight">Trusted by Industry Authorities</h2>
              <div className="grid grid-cols-2 gap-x-12 gap-y-10 opacity-60">
                {['VOGUE', 'DESIGN CO.', 'FORBES', 'LUXE'].map((brand) => (
                  <div key={brand} className="font-black text-xl tracking-tighter">{brand}</div>
                ))}
              </div>
            </div>

            <div className="bg-white p-12 rounded-[2.5rem] servify-shadow relative">
              <div className="space-y-8">
                <p className="text-2xl font-medium leading-relaxed italic">
                  "Servify transformed how we source talent for our flagship projects. It's not a marketplace; it's a premium extension of our own hiring team."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden">
                    <img src={landingImages.testimonial} alt="User testimonial" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <p className="font-bold">Marcus Sterling</p>
                    <p className="text-sm text-[#3f4949]">Creative Director, Sterling & Co.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-8">
          <div className="max-w-7xl mx-auto rounded-[3rem] bg-brand-500 relative overflow-hidden flex flex-col items-center text-center p-20">
            <div className="relative z-10 space-y-8 max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold text-white">Ready to Elevate Your Standards?</h2>
              <p className="text-[#a2f0f2] text-lg">Join the world's most sophisticated network of professional services today.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-white text-brand-500 hover:bg-[#c7e5e6]" onClick={() => navigate('/signup')}>
                  Get Started Now
                </Button>
                <Button size="lg" variant="outline" className="border-white/30! text-white! bg-transparent! hover:bg-white/10!" onClick={() => navigate('/services')}>
                  Browse the Gallery
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
