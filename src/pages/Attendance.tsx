import { useSchool } from "@/contexts/SchoolContext";
import { StudentAttendanceView } from "@/components/attendance/StudentAttendanceView";
import { TeacherAttendanceView } from "@/components/attendance/TeacherAttendanceView";

export default function Attendance() {
  const { role } = useSchool();

  // Teacher or Admin management view
  if (role === "teacher" || role === "admin") {
    return <TeacherAttendanceView />;
  }

  // Student view
  return <StudentAttendanceView />;
}
