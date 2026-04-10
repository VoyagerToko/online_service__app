# Stitch Project 1373415402685740512 Integration Map

This document maps all 8 Stitch screens to the current React routes/components and backend APIs in execution order.

## 1. Landing Page
- Stitch screen: `37a377e553c34270a8a30d36cc0a2ce9`
- Title: `Landing Page`
- Route/component: `/` -> `src/pages/LandingPage.tsx`
- Backend bindings:
  - `GET /api/v1/categories/`
  - `GET /api/v1/services/`
  - `GET /api/v1/professionals/`

## 2. Browse Services
- Stitch screen: `09fb926846c44f74afea768d88aa439d`
- Title: `Browse Services`
- Route/component: `/services` -> `src/pages/ServicesPage.tsx`
- Backend bindings:
  - `GET /api/v1/categories/`
  - `GET /api/v1/services/`

## 3. Professional Profile
- Stitch screen: `f60328f2270b420bbaf91f920ff887cc`
- Title: `Professional Profile`
- Route/component: `/professionals/:proId` -> `src/pages/ProfessionalProfilePage.tsx`
- Backend bindings:
  - `GET /api/v1/professionals/{id}`
  - `GET /api/v1/reviews/professional/{id}`

## 4. Booking and Checkout
- Stitch screen: `5af0a2f7b33d450eadec1165555c80c5`
- Title: `Booking and Checkout`
- Route/component: `/book/:proId` -> `src/pages/BookingFlow.tsx`
- Backend bindings:
  - `POST /api/v1/bookings/`
  - optional quote flow: `POST /api/v1/bookings/quote`

## 5. Messages and Chat
- Stitch screen: `30f9539553694561a6fbcb2e3de9fe5f`
- Title: `Messages & Chat`
- Route/component: `/messages` -> `src/pages/MessagesPage.tsx`
- Backend bindings:
  - `GET /api/v1/notifications/`
  - `PATCH /api/v1/notifications/{id}/read`
  - `PATCH /api/v1/notifications/read-all`
- Note: no dedicated REST chat threads/messages endpoint exists yet; this screen is wired to notification stream for now.

## 6. User Dashboard
- Stitch screen: `8d8a037d990242d1938e0a9fd0c5b352`
- Title: `User Dashboard`
- Route/component: `/dashboard` (user role) -> `src/pages/UserDashboard.tsx`
- Backend bindings:
  - `GET /api/v1/bookings/`

## 7. Pro Dashboard
- Stitch screen: `a1903a70e1e04ed69a33b3dbdf897c11`
- Title: `Pro Dashboard`
- Route/component: `/dashboard` and `/pro-dashboard` (professional role) -> `src/pages/ProfessionalDashboard.tsx`
- Backend bindings:
  - `GET /api/v1/bookings/`
  - `PATCH /api/v1/bookings/{id}/accept`
  - `PATCH /api/v1/bookings/{id}/reject`
  - `PATCH /api/v1/bookings/{id}/start`
  - `PATCH /api/v1/bookings/{id}/complete`
  - `PATCH /api/v1/professionals/me`

## 8. Earnings and Analytics
- Stitch screen: `148fe0bd692c403080bf7b20a3509f55`
- Title: `Earnings & Analytics`
- Route/component: `/admin/analytics` -> `src/pages/AdminDashboard.tsx`
- Backend bindings:
  - `GET /api/v1/admin/analytics`
  - `GET /api/v1/professionals/`
  - `GET /api/v1/admin/kyc`
  - `PATCH /api/v1/admin/kyc/{doc_id}/approve`
  - `PATCH /api/v1/admin/kyc/{doc_id}/reject`