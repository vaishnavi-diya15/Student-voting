import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import StudentVerification from "./pages/StudentVerification.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import SessionExpired from "./pages/SessionExpired.jsx";
import OtpVerification from "./pages/OtpVerification.jsx";
import ElectionDetails from "./pages/ElectionDetails.jsx";
import CandidateList from "./pages/CandidateList.jsx";
import VoteConfirmation from "./pages/VoteConfirmation.jsx";
import VoteSuccessful from "./pages/VoteSuccessful.jsx";
import ProtectedStudentRoute from "./components/ProtectedStudentRoute.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import StudentManagement from "./pages/StudentManagement.jsx";
import ElectionManagement from "./pages/ElectionManagement.jsx";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/verify" element={<StudentVerification />} />
        <Route path="/verify/otp" element={<OtpVerification />} />
        <Route path="/session-expired" element={<SessionExpired />} />
        <Route element={<ProtectedStudentRoute />}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/election" element={<ElectionDetails />} />
          <Route path="/candidates" element={<CandidateList />} />
          <Route path="/vote/confirm" element={<VoteConfirmation />} />
          <Route path="/vote/success" element={<VoteSuccessful />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedAdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<StudentManagement />} />
            <Route path="/admin/elections" element={<ElectionManagement />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
