import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import { servicesApi, type Service, type Category } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export const ServicesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      servicesApi.listCategories(),
      servicesApi.listServices(),
    ]).then(([cats, svcs]) => {
      setCategories(cats);
      setServices(svcs);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pt-28 pb-20 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-display font-bold dark:text-white mb-2">All Services</h1>
          <p className="text-slate-500 dark:text-slate-400">Find the best professionals for your home</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter size={20} /> Filters
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-12 overflow-x-auto pb-4 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all ${
            selectedCategory === 'all' 
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' 
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-brand-500'
          }`}
        >
          All Services
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat.id 
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-brand-500'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400">Loading services...</div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No services found.</div>
      ) : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredServices.map((service) => (
          <Card key={service.id} className="p-0 overflow-hidden group">
            <div className="aspect-video relative overflow-hidden">
              <img 
                src={`https://picsum.photos/seed/${service.id}/600/400`} 
                alt={service.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-xs font-bold flex items-center gap-1">
                <Star size={14} className="text-yellow-500" fill="currentColor" /> {service.avg_rating.toFixed(1)}
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold dark:text-white mb-1">{service.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{service.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Verified Professional</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Starts from</p>
                  <p className="text-2xl font-bold dark:text-white">₹{service.base_price}</p>
                </div>
                <Link to={`/book/${service.id}`}>
                  <Button className="rounded-xl">Book Now <ArrowRight size={18} className="ml-2" /></Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}

      {filteredServices.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Search size={40} />
          </div>
          <h3 className="text-2xl font-bold dark:text-white mb-2">No services found</h3>
          <p className="text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};
