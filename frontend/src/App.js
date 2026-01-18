import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import RecordMeeting from "@/pages/RecordMeeting";
import UploadMeeting from "@/pages/UploadMeeting";
import MeetingDetails from "@/pages/MeetingDetails";
import MeetingHistory from "@/pages/MeetingHistory";
import PricingPage from "@/pages/PricingPage";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";

// Layout
import AppLayout from "@/components/layout/AppLayout";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="record" element={<RecordMeeting />} />
            <Route path="upload" element={<UploadMeeting />} />
            <Route path="meeting/:id" element={<MeetingDetails />} />
            <Route path="history" element={<MeetingHistory />} />
            <Route path="subscription" element={<PricingPage />} />
            <Route path="subscription/success" element={<SubscriptionSuccess />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
