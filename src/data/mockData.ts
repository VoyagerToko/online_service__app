import { Category, Service, Professional } from '../types';

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Electrical', icon: 'Zap', description: 'Repairs, wiring, and installations' },
  { id: '2', name: 'Plumbing', icon: 'Droplets', description: 'Leaks, pipes, and fixtures' },
  { id: '3', name: 'Cleaning', icon: 'Sparkles', description: 'Deep cleaning and sanitization' },
  { id: '4', name: 'Appliance', icon: 'Tv', description: 'AC, Fridge, Washing Machine' },
  { id: '5', name: 'Painting', icon: 'Paintbrush', description: 'Interior and exterior painting' },
  { id: '6', name: 'Carpentry', icon: 'Hammer', description: 'Furniture repair and assembly' },
];

export const SERVICES: Service[] = [
  {
    id: 's1',
    name: 'AC Deep Cleaning',
    category: '4',
    description: 'Complete foam cleaning of indoor and outdoor units.',
    basePrice: 599,
    icon: 'Wind',
    rating: 4.8,
    reviewsCount: 1240,
  },
  {
    id: 's2',
    name: 'Fan Repair',
    category: '1',
    description: 'Fixing noise, speed issues, or complete motor check.',
    basePrice: 199,
    icon: 'RotateCw',
    rating: 4.6,
    reviewsCount: 850,
  },
  {
    id: 's3',
    name: 'Bathroom Deep Cleaning',
    category: '3',
    description: 'Stain removal, floor scrubbing, and disinfection.',
    basePrice: 899,
    icon: 'Bath',
    rating: 4.9,
    reviewsCount: 2100,
  },
];

export const PROFESSIONALS: Professional[] = [
  {
    id: 'p1',
    name: 'Rahul Sharma',
    specialty: 'Expert Electrician',
    rating: 4.9,
    jobsCompleted: 450,
    avatar: 'https://picsum.photos/seed/rahul/200/200',
    verified: true,
  },
  {
    id: 'p2',
    name: 'Amit Kumar',
    specialty: 'Master Plumber',
    rating: 4.7,
    jobsCompleted: 320,
    avatar: 'https://picsum.photos/seed/amit/200/200',
    verified: true,
  },
];
