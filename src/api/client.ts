/**
 * Frontend API client — typed wrapper around fetch() for the Servify backend.
 * Import individual api objects in components.
 *
 * In dev, requests are proxied via vite.config.ts → http://localhost:8000.
 * In production, set VITE_API_BASE_URL to your backend origin.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
const BASE = API_BASE_URL
    ? (API_BASE_URL.endsWith('/api/v1') ? API_BASE_URL : `${API_BASE_URL}/api/v1`)
    : '/api/v1';

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

export const usersApi = {
    deleteMe: () => apiFetch<{ message: string }>('/users/me', { method: 'DELETE' }),
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
    listServices: (params?: {
        category_id?: string;
        search?: string;
        active_only?: boolean;
        skip?: number;
        limit?: number;
    }) => {
        const queryParams = new URLSearchParams();
        if (params?.category_id) queryParams.set('category_id', params.category_id);
        if (params?.search) queryParams.set('search', params.search);
        if (typeof params?.active_only === 'boolean') queryParams.set('active_only', String(params.active_only));
        if (typeof params?.skip === 'number') queryParams.set('skip', String(params.skip));
        if (typeof params?.limit === 'number') queryParams.set('limit', String(params.limit));
        const qs = queryParams.toString();
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

export interface Review {
    id: string;
    booking_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    comment: string | null;
    is_verified: boolean;
    is_flagged: boolean;
}

export const reviewsApi = {
    create: (booking_id: string, rating: number, comment?: string) =>
        apiFetch('/reviews/', { method: 'POST', body: JSON.stringify({ booking_id, rating, comment }) }),
    getForProfessional: (pro_id: string) => apiFetch<Review[]>(`/reviews/professional/${pro_id}`),
};

// ─── Notifications endpoints ─────────────────────────────────────────────────────

export interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    is_read: boolean;
    metadata_?: Record<string, unknown> | null;
}

export const notificationsApi = {
    list: (unread_only = false) => apiFetch<Notification[]>(`/notifications/?unread_only=${unread_only}`),
    markRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => apiFetch('/notifications/read-all', { method: 'PATCH' }),
};

// ─── Messaging endpoints ───────────────────────────────────────────────────────

export interface Conversation {
    id: string;
    user_id: string;
    professional_id: string;
    booking_id: string | null;
    counterpart_user_id: string;
    counterpart_name: string;
    counterpart_avatar_url: string | null;
    last_message_preview: string | null;
    last_message_at: string | null;
    unread_count: number;
    created_at: string;
    updated_at: string;
}

export interface ConversationMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_name: string | null;
    sender_role: 'user' | 'professional';
    body: string;
    read_at: string | null;
    created_at: string;
    is_mine: boolean;
}

export const messagesApi = {
    listConversations: (params?: { booking_id?: string; skip?: number; limit?: number }) => {
        const queryParams = new URLSearchParams();
        if (params?.booking_id) queryParams.set('booking_id', params.booking_id);
        if (typeof params?.skip === 'number') queryParams.set('skip', String(params.skip));
        if (typeof params?.limit === 'number') queryParams.set('limit', String(params.limit));
        const qs = queryParams.toString();
        return apiFetch<Conversation[]>(`/messages/conversations${qs ? `?${qs}` : ''}`);
    },

    createConversation: (data: {
        professional_id?: string;
        user_id?: string;
        booking_id?: string;
        initial_message?: string;
    }) => apiFetch<Conversation>('/messages/conversations', { method: 'POST', body: JSON.stringify(data) }),

    listMessages: (conversationId: string, params?: { skip?: number; limit?: number }) => {
        const queryParams = new URLSearchParams();
        if (typeof params?.skip === 'number') queryParams.set('skip', String(params.skip));
        if (typeof params?.limit === 'number') queryParams.set('limit', String(params.limit));
        const qs = queryParams.toString();
        return apiFetch<ConversationMessage[]>(`/messages/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`);
    },

    sendMessage: (conversationId: string, body: string) =>
        apiFetch<ConversationMessage>(`/messages/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ body }),
        }),

    markConversationRead: (conversationId: string) =>
        apiFetch<{ updated: number }>(`/messages/conversations/${conversationId}/read`, {
            method: 'POST',
        }),
};

// ─── Admin endpoints ─────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
    total_users: number;
    total_professionals: number;
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    cancellation_rate: number;
    total_revenue: number;
    open_disputes: number;
    pending_kyc: number;
}

export interface KycDocument {
    id: string;
    pro_id: string;
    doc_type: string;
    file_url: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
}

export interface AdminAccount {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'professional' | 'admin';
    is_active: boolean;
    is_blocked: boolean;
    is_email_verified: boolean;
    created_at: string;
    professional_id?: string | null;
    is_suspended?: boolean | null;
}

export const adminApi = {
    analytics: () => apiFetch<AnalyticsSummary>('/admin/analytics'),
    listUsers: (params?: { role?: 'user' | 'professional' | 'admin'; skip?: number; limit?: number }) => {
        const queryParams = new URLSearchParams();
        if (params?.role) queryParams.set('role', params.role);
        if (typeof params?.skip === 'number') queryParams.set('skip', String(params.skip));
        if (typeof params?.limit === 'number') queryParams.set('limit', String(params.limit));
        const qs = queryParams.toString();
        return apiFetch<AdminAccount[]>(`/admin/users${qs ? `?${qs}` : ''}`);
    },
    grantAdmin: (userId: string) => apiFetch<{ message: string }>(`/admin/users/${userId}/grant-admin`, { method: 'PATCH' }),
    blockUser: (userId: string) => apiFetch<{ message: string }>(`/admin/users/${userId}/block`, { method: 'PATCH' }),
    unblockUser: (userId: string) => apiFetch<{ message: string }>(`/admin/users/${userId}/unblock`, { method: 'PATCH' }),
    suspendUser: (userId: string) => apiFetch<{ message: string }>(`/admin/users/${userId}/suspend`, { method: 'PATCH' }),
    reinstateUser: (userId: string) => apiFetch<{ message: string }>(`/admin/users/${userId}/reinstate`, { method: 'PATCH' }),
    deleteUser: (userId: string) => apiFetch<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' }),
    listKyc: (status_filter: 'pending' | 'approved' | 'rejected' = 'pending') =>
        apiFetch<KycDocument[]>(`/admin/kyc?status_filter=${status_filter}`),
    approveKyc: (docId: string) => apiFetch<{ message: string }>(`/admin/kyc/${docId}/approve`, { method: 'PATCH' }),
    rejectKyc: (docId: string) => apiFetch<{ message: string }>(`/admin/kyc/${docId}/reject`, { method: 'PATCH' }),
};

// ─── Professionals endpoints ─────────────────────────────────────────────────────

export interface Professional {
    id: string;
    user_id: string;
    name?: string | null;
    avatar_url?: string | null;
    specialty: string;
    bio: string | null;
    experience_years: number;
    is_available: boolean;
    avg_rating: number;
    total_jobs: number;
    is_kyc_verified: boolean;
    is_suspended: boolean;
    starting_price?: number;
    public_phone?: string | null;
    public_email?: string | null;
    whatsapp_number?: string | null;
    website_url?: string | null;
    contact_address?: string | null;
    photo_urls?: string[];
}

export const professionalsApi = {
    list: (params?: { specialty?: string }) => {
        const qs = new URLSearchParams(params as Record<string, string>).toString();
        return apiFetch<Professional[]>(`/professionals/${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => apiFetch<Professional>(`/professionals/${id}`),
    updateMe: (data: {
        specialty?: string;
        bio?: string;
        is_available?: boolean;
        experience_years?: number;
        starting_price?: number;
        public_phone?: string;
        public_email?: string;
        whatsapp_number?: string;
        website_url?: string;
        contact_address?: string;
        photo_urls?: string[];
    }) =>
        apiFetch<Professional>('/professionals/me', { method: 'PATCH', body: JSON.stringify(data) }),
    uploadPhoto: async (file: File): Promise<Professional> => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${BASE}/professionals/me/photos`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(body.detail ?? 'Failed to upload photo');
        }

        return res.json();
    },
    removePhoto: (photo_url: string) =>
        apiFetch<Professional>('/professionals/me/photos', {
            method: 'DELETE',
            body: JSON.stringify({ photo_url }),
        }),
};
