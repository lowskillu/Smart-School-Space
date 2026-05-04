import React, { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";

export type UserRole = "admin" | "teacher" | "student" | "counselor" | "curator";

export interface Subject {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
  subjectIds: string[];
}

export interface SchoolClass {
  id: string;
  name: string;
  studentCount: number;
  studentNames: string[];
}

export interface ScheduleEntry {
  day: number;
  period: number;
  subjectId: string;
  teacherId: string;
  classId: string;
  room?: string;
  conflict?: boolean;
}

export interface AttendanceRecord {
  studentName: string;
  classId: string;
  period: number;
  day: number;
  status: "present" | "absent" | "late";
  faceId?: boolean;
}

interface SchoolContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  grade: number;
  setGrade: (grade: number) => void;
  permissions: string[];
  subjects: Subject[];
  addSubject: (name: string) => void;
  removeSubject: (id: string) => void;
  teachers: Teacher[];
  addTeacher: (name: string, subjectIds: string[]) => void;
  removeTeacher: (id: string) => void;
  classes: SchoolClass[];
  addClass: (name: string, studentCount: number) => void;
  removeClass: (id: string) => void;
  addStudentToClass: (classId: string, studentName: string) => void;
  removeStudentFromClass: (classId: string, studentName: string) => void;
  schedule: ScheduleEntry[];
  generateSchedule: () => { conflicts: number };
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;
  attendanceRecords: AttendanceRecord[];
  markAttendance: (record: AttendanceRecord) => void;
}

const SchoolContext = createContext<SchoolContextType | null>(null);

let idCounter = 0;
const genId = () => `id_${++idCounter}_${Date.now()}`;

const rooms = ["101", "102", "103", "204", "205", "301", "302", "401", "112", "115"];

const defaultPermissions: Record<UserRole, string[]> = {
  admin: [
    "tab_dashboard", "tab_attendance", "tab_college_prep", "tab_admissions",
    "tab_communication", "tab_services", "tab_admin_panel", "tab_schedule",
    "tab_marks", "tab_meals", "tab_university_prep", "tab_bell_setup",
    "tab_counselor_hub", "tab_essay_queue", "tab_curator_search",
    "tab_user_management", "tab_classes_admin", "tab_subjects_admin",
    "tab_rooms_admin", "tab_staffing_admin", "tab_alumni"
  ],
  teacher: [
    "tab_dashboard", "tab_attendance", "tab_schedule", "tab_marks",
    "tab_communication", "tab_meals", "tab_services", "tab_university_prep",
    "tab_alumni"
  ],
  student: [
    "tab_dashboard", "tab_schedule", "tab_marks", "tab_attendance",
    "tab_admissions", "tab_communication", "tab_services"
  ],
  counselor: [
    "tab_dashboard", "tab_counselor_hub", "tab_essay_queue",
    "tab_communication", "tab_services", "tab_alumni", "tab_admissions"
  ],
  curator: [
    "tab_dashboard", "tab_curator_search", "tab_schedule",
    "tab_attendance", "tab_communication", "tab_services", "tab_alumni"
  ]
};

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // ─── Role & permissions derive directly from the API user object ─────
  // No useState needed → zero race-condition risk. Always in sync on re-render.
  const role: UserRole = (user?.role as UserRole) ?? "student";
  const permissions: string[] = user?.permissions ?? defaultPermissions[role] ?? [];

  const [grade, setGrade] = useState<number>(10);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const addSubject = useCallback((name: string) => {
    setSubjects((prev) => [...prev, { id: genId(), name }]);
  }, []);

  const removeSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addTeacher = useCallback((name: string, subjectIds: string[]) => {
    setTeachers((prev) => [...prev, { id: genId(), name, subjectIds }]);
  }, []);

  const removeTeacher = useCallback((id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addClass = useCallback((name: string, studentCount: number) => {
    setClasses((prev) => [...prev, { id: genId(), name, studentCount, studentNames: [] }]);
  }, []);

  const removeClass = useCallback((id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addStudentToClass = useCallback((classId: string, studentName: string) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId ? { ...c, studentNames: [...c.studentNames, studentName] } : c
      )
    );
  }, []);

  const removeStudentFromClass = useCallback((classId: string, studentName: string) => {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId
          ? { ...c, studentNames: c.studentNames.filter((n) => n !== studentName) }
          : c
      )
    );
  }, []);

  const markAttendance = useCallback((record: AttendanceRecord) => {
    setAttendanceRecords((prev) => {
      const idx = prev.findIndex(
        (r) => r.studentName === record.studentName && r.classId === record.classId && r.period === record.period && r.day === record.day
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [...prev, record];
    });
  }, []);

  const generateSchedule = useCallback(() => {
    const entries: ScheduleEntry[] = [];
    const teacherSlots: Record<string, Set<string>> = {};
    let conflicts = 0;
    let roomIdx = 0;

    classes.forEach((cls) => {
      const availableTeachers = [...teachers];
      for (let day = 0; day < 5; day++) {
        for (let period = 0; period < 7; period++) {
          if (period === 3) continue;
          const teacher = availableTeachers[period % availableTeachers.length];
          if (!teacher) continue;
          const subjectId = teacher.subjectIds[0] || subjects[0]?.id;
          if (!subjectId) continue;

          const slotKey = `${day}-${period}`;
          if (!teacherSlots[teacher.id]) teacherSlots[teacher.id] = new Set();
          const hasConflict = teacherSlots[teacher.id].has(slotKey);
          if (hasConflict) conflicts++;
          teacherSlots[teacher.id].add(slotKey);

          entries.push({
            day,
            period,
            subjectId,
            teacherId: teacher.id,
            classId: cls.id,
            room: rooms[roomIdx % rooms.length],
            conflict: hasConflict,
          });
          roomIdx++;
        }
      }
    });

    setSchedule(entries);
    return { conflicts };
  }, [classes, teachers, subjects]);

  // setRole kept for API compatibility (e.g. impersonation UI)
  // but does NOT override API permissions — role is always derived from user
  const setRole = (_newRole: UserRole) => {
    // no-op: role is derived from AuthContext user. For impersonation, change user.
    console.warn("[SchoolContext] setRole is deprecated — role is derived from API user");
  };

  return (
    <SchoolContext.Provider
      value={{
        role, setRole, grade, setGrade, permissions, subjects, addSubject, removeSubject,
        teachers, addTeacher, removeTeacher,
        classes, addClass, removeClass,
        addStudentToClass, removeStudentFromClass,
        schedule, generateSchedule,
        onboardingComplete, setOnboardingComplete,
        attendanceRecords, markAttendance,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool must be used within SchoolProvider");
  return ctx;
}
