import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EventForm = lazy(() => import('./pages/EventForm'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Invite = lazy(() => import('./pages/Invite'));
const MyInvitations = lazy(() => import('./pages/MyInvitations'));
const MyTickets = lazy(() => import('./pages/MyTickets'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const PublicEvents = lazy(() => import('./pages/PublicEvents'));
const PublicEvent = lazy(() => import('./pages/PublicEvent'));
const GuestPass = lazy(() => import('./pages/GuestPass'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-ink">
              <div className="gold-ring" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/events" element={<PublicEvents />} />
            <Route path="/events/:id/request" element={<PublicEvent />} />
            <Route path="/guest-pass/:token" element={<GuestPass />} />
            <Route path="/login" element={<Login />} />
            <Route path="/invite/:token" element={<Invite />} />

            <Route path="/dashboard" element={<ProtectedRoute roles={['host']}><Dashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['host']}><Admin /></ProtectedRoute>} />
            <Route path="/events/new" element={<ProtectedRoute roles={['host']}><EventForm /></ProtectedRoute>} />
            <Route path="/events/:id/edit" element={<ProtectedRoute roles={['host']}><EventForm /></ProtectedRoute>} />
            <Route path="/events/:id" element={<ProtectedRoute roles={['host']}><EventDetail /></ProtectedRoute>} />
            <Route path="/events/:id/scan" element={<ProtectedRoute roles={['host']}><Scanner /></ProtectedRoute>} />
            <Route path="/events/:id/attendance" element={<ProtectedRoute roles={['host']}><Attendance /></ProtectedRoute>} />

            <Route path="/my-invitations" element={<ProtectedRoute roles={['attendee']}><MyInvitations /></ProtectedRoute>} />
            <Route path="/my-tickets" element={<ProtectedRoute roles={['attendee']}><MyTickets /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute roles={['host','attendee']}><Profile /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
