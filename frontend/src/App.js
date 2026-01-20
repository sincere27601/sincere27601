import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import RecordMeeting from "@/pages/RecordMeeting";
import UploadMeeting from "@/pages/UploadMeeting";
import MeetingDetails from "@/pages/MeetingDetails";
import MeetingHistory from "@/pages/MeetingHistory";
import ProfilePage from "@/pages/ProfilePage";

// Layout
import AppLayout from "@/components/layout/AppLayout";

// Router wrapper to handle auth callback
const AppRouter = () => {
  const location = useLocation();
  
  // Check URL fragment for session_id (Google OAuth callback)
  // This must be checked synchronously during render to prevent race conditions
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/app" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="record" element={<RecordMeeting />} />
        <Route path="upload" element={<UploadMeeting />} />
        <Route path="meeting/:id" element={<MeetingDetails />} />
        <Route path="history" element={<MeetingHistory />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
