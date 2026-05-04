import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Gateway from "./pages/Gateway";
import Landing from "./pages/Landing";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import CollegePrep from "./pages/CollegePrep";
import Alumni from "./pages/Alumni";
import Communication from "./pages/Communication";
import Services from "./pages/Services";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOnboarding from "./pages/AdminOnboarding";
import AdminPanel from "./pages/admin/AdminPanel";
import ClassesManager from "./pages/admin/ClassesManager";
import SubjectsManager from "./pages/admin/SubjectsManager";
import RoomsManager from "./pages/admin/RoomsManager";
import StaffingManager from "./pages/admin/StaffingManager";
import ScheduleManagerAI from "./pages/admin/ScheduleManager";
import BuffetManager from "./pages/admin/BuffetManager";
import CanteenAdmin from "./pages/admin/CanteenAdmin";
import ScheduleManager from "./pages/ScheduleManager";
import StudentDistribution from "./pages/StudentDistribution";
import StudentSchedule from "./pages/StudentSchedule";
import Courses from "./pages/Courses";
import Marks from "./pages/Marks";
import MeetingRoom from "./pages/MeetingRoom";
import BellSetup from "./pages/BellSetup";
import TeacherDashboard from "./pages/TeacherDashboard";
import CounselorHub from "./pages/CounselorHub";
import CuratorDashboard from "./pages/CuratorDashboard";
import AdminMockTests from "./pages/admin/AdminMockTests";
import TeacherRecommendations from "./pages/TeacherRecommendations";
import MockTestTaking from "./pages/MockTestTaking";
import MealHub from "./pages/meals/MealHub";
import Canteen from "./pages/meals/Canteen";
import Buffet from "./pages/meals/Buffet";
import GPATranscript from "./pages/university-prepare/GPATranscript";
import Essays from "./pages/university-prepare/Essays";
import LetterOfRecommendation from "./pages/university-prepare/LetterOfRecommendation";
import CollegeList from "./pages/university-prepare/CollegeList";
import Extracurriculars from "./pages/university-prepare/Extracurriculars";
import ExamPrepare from "./pages/university-prepare/ExamPrepare";
import ExamDetail from "./pages/university-prepare/ExamDetail";
import MockSimulator from "./pages/university-prepare/MockSimulator";
import TestReview from "./pages/university-prepare/TestReview";
import AddAssignment from "./pages/AddAssignment";
import TeacherGrades from "./pages/TeacherGrades";
import StudentGrades from "./pages/StudentGrades";
import TargetMarks from "./pages/TargetMarks";
import ChatRoom from "./pages/ChatRoom";
import SchoolCalendarPage from "./pages/SchoolCalendarPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Wrapper so all protected pages share the same ProtectedRoute + AppLayout
function AppPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SchoolProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Gateway />} />
              <Route path="/business" element={<Landing />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Protected app routes */}
              <Route path="/app" element={<AppPage><Dashboard /></AppPage>} />
              <Route path="/app/onboarding" element={<AppPage><AdminOnboarding /></AppPage>} />
              <Route path="/app/schedule" element={<AppPage><ScheduleManager /></AppPage>} />
              <Route path="/app/students" element={<AppPage><StudentDistribution /></AppPage>} />
              <Route path="/app/my-schedule" element={<AppPage><StudentSchedule /></AppPage>} />
              <Route path="/app/my-courses" element={<AppPage><Courses /></AppPage>} />
              <Route path="/app/marks" element={<AppPage><Marks /></AppPage>} />
              <Route path="/app/attendance" element={<AppPage><Attendance /></AppPage>} />
              <Route path="/app/meals" element={<AppPage><MealHub /></AppPage>} />
              <Route path="/app/meals/canteen" element={<AppPage><Canteen /></AppPage>} />
              <Route path="/app/meals/buffet" element={<AppPage><Buffet /></AppPage>} />
              <Route path="/app/college-prep" element={<AppPage><CollegePrep /></AppPage>} />
              <Route path="/app/college-prep/gpa" element={<AppPage><GPATranscript /></AppPage>} />
              <Route path="/app/college-prep/colleges" element={<AppPage><CollegeList /></AppPage>} />
              <Route path="/app/college-prep/essays" element={<AppPage><Essays /></AppPage>} />
              <Route path="/app/college-prep/recommendations" element={<AppPage><LetterOfRecommendation /></AppPage>} />
              <Route path="/app/college-prep/extracurriculars" element={<AppPage><Extracurriculars /></AppPage>} />
              <Route path="/app/college-prep/exams" element={<AppPage><ExamPrepare /></AppPage>} />
              <Route path="/app/college-prep/exam/:examId" element={<AppPage><ExamDetail /></AppPage>} />
              <Route path="/app/college-prep/mock-test/review" element={<AppPage><TestReview /></AppPage>} />
              <Route path="/app/college-prep/mock-test/:testId" element={<MockTestTaking />} />
              <Route path="/app/alumni" element={<AppPage><Alumni /></AppPage>} />
              <Route path="/app/communication" element={<AppPage><Communication /></AppPage>} />
              <Route path="/app/communication/chat/:chatId" element={<AppPage><ChatRoom /></AppPage>} />
              <Route path="/app/communication/chat" element={<AppPage><ChatRoom /></AppPage>} />
              <Route path="/app/meetings/:meetingId" element={<AppPage><MeetingRoom /></AppPage>} />
              <Route path="/app/services" element={<AppPage><Services /></AppPage>} />
              <Route path="/app/calendar" element={<AppPage><SchoolCalendarPage /></AppPage>} />
              <Route path="/app/admin" element={<AppPage><AdminDashboard /></AppPage>} />
              <Route path="/app/admin/users" element={<AppPage><AdminPanel /></AppPage>} />
              <Route path="/app/admin/classes" element={<AppPage><ClassesManager /></AppPage>} />
              <Route path="/app/admin/subjects" element={<AppPage><SubjectsManager /></AppPage>} />
              <Route path="/app/admin/rooms" element={<AppPage><RoomsManager /></AppPage>} />
              <Route path="/app/admin/staffing" element={<AppPage><StaffingManager /></AppPage>} />
              <Route path="/app/admin/buffet" element={<AppPage><BuffetManager /></AppPage>} />
              <Route path="/app/admin/canteen" element={<AppPage><CanteenAdmin /></AppPage>} />
              <Route path="/app/admin/mock-tests" element={<AppPage><AdminMockTests /></AppPage>} />
              <Route path="/app/admin/schedule" element={<AppPage><ScheduleManagerAI /></AppPage>} />
              <Route path="/app/bell-setup" element={<AppPage><BellSetup /></AppPage>} />
              <Route path="/app/teacher" element={<AppPage><TeacherDashboard /></AppPage>} />
              <Route path="/app/teacher/recommendations" element={<AppPage><TeacherRecommendations /></AppPage>} />
              <Route path="/app/assignments/add" element={<AppPage><AddAssignment /></AppPage>} />
              <Route path="/app/teacher/grades" element={<AppPage><TeacherGrades /></AppPage>} />
              <Route path="/app/student/grades" element={<AppPage><StudentGrades /></AppPage>} />
              <Route path="/app/student/target-marks" element={<AppPage><TargetMarks /></AppPage>} />
              <Route path="/app/counselor" element={<AppPage><CounselorHub /></AppPage>} />
              <Route path="/app/curator" element={<AppPage><CuratorDashboard /></AppPage>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SchoolProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
