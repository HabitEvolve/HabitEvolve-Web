import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import OAuthCallback from "./pages/AuthPages/OAuthCallback";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import NotFound from "./pages/OtherPage/NotFound";
import Unauthorized from "./pages/OtherPage/Unauthorized";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import UserProfiles from "./pages/UserProfiles";

/** Renders AppLayout for ADMIN, MentorLayout for MENTOR — used by shared profile routes. */
function RoleLayout() {
  const { hasRole } = useAuth();
  return hasRole("ADMIN") ? <AppLayout /> : <MentorLayout />;
}
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import MentorLayout from "./layout/MentorLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import UserManagement from "./pages/UserManagement";
import EditProfile from "./pages/EditProfile";
import TargetRuleManagement from "./pages/TargetRuleManagement";
import QuestionnaireManagement from "./pages/QuestionnaireManagement";
import AdminCourtManagement from "./pages/AdminCourtManagement";
import AdminBossManagement from "./pages/AdminBossManagement";
import AdminDailyBossManagement from "./pages/AdminDailyBossManagement";
import AdminQuestLibraryManagement from "./pages/AdminQuestLibraryManagement";
import AdminSystemOpsPage from "./pages/AdminSystemOpsPage";
import AdminSubscriptionPage from "./pages/AdminSubscriptionPage";
import AdminConfigPage from "./pages/AdminConfigPage";
import AdminItemManagement from "./pages/AdminItemManagement";
import AdminSystemJobsPage from "./pages/AdminSystemJobsPage";
import AdminLootTableManagement from "./pages/AdminLootTableManagement";
import AdminShopManagement from "./pages/AdminShopManagement";
import GoalTaskEngineHub from "./pages/GoalTaskEngineHub";
import AdminEconomyHub from "./pages/AdminEconomyHub";
import AdminNotificationBroadcast from "./pages/AdminNotificationBroadcast";
import AdminJobsMonitor from "./pages/AdminJobsMonitor";
import AdminAuditLog from "./pages/AdminAuditLog";
import AdminAppealQueue from "./pages/AdminAppealQueue";
import MentorDashboard from "./pages/Mentor/MentorDashboard";
import SubscriptionWallet from "./pages/Mentor/SubscriptionWallet";
import PartyList from "./pages/Mentor/PartyList";
import PartyWorkspace from "./pages/Mentor/PartyWorkspace/PartyWorkspace";
import OverviewTab from "./pages/Mentor/PartyWorkspace/OverviewTab";
import QuestForgeTab from "./pages/Mentor/PartyWorkspace/QuestForgeTab";
import ProofsTab from "./pages/Mentor/PartyWorkspace/ProofsTab";
import BossRaidTab from "./pages/Mentor/PartyWorkspace/BossRaidTab";
import RallyTab from "./pages/Mentor/PartyWorkspace/RallyTab";
import PaymentResultPage from "./pages/Mentor/PaymentResultPage";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/reset-password" element={<ForgotPassword />} />
          {/* Shared profile routes — accessible by ADMIN and MENTOR, layout auto-selected */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MENTOR']} />}>
            <Route element={<RoleLayout />}>
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/edit-profile" element={<EditProfile />} />
            </Route>
          </Route>

          {/* Dashboard Layout — protected: ADMIN role required */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route element={<AppLayout />}>

              <Route index path="/home" element={<Home />} />
              <Route path="/admin/dashboard" element={<Navigate to="/home" replace />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/target-rules" element={<TargetRuleManagement />} />
              <Route path="/goal-engine" element={<GoalTaskEngineHub />} />
              <Route path="/questionnaires" element={<QuestionnaireManagement />} />
              <Route path="/court-management" element={<AdminCourtManagement />} />
              <Route path="/boss-management" element={<AdminBossManagement />} />
              <Route path="/daily-boss" element={<AdminDailyBossManagement />} />
              <Route path="/quest-library" element={<AdminQuestLibraryManagement />} />
              <Route path="/admin/economy" element={<AdminEconomyHub />} />
              <Route path="/admin/notifications/broadcast" element={<AdminNotificationBroadcast />} />
              <Route path="/admin/jobs" element={<AdminJobsMonitor />} />
              <Route path="/admin/audit-log" element={<AdminAuditLog />} />
              <Route path="/admin/appeals" element={<AdminAppealQueue />} />
              <Route path="/subscription-packages" element={<AdminSubscriptionPage />} />
              <Route path="/system-config" element={<AdminConfigPage />} />
              <Route path="/system-ops" element={<AdminSystemOpsPage />} />
              <Route path="/system-jobs" element={<AdminSystemJobsPage />} />
              <Route path="/item-catalog" element={<AdminItemManagement />} />
              <Route path="/loot-tables" element={<AdminLootTableManagement />} />
              <Route path="/shop-management" element={<AdminShopManagement />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/blank" element={<Blank />} />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />

              {/* Tables */}
              <Route path="/basic-tables" element={<BasicTables />} />

              {/* Ui Elements */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              <Route path="/videos" element={<Videos />} />

              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
            </Route>
          </Route>

          {/* ── MENTOR PORTAL — protected: MENTOR role required ── */}
          <Route element={<ProtectedRoute allowedRoles={['MENTOR']} />}>
            <Route element={<MentorLayout />}>
              <Route path="/mentor/dashboard" element={<MentorDashboard />} />
              <Route path="/mentor/wallet" element={<SubscriptionWallet />} />
              {/* Renamed from /mentor/subscription — redirect so old links/bookmarks still work */}
              <Route path="/mentor/subscription" element={<Navigate to="/mentor/wallet" replace />} />
              <Route path="/mentor/parties" element={<PartyList />} />
              {/* Quests/Proofs/Boss Raid/Rally are now tabs inside a specific party's
                  workspace instead of separate top-level pages. */}
              <Route path="/mentor/parties/:partyId" element={<PartyWorkspace />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<OverviewTab />} />
                <Route path="quests" element={<QuestForgeTab />} />
                <Route path="proofs" element={<ProofsTab />} />
                <Route path="boss-raid" element={<BossRaidTab />} />
                <Route path="rally" element={<RallyTab />} />
              </Route>
            </Route>
          </Route>

          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* SePay payment callback routes — public (no auth): SePay redirects here after payment.
              Paths match SuccessUrl / ErrorUrl / CancelUrl in BE appsettings.json.
              /mentor/payment/callback is an alias for manual testing. */}
          <Route path="/checkout/success" element={<PaymentResultPage />} />
          <Route path="/checkout/fail" element={<PaymentResultPage />} />
          <Route path="/checkout" element={<PaymentResultPage />} />
          <Route path="/mentor/payment/callback" element={<PaymentResultPage />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
