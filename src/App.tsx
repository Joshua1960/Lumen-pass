import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EventForm from './pages/EventForm';
import EventDetail from './pages/EventDetail';
import Scanner from './pages/Scanner';
import Attendance from './pages/Attendance';
import Invite from './pages/Invite';
import MyInvitations from './pages/MyInvitations';
import MyTickets from './pages/MyTickets';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import PublicEvents from './pages/PublicEvents';
import PublicEvent from './pages/PublicEvent';
import GuestPass from './pages/GuestPass';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}
