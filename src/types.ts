export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  icon: string;
  rating: number;
  reviewsCount: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  jobsCompleted: number;
  avatar: string;
  verified: boolean;
}

export interface Booking {
  id: string;
  serviceId: string;
  userId: string;
  proId?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  date: string;
  timeSlot: string;
  address: string;
  totalPrice: number;
  trackingSteps: TrackingStep[];
}

export interface TrackingStep {
  status: string;
  timestamp: string;
  completed: boolean;
}

export type UserRole = 'user' | 'professional' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  walletBalance: number;
}
