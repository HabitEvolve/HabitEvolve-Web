import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
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
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import UserManagement from "./pages/UserManagement";
import EditProfile from "./pages/EditProfile";
import PartyManagement from "./pages/PartyManagement";
import TargetRuleManagement from "./pages/TargetRuleManagement";
import AdminGoalManagement from "./pages/AdminGoalManagement";
import QuestionnaireManagement from "./pages/QuestionnaireManagement";
import AdminPracticalTaskManagement from "./pages/AdminPracticalTaskManagement";
import AdminCourtManagement from "./pages/AdminCourtManagement";
import AdminBossManagement from "./pages/AdminBossManagement";
import GoalTaskEngineHub from "./pages/GoalTaskEngineHub";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>

            <Route index path="/home" element={<Home />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/party-management" element={<PartyManagement />} />
            <Route path="/target-rules" element={<TargetRuleManagement />} />
            <Route path="/goal-engine" element={<GoalTaskEngineHub />} />
            <Route path="/goal-management" element={<AdminGoalManagement />} />
            <Route path="/questionnaires" element={<QuestionnaireManagement />} />
            <Route path="/practical-tasks" element={<AdminPracticalTaskManagement />} />
            <Route path="/court-management" element={<AdminCourtManagement />} />
            <Route path="/boss-management" element={<AdminBossManagement />} />
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

          {/* Auth Layout */}


          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
