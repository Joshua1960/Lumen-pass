import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EventForm from "./pages/EventForm";
import EventDetail from "./pages/EventDetail";
import Scanner from "./pages/Scanner";
import Attendance from "./pages/Attendance";
import Invite from "./pages/Invite";
import MyInvitations from "./pages/MyInvitations";
import MyTickets from "./pages/MyTickets";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/invite/:token" element={<Invite />} />

          {/* Host doors — event organizers only */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["host"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/new"
            element={
              <ProtectedRoute roles={["host"]}>
                <EventForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/edit"
            element={
              <ProtectedRoute roles={["host"]}>
                <EventForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute roles={["host"]}>
                <EventDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/scan"
            element={
              <ProtectedRoute roles={["host"]}>
                <Scanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id/attendance"
            element={
              <ProtectedRoute roles={["host"]}>
                <Attendance />
              </ProtectedRoute>
            }
          />

          {/* Attendee doors — guests only */}
          <Route
            path="/my-invitations"
            element={
              <ProtectedRoute roles={["attendee"]}>
                <MyInvitations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tickets"
            element={
              <ProtectedRoute roles={["attendee"]}>
                <MyTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={["attendee"]}>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
