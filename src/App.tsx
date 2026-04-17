// OPTIMIZED
import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationBanner } from "./components/NotificationBanner";
import ElevenLabsWidget from "./components/ElevenLabsWidget";
import OAuthCallback from "./components/OAuthCallback";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy Load Pages
const AboutPage = lazy(() => import("./pages/AboutPage"));
const Landing = lazy(() => import("./pages/Landing"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const Listings = lazy(() => import("./pages/Listings"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const SubmitListing = lazy(() => import("./pages/SubmitListing"));
const AIListing = lazy(() => import("./pages/AIListing"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BlogManagement = lazy(() => import("./pages/BlogManagement"));
const AdEditor = lazy(() => import("./pages/AdEditor"));
const TermsManagement = lazy(() => import("./pages/TermsManagement"));
const TopProfilesManagement = lazy(() => import("./pages/TopProfilesManagement"));
const InfluencerPartnersManagement = lazy(() => import("./pages/InfluencerPartnersManagement"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const LeaderboardManagement = lazy(() => import("./pages/LeaderboardManagement"));
const NotificationManagement = lazy(() => import("./pages/NotificationManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CouponManagement = lazy(() => import("./pages/CouponManagement"));
const PackageManagement = lazy(() => import("./pages/PackageManagement"));
const Inbox = lazy(() => import("./pages/Inbox"));
const TermsAndConditionPage = lazy(() => import("./pages/Terms&Condition"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const BoostPackageManagement = lazy(() => import("./pages/BoostPackageManagement"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// ✅ Android Back Button Handler
const AndroidBackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cleanupFn: (() => void) | null = null;

    const setupBackButton = async () => {
      try {
        // Dynamically import @capacitor/app only on native platforms
        const { App } = await import("@capacitor/app");
        const { Capacitor } = await import("@capacitor/core");

        if (!Capacitor.isNativePlatform()) return;

        const handler = await App.addListener("backButton", () => {
          // If we're on the home/root page, show exit confirmation
          if (location.pathname === "/" || location.pathname === "") {
            App.exitApp();
          } else {
            navigate(-1);
          }
        });

        cleanupFn = () => handler.remove();
      } catch {
        // Not running on native — ignore silently
      }
    };

    setupBackButton();

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [navigate, location.pathname]);

  return null;
};

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <AndroidBackHandler />
            <NotificationBanner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/listings" element={<Listings />} />
                <Route path="/listings/:slugId" element={<ListingDetail />} />
                <Route path="/submit-listing" element={<SubmitListing />} />
                <Route path="/submit-listing-ai" element={<AIListing />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/blogs" element={<BlogManagement />} />
                <Route path="/admin/ad-editor" element={<AdEditor />} />
                <Route path="/admin/terms" element={<TermsManagement />} />
                <Route path="/admin/top-profiles" element={<TopProfilesManagement />} />
                <Route path="/admin/influencer-partners" element={<InfluencerPartnersManagement />} />
                <Route path="/admin/leaderboard" element={<LeaderboardManagement />} />
                <Route path="/admin/notifications" element={<NotificationManagement />} />
                <Route path="/admin/coupons" element={<CouponManagement />} />
                <Route path="/admin/boost-packages" element={<BoostPackageManagement />} />
                <Route path="/manage-packages" element={<PackageManagement />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditionPage />} />
                <Route path="/blog/:id" element={<BlogPost />} />
                <Route path="/auth/callback" element={<OAuthCallback />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <ElevenLabsWidget />
          </HashRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
