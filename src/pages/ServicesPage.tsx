import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, Star, ArrowRight } from 'lucide-react';
import { professionalsApi, type Service, type Category, type Professional } from '../api/client';
import { Link, useSearchParams } from 'react-router-dom';
import { getMeaningfulImage } from '../utils/meaningfulImages';

const specialtyToCategoryId = (specialty: string): string => {
  const slug = specialty
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `specialty-${slug || 'general'}`;
};

const buildServicesFromProfessionals = (
  professionals: Professional[],
): { services: Service[]; categories: Category[] } => {
  const categoryMap = new Map<string, Category>();

  const services = professionals.map((professional) => {
    const specialty = professional.specialty?.trim() || 'General Service';
    const categoryId = specialtyToCategoryId(specialty);

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        id: categoryId,
        name: specialty,
        icon: 'Briefcase',
        description: `Services offered by ${specialty.toLowerCase()} professionals`,
        is_active: true,
      });
    }

    const providerName = professional.name?.trim() || 'Professional';
    const startingPrice =
      typeof professional.starting_price === 'number' && professional.starting_price >= 0
        ? professional.starting_price
        : 0;

    return {
      id: professional.id,
      category_id: categoryId,
      name: providerName,
      description: professional.bio?.trim() || `${specialty} by ${providerName}.`,
      base_price: startingPrice,
      icon: 'Briefcase',
      is_active: true,
      avg_rating: professional.avg_rating,
      reviews_count: professional.total_jobs,
    };
  });

  return {
    services,
    categories: Array.from(categoryMap.values()),
  };
};

export const ServicesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'price-asc' | 'price-desc' | 'rating-desc'>('relevance');
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    professionalsApi.list()
      .then((pros) => {
        const mapped = buildServicesFromProfessionals(pros);
        setCategories(mapped.categories);
        setServices(mapped.services);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const category = searchParams.get('category') ?? 'all';
    setSearchQuery(q);
    setSelectedCategory(category);
  }, [searchParams]);

  useEffect(() => {
    if (selectedCategory === 'all') return;
    const categoryExists = categories.some((category) => category.id === selectedCategory);
    if (!categoryExists) {
      setSelectedCategory('all');
    }
  }, [selectedCategory, categories]);

  useEffect(() => {
    const params = new URLSearchParams();
    const trimmed = searchQuery.trim();
    if (trimmed) params.set('q', trimmed);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [searchQuery, selectedCategory, searchParams, setSearchParams]);

  const maxBasePrice = useMemo(() => {
    if (!services.length) return 1000;
    return Math.max(...services.map((service) => service.base_price));
  }, [services]);

  const roundedMaxPrice = useMemo(() => {
    return Math.max(1000, Math.ceil(maxBasePrice / 50) * 50);
  }, [maxBasePrice]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  const filteredServices = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = services.filter((service) => {
      const matchesSearch =
        !normalizedSearch ||
        service.name.toLowerCase().includes(normalizedSearch) ||
        (service.description ?? '').toLowerCase().includes(normalizedSearch) ||
        (categoryNameById.get(service.category_id) ?? '').toLowerCase().includes(normalizedSearch);

      const matchesCategory = selectedCategory === 'all' || service.category_id === selectedCategory;
      const matchesRating = service.avg_rating >= minRating;
      const matchesPrice = maxPrice === '' || service.base_price <= maxPrice;

      return matchesSearch && matchesCategory && matchesRating && matchesPrice;
    });

    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => a.base_price - b.base_price);
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => b.base_price - a.base_price);
    } else if (sortBy === 'rating-desc') {
      filtered.sort((a, b) => b.avg_rating - a.avg_rating);
    }

    return filtered;
  }, [services, searchQuery, selectedCategory, minRating, maxPrice, sortBy, categoryNameById]);

  const selectedCategoryLabel =
    selectedCategory === 'all' ? 'All categories' : (categoryNameById.get(selectedCategory) ?? 'Selected category');

  const resetFilters = () => {
    setMinRating(0);
    setMaxPrice('');
    setSortBy('relevance');
    setSelectedCategory('all');
    setSearchQuery('');
  };

  return (
    <div className="pt-20">
      <div className="flex min-h-[calc(100vh-5rem)]">
        <aside className="hidden lg:flex w-80 shrink-0 flex-col bg-brand-50 p-8 h-[calc(100vh-5rem)] sticky top-20 overflow-y-auto border-r border-brand-200/20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Filters</h2>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-brand-500 underline"
            >
              Reset All
            </button>
          </div>

          <div className="mb-10">
            <h3 className="text-sm font-bold mb-4">Category</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === 'all'}
                  onChange={() => setSelectedCategory('all')}
                  className="w-4 h-4 text-brand-500 border-brand-200 focus:ring-brand-500/20"
                />
                <span className="text-sm text-slate-600 group-hover:text-brand-500 transition-colors">All Services</span>
              </label>
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === category.id}
                    onChange={() => setSelectedCategory(category.id)}
                    className="w-4 h-4 text-brand-500 border-brand-200 focus:ring-brand-500/20"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-brand-500 transition-colors">{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-sm font-bold mb-4">Price Range</h3>
            <div className="px-1">
              <input
                type="range"
                min={0}
                max={roundedMaxPrice}
                step={50}
                value={maxPrice === '' ? roundedMaxPrice : maxPrice}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= roundedMaxPrice) {
                    setMaxPrice('');
                    return;
                  }
                  setMaxPrice(value);
                }}
                className="w-full h-1.5 accent-brand-500"
              />
              <div className="flex justify-between mt-3 text-xs font-medium text-slate-500">
                <span>₹0</span>
                <span>{maxPrice === '' ? `Up to ₹${roundedMaxPrice}` : `Up to ₹${maxPrice}`}</span>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-sm font-bold mb-4">Professional Rating</h3>
            <div className="space-y-2">
              {[4.5, 4.0, 3.0, 0].map((rating) => {
                const active = minRating === rating;
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setMinRating(rating)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-white text-brand-500 servify-shadow'
                        : 'text-slate-600 hover:bg-brand-100/40'
                    }`}
                  >
                    <Star size={14} className="text-brand-500" fill={active ? 'currentColor' : 'none'} />
                    {rating === 0 ? 'Any Rating' : `${rating.toFixed(1)} & Above`}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-[#f9f9fc]">
          <header className="px-6 md:px-8 py-10 flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Discovery</h1>
              <p className="text-slate-500">
                Showing {filteredServices.length} curated service{filteredServices.length === 1 ? '' : 's'} in {selectedCategoryLabel}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand-200 bg-white text-sm font-semibold text-slate-600"
              >
                <SlidersHorizontal size={16} /> Filters
              </button>
              <span className="hidden md:block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Sort By</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'relevance' | 'price-asc' | 'price-desc' | 'rating-desc')}
                className="appearance-none bg-brand-50 border-none rounded-lg px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="relevance">Most Relevant</option>
                <option value="rating-desc">Highest Rated</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </header>

          <div className="px-6 md:px-8 pb-6">
            <div className="relative group max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search services"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-brand-200/20 focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
            </div>
          </div>

          {isFilterOpen && (
            <div className="lg:hidden mx-6 md:mx-8 mb-6 rounded-xl bg-brand-50 p-4 space-y-4 border border-brand-200/20">
              <div className="grid sm:grid-cols-2 gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-lg border border-brand-200/30 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="all">All Services</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="rounded-lg border border-brand-200/30 bg-white px-3 py-2.5 text-sm"
                >
                  <option value={0}>Any Rating</option>
                  <option value={3}>3.0 & Above</option>
                  <option value={4}>4.0 & Above</option>
                  <option value={4.5}>4.5 & Above</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-500">Max price: {maxPrice === '' ? `₹${roundedMaxPrice}` : `₹${maxPrice}`}</p>
                <button type="button" onClick={resetFilters} className="text-xs font-semibold text-brand-500 underline">Reset</button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="px-8 py-20 text-center text-slate-400">Loading services...</div>
          ) : filteredServices.length === 0 ? (
            <div className="px-8 py-20 text-center">
              <h3 className="text-2xl font-bold mb-2">No services found</h3>
              <p className="text-slate-500">Try broadening your filters.</p>
            </div>
          ) : (
            <div className="px-6 md:px-8 pb-20 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredServices.map((service) => {
                const categoryName = categoryNameById.get(service.category_id) ?? 'Curated Service';
                const imageSrc = getMeaningfulImage(
                  `${service.name} ${categoryName} ${service.description ?? ''}`,
                  service.id,
                );

                return (
                  <article
                    key={service.id}
                    className="group flex flex-col bg-white rounded-xl overflow-hidden hover:-translate-y-1 transition-transform duration-300 servify-shadow border border-brand-200/20"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={imageSrc}
                        alt={`${categoryName} service by ${service.name}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = getMeaningfulImage('home service professional', 'fallback-service-image');
                        }}
                      />
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-spark-500 text-[#ffcaaf] text-[10px] font-bold uppercase tracking-wider">
                        {service.avg_rating >= 4.8 ? 'Verified Pro' : 'Curated'}
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-xl font-bold group-hover:text-brand-500 transition-colors">{service.name}</h3>
                          <p className="text-sm font-medium text-brand-500">{categoryName}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-brand-50 px-2.5 py-1 rounded-md">
                          <Star size={14} className="text-brand-500" fill="currentColor" />
                          <span className="text-xs font-bold">{service.avg_rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-2">
                        {service.description?.trim() || 'Premium service delivery with transparent pricing and fast scheduling.'}
                      </p>

                      <div className="mt-auto pt-6 border-t border-brand-100 flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Starting From</span>
                          {service.base_price > 0 ? (
                            <p className="text-lg font-bold">₹{service.base_price}<span className="text-xs font-medium text-slate-400"> / project</span></p>
                          ) : (
                            <p className="text-sm font-semibold text-slate-400">Undefined price</p>
                          )}
                        </div>
                        <Link
                          to={`/professionals/${service.id}`}
                          className="p-3 bg-brand-500 text-white rounded-lg group-hover:scale-105 transition-transform"
                          title="View provider profile"
                        >
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
