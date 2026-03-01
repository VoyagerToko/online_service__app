/**
 * Frontend API client — typed wrapper around fetch() for the Servify backend.
 * Import individual api objects in components.
 *
 * Base URL is proxied via vite.config.ts → http://localhost:8000
 * so all requests go to /api/v1/... without CORS issues in dev.
 */

const BASE = '/api/v1';

// ─── Auth helpers ──────────────────────────────────────────────────────────────

function getToken(): string | null {
    return localStorage.getItem('servify_token');
}

function setToken(token: string): void {
    localStorage.setItem('servify_token', token);
}

function clearToken(): void {
    localStorage.removeItem('servify_token');
    localStorage.removeItem('servify_user');
}

// ─── Generic fetch wrapper ─────────────────────────────────────────────────────

async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(`${BASE}${path}`, { ...options, headers });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        // FastAPI 422 validation errors return detail as an array of objects
        let message: string;
        if (Array.isArray(body.detail)) {
            message = body.detail.map((d: { msg: string; loc?: string[] }) =>
                d.loc ? `${d.loc.slice(-1)[0]}: ${d.msg}` : d.msg
            ).join(', ');
        } else {
            message = body.detail ?? 'An unexpected error occurred';
        }
        throw new Error(message);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
}

// ─── Auth endpoints ─────────────────────────────────────────────────────────────

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: UserProfile;
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'professional' | 'admin';
    avatar_url: string | null;
    wallet_balance: number;
    is_email_verified: boolean;
    created_at: string;
}

export const authApi = {
    register: (data: {
        name: string;
        email: string;
        password: string;
        phone?: string;
        role?: string;
        specialty?: string;
    }) => apiFetch<UserProfile>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    login: async (email: string, password: string): Promise<TokenResponse> => {
        const res = await apiFetch<TokenResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setToken(res.access_token);
        localStorage.setItem('servify_refresh_token', res.refresh_token);
        localStorage.setItem('servify_user', JSON.stringify(res.user));
        return res;
    },

    logout: () => { clearToken(); },

    me: () => apiFetch<UserProfile>('/auth/me'),

    forgotPassword: (email: string) =>
        apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

    resetPassword: (token: string, new_password: string) =>
        apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
};

// ─── Services endpoints ─────────────────────────────────────────────────────────

export interface Service {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    base_price: number;
    icon: string;
    is_active: boolean;
    avg_rating: number;
    reviews_count: number;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    description: string | null;
    is_active: boolean;
}

export const servicesApi = {
    listCategories: () => apiFetch<Category[]>('/categories/'),
    listServices: (params?: { category_id?: string; search?: string }) => {
        const qs = new URLSearchParams(params as Record<string, string>).toString();
        return apiFetch<Service[]>(`/services/${qs ? `?${qs}` : ''}`);
    },
    getService: (id: string) => apiFetch<Service>(`/services/${id}`),
};

// ─── Bookings endpoints ─────────────────────────────────────────────────────────

export interface Booking {
    id: string;
    service_id: string | null;
    user_id: string;
    pro_id: string | null;
    status: string;
    scheduled_date: string;
    time_slot: string;
    address: string;
    description: string | null;
    base_price: number;
    addons: { name: string; price: number }[] | null;
    platform_fee: number;
    tax: number;
    total_price: number;
    notes: string | null;
}

export interface PriceQuote {
    base_price: number;
    addons_total: number;
    dynamic_multiplier: number;
    subtotal: number;
    platform_fee: number;
    tax: number;
    total: number;
}

export const bookingsApi = {
    getQuote: (service_id: string, addons?: { name: string; price: number }[]) =>
        apiFetch<PriceQuote>('/bookings/quote', {
            method: 'POST',
            body: JSON.stringify({ service_id, addons }),
        }),

    create: (data: {
        service_id?: string;
        pro_id?: string;
        description?: string;
        scheduled_date: string;
        time_slot: string;
        address: string;
        notes?: string;
    }) => apiFetch<Booking>('/bookings/', { method: 'POST', body: JSON.stringify(data) }),

    list: () => apiFetch<Booking[]>('/bookings/'),
    get: (id: string) => apiFetch<Booking>(`/bookings/${id}`),
    accept: (id: string) => apiFetch<Booking>(`/bookings/${id}/accept`, { method: 'PATCH' }),
    reject: (id: string) => apiFetch<Booking>(`/bookings/${id}/reject`, { method: 'PATCH' }),
    markInProgress: (id: string) => apiFetch<Booking>(`/bookings/${id}/start`, { method: 'PATCH' }),
    markComplete: (id: string) => apiFetch<Booking>(`/bookings/${id}/complete`, { method: 'PATCH' }),
    cancel: (id: string, reason: string) =>
        apiFetch<Booking>(`/bookings/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
    reschedule: (id: string, new_date: string, new_slot: string) =>
        apiFetch<Booking>(`/bookings/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify({ new_date, new_slot }) }),
    getTimeline: (id: string) => apiFetch<object[]>(`/bookings/${id}/timeline`),
};

// ─── Reviews endpoints ──────────────────────────────────────────────────────────

export const reviewsApi = {
    create: (booking_id: string, rating: number, comment?: string) =>
        apiFetch('/reviews/', { method: 'POST', body: JSON.stringify({ booking_id, rating, comment }) }),
    getForProfessional: (pro_id: string) => apiFetch(`/reviews/professional/${pro_id}`),
};

// ─── Notifications endpoints ─────────────────────────────────────────────────────

export const notificationsApi = {
    list: (unread_only = false) => apiFetch(`/notifications/?unread_only=${unread_only}`),
    markRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => apiFetch('/notifications/read-all', { method: 'PATCH' }),
};

// ─── Professionals endpoints ─────────────────────────────────────────────────────

export interface Professional {
    id: string;
    user_id: string;
    specialty: string;
    bio: string | null;
    experience_years: number;
    is_available: boolean;
    avg_rating: number;
    total_jobs: number;
    is_kyc_verified: boolean;
    is_suspended: boolean;
}

export const professionalsApi = {
    list: (params?: { specialty?: string }) => {
        const qs = new URLSearchParams(params as Record<string, string>).toString();
        return apiFetch<Professional[]>(`/professionals/${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => apiFetch<Professional>(`/professionals/${id}`),
    updateMe: (data: { specialty?: string; bio?: string; is_available?: boolean; experience_years?: number }) =>
        apiFetch<Professional>('/professionals/me', { method: 'PATCH', body: JSON.stringify(data) }),
};
