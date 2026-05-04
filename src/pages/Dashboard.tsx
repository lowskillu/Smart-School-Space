import { useSchool } from "@/contexts/SchoolContext";
import AdminDashboard from "./AdminDashboard";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import CuratorDashboard from "./CuratorDashboard";
import CounselorHub from "./CounselorHub";
import { Loader2 } from "lucide-react";

/**
 * Universal Dashboard Switcher.
 * Based on the user's role, it renders the appropriate bento-style dashboard.
 * This simplifies navigation and ensures a consistent UI across all roles.
 */
export default function Dashboard() {
  const { role, isLoading } = useSchool();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  // Role-based switching logic
  switch (role) {
    case "admin":
      return <AdminDashboard />;
    case "teacher":
      return <TeacherDashboard />;
    case "student":
      return <StudentDashboard />;
    case "curator":
      return <CuratorDashboard />;
    case "counselor":
      return <CounselorHub />;
    default:
      // Fallback for unknown roles or until role is fully loaded
      return <StudentDashboard />;
  }
}
