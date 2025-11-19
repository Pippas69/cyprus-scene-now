import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import { UserLayout } from "@/components/layouts/UserLayout";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Ekdiloseis from "./pages/Ekdiloseis";
import Xartis from "./pages/Xartis";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SignupBusiness from "./pages/SignupBusiness";
import DashboardBusiness from "./pages/DashboardBusiness";
import DashboardUser from "./pages/DashboardUser";
import AdminVerification from "./pages/AdminVerification";
import AdminGeocoding from "./pages/AdminGeocoding";
import BusinessProfile from "./pages/BusinessProfile";
import EventDetail from "./pages/EventDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to conditionally render BottomNav
function AppContent() {
  const location = window.location;
  const userLayoutRoutes = ['/feed', '/ekdiloseis', '/xartis', '/dashboard-user'];
  const hideBottomNav = userLayoutRoutes.some(route => location.pathname.startsWith(route));

  return (
    <>
      <div className="min-h-screen pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/feed" element={<UserLayout><Feed /></UserLayout>} />
          <Route path="/ekdiloseis" element={<UserLayout><Ekdiloseis /></UserLayout>} />
          <Route path="/xartis" element={<UserLayout><Xartis /></UserLayout>} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signup-business" element={<SignupBusiness />} />
          <Route path="/dashboard-user/*" element={<UserLayout><DashboardUser /></UserLayout>} />
          <Route path="/dashboard-business/*" element={<DashboardBusiness />} />
          <Route path="/admin/verification" element={<AdminVerification />} />
          <Route path="/admin/geocoding" element={<AdminGeocoding />} />
          <Route path="/business/:businessId" element={<BusinessProfile />} />
          <Route path="/event/:eventId" element={<EventDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!hideBottomNav && <BottomNav />}
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
