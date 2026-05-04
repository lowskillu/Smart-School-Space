/**
 * React Query hooks for Flask API — drop-in replacement for useSupabaseData.
 * Every hook has the same name and return shape as the original.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";

// ─── Types (match Supabase row types) ───

interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  credits: number;
  standard_hours: number;
  teacher_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface GradeSubjectRow {
  id: string;
  grade_level: number;
  subject_id: string;
  subject_name: string;
  subject_code: string | null;
  hours_per_week: number;
}

interface TeacherRow {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  teacher_subjects: { id: string; teacher_id: string; subject_id: string }[];
}

interface RoomRow {
  id: string;
  name: string;
  capacity: number;
  created_at: string;
  updated_at: string;
}

interface ClassRow {
  id: string;
  name: string;
  grade_level: number | null;
  capacity?: number;
  created_at: string;
  updated_at: string;
}

interface StudentRow {
  id: string;
  name: string;
  email: string | null;
  class_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ScheduleEntryRow {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  room_id: string | null;
  day: number;
  period: number;
  has_conflict: boolean;
  created_at: string;
  subjects: { name: string } | null;
  teachers: { name: string } | null;
  rooms: { name: string } | null;
}

export interface TeacherWorkloadRow {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  hours_per_week: number;
  teacher_name: string;
  subject_name: string;
  class_name: string;
}

export interface TeacherConstraintRow {
  id: string;
  teacher_id: string;
  max_hours_per_day: number;
  consecutive_limits: number;
  blocked_slots: string[];
  special_wishes: string | null;
}

interface AttendanceRow {
  id: string;
  student_id: string;
  class_id: string;
  day: number;
  period: number;
  date: string;
  status: string;
  face_id: boolean | null;
  created_at: string;
  students: { name: string } | null;
}

interface GradeRow {
  id: string;
  student_id: string;
  subject_id: string;
  score: number | null;
  semester: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
  subjects: { name: string } | null;
  students: { name: string } | null;
}

interface DocumentRow {
  id: string;
  title: string;
  student_id: string | null;
  category: string | null;
  status: string;
  file_path: string | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentVersionRow {
  id: string;
  document_id: string;
  version_number: number;
  content: string | null;
  editor_notes: string | null;
  created_at: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  role_id: string;
  student_id?: string;
  teacher_id?: string;
}

export interface RoleRow {
  id: string;
  name: string;
  permissions: string[];
}

export interface PermissionRow {
  id: string;
  code: string;
  description: string;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  author_name: string;
  class_id: string | null;
  is_global: boolean;
  created_at: string;
}

export interface AlumniRow {
  id: string;
  name: string;
  graduation_year: number;
  college_name: string;
  major: string | null;
  essay_title: string | null;
  essay_content: string | null;
  image_url: string | null;
  created_at: string;
}

export interface AssignmentRow {
  id: string;
  title: string;
  description: string | null;
  type_of_work: string;
  weight: number;
  class_id: string;
  teacher_id: string;
  due_date: string;
  created_at: string;
  class_name: string | null;
  teacher_name: string | null;
}

// ─── Subjects ───

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: () => api.get<SubjectRow[]>("/subjects"),
  });
}


export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SubjectRow>) => api.post("/subjects", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<SubjectRow>) =>
      api.put(`/subjects/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["grade_subjects"] });
      qc.invalidateQueries({ queryKey: ["teacher_workloads"] });
    },
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/subjects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
 }
 
// ─── Grade Subjects (Curriculum) ───

export function useGradeSubjects(gradeLevel?: number) {
  return useQuery({
    queryKey: ["grade_subjects", gradeLevel],
    queryFn: () =>
      api.get<GradeSubjectRow[]>(
        gradeLevel !== undefined ? `/grade_subjects?grade_level=${gradeLevel}` : "/grade_subjects"
      ),
  });
}

export function useCreateGradeSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { grade_level: number; subject_id: string; hours_per_week?: number }) =>
      api.post<GradeSubjectRow>("/grade_subjects", data),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: ["grade_subjects", variables.grade_level] }),
  });
}

export function useUpdateGradeSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<GradeSubjectRow>) =>
      api.put<GradeSubjectRow>(`/grade_subjects/${id}`, data),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["grade_subjects", data.grade_level] }),
  });
}

export function useDeleteGradeSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, grade_level }: { id: string; grade_level: number }) =>
      api.delete(`/grade_subjects/${id}`),
    onSuccess: (_, variables) =>
      qc.invalidateQueries({ queryKey: ["grade_subjects", variables.grade_level] }),
  });
}

 // ─── Teachers ───
 
export function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: () => api.get<TeacherRow[]>("/teachers"),
  });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, email, subjectIds }: { name: string; email?: string; subjectIds: string[] }) =>
      api.post("/teachers", { name, email, subjectIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useUpdateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; email?: string; subjectIds?: string[] }) =>
      api.put(`/teachers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/teachers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teachers"] }),
  });
}

// ─── Rooms ───

export function useRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: () => api.get<RoomRow[]>("/rooms"),
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; capacity: number }) => api.post("/rooms", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; capacity: number }) =>
      api.put(`/rooms/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/rooms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

export function useTeacherWorkloads(classId?: string) {
  return useQuery({
    queryKey: ["teacher_workloads", classId],
    queryFn: () =>
      api.get<TeacherWorkloadRow[]>(classId ? `/staffing/workloads?class_id=${classId}` : "/staffing/workloads"),
  });
}

export function useCreateWorkload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { teacher_id: string; subject_id: string; class_id: string; hours_per_week: number }) =>
      api.post("/staffing/workloads", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher_workloads"] }),
  });
}

export function useDeleteWorkload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/staffing/workloads/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher_workloads"] }),
  });
}

export function useUpdateWorkload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<{ hours_per_week: number }>) =>
      api.put(`/staffing/workloads/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher_workloads"] }),
  });
}

// ─── Teacher Constraints ───

export function useTeacherConstraints(teacherId?: string) {
  return useQuery({
    queryKey: teacherId ? ["teacher_constraints", teacherId] : ["teacher_constraints"],
    queryFn: () => 
      teacherId 
        ? api.get<TeacherConstraintRow[]>(`/staffing/constraints?teacher_id=${teacherId}`).then(arr => Array.isArray(arr) ? arr[0] || null : arr)
        : api.get<TeacherConstraintRow[]>("/staffing/constraints"),
  });
}

export function useUpdateTeacherConstraints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TeacherConstraintRow>) =>
      api.post(`/staffing/constraints`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher_constraints"] });
      // Also invalidate the general teachers list just in case
      qc.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
}

// ─── Classes ───

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: () => api.get<ClassRow[]>("/classes"),
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ClassRow>) => api.post<ClassRow>("/classes", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<ClassRow>) =>
      api.put<ClassRow>(`/classes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

// ─── Students ───

export function useStudents(classId?: string) {
  return useQuery({
    queryKey: ["students", classId],
    queryFn: () =>
      api.get<StudentRow[]>(classId ? `/students?class_id=${classId}` : "/students"),
  });
}

// ─── Schedule Entries ───

export function useScheduleEntries(params?: { classId?: string; teacherId?: string; studentId?: string }) {
  return useQuery({
    queryKey: ["schedule_entries", params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.classId) sp.set("class_id", params.classId);
      if (params?.teacherId) sp.set("teacher_id", params.teacherId);
      if (params?.studentId) sp.set("student_id", params.studentId);
      return api.get<ScheduleEntryRow[]>(`/schedule_entries?${sp.toString()}`);
    },
    enabled: !!(params?.classId || params?.teacherId || params?.studentId),
  });
}

// ─── Bell Schedule (public) ───

export interface BellPeriod {
  period: number;
  start: string;
  end: string;
  break_after?: { name: string; duration: number };
}

export interface BellScheduleData {
  id: string;
  name: string;
  periods: BellPeriod[];
  config: Record<string, any>;
}

export function useBellSchedule() {
  return useQuery({
    queryKey: ["bell_schedule"],
    queryFn: () => api.get<BellScheduleData[]>("/bell-schedule"),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour — bell schedule rarely changes
  });
}

// ─── Attendance ───

export function useAttendance(classId?: string, day?: number, date?: string) {
  return useQuery({
    queryKey: ["attendance", classId, day, date],
    queryFn: () =>
      api.get<AttendanceRow[]>(
        `/attendance?class_id=${classId || ""}&day=${day ?? ""}&date=${date || ""}`
      ),
    enabled: !!classId || !!date,
  });
}

export function useStudentAttendanceHistory(studentId?: string) {
  return useQuery({
    queryKey: ["student_attendance_history", studentId],
    queryFn: () => api.get<AttendanceRow[]>(`/attendance?student_id=${studentId}`),
    enabled: !!studentId,
  });
}

export function useAttendanceByClass(classId?: string, date?: string) {
  return useQuery({
    queryKey: ["attendance_class", classId, date],
    queryFn: () => {
      const params = new URLSearchParams();
      if (classId) params.append("class_id", classId);
      if (date) params.append("date", date);
      return api.get<AttendanceRow[]>(`/attendance?${params.toString()}`);
    },
    enabled: !!classId,
  });
}

export function useUpsertAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: {
      student_id: string;
      class_id: string;
      day: number;
      period: number;
      date: string;
      status?: string;
      face_id?: boolean | null;
    }) => api.post("/attendance", record),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useBatchUpsertAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (records: Array<{
      student_id: string;
      class_id: string;
      day: number;
      period: number;
      date: string;
      status?: string;
      face_id?: boolean | null;
    }>) => api.post("/attendance/batch", records),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

// ─── Grades ───

export function useGrades(studentId?: string) {
  return useQuery({
    queryKey: ["grades", studentId],
    queryFn: () =>
      api.get<GradeRow[]>(
        studentId ? `/grades?student_id=${studentId}` : "/grades"
      ),
  });
}

export function useGradesByClass(classId?: string, subjectId?: string) {
  return useQuery({
    queryKey: ["grades_class", classId, subjectId],
    queryFn: () =>
      api.get<GradeRow[]>(
        `/grades/class/${classId}${subjectId ? `?subject_id=${subjectId}` : ""}`
      ),
    enabled: !!classId,
  });
}

export function useGradesByAssignment(assignmentId?: string) {
  return useQuery({
    queryKey: ["grades_assignment", assignmentId],
    queryFn: () => api.get<GradeRow[]>(`/grades/assignment/${assignmentId}`),
    enabled: !!assignmentId,
  });
}

export function useBatchUpsertGrades() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (records: Array<{
      student_id: string;
      subject_id?: string;
      assignment_id?: string;
      score: number;
      semester?: string;
      comments?: string;
    }>) => api.post("/grades/batch", records),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["grades_class"] });
      qc.invalidateQueries({ queryKey: ["grades_assignment"] });
    },
  });
}

export function useUpdateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; score?: number; comments?: string; semester?: string }) =>
      api.put(`/grades/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["grades_class"] });
      qc.invalidateQueries({ queryKey: ["grades_assignment"] });
    },
  });
}

// ─── Documents ───

export function useDocuments(studentId?: string) {
  return useQuery({
    queryKey: ["documents", studentId],
    queryFn: () =>
      api.get<DocumentRow[]>(
        studentId ? `/documents?student_id=${studentId}` : "/documents"
      ),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: {
      title: string;
      student_id?: string | null;
      category?: string | null;
      status?: string;
      file_path?: string | null;
      file_type?: string | null;
      uploaded_by?: string | null;
    }) => api.post("/documents", doc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useUpdateDocumentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/documents/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

// ─── Document Versions ───

export function useDocumentVersions(documentId?: string) {
  return useQuery({
    queryKey: ["document_versions", documentId],
    queryFn: () =>
      api.get<DocumentVersionRow[]>(
        `/document_versions?document_id=${documentId}`
      ),
    enabled: !!documentId,
  });
}

// ─── Generate Schedule (server-side) ───

export function useGenerateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      user_prompt?: string;
      grade_levels?: number[];
      bell_schedule_id?: string;
    }) =>
      api.post<{ message: string; total: number; entries: any[] }>("/schedule/ai-generate", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule_entries"] }),
  });
}

// ─── Update Individual Schedule Entry ───

export function useUpdateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; teacher_id?: string; room_id?: string; subject_id?: string; day?: number; period?: number }) =>
      api.put<any>(`/schedule_entries/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule_entries"] }),
  });
}

// ─── Saved Schedules ───

export function useSavedSchedules() {
  return useQuery({
    queryKey: ["saved_schedules"],
    queryFn: () => api.get<any[]>("/saved-schedules"),
  });
}

export function useSaveSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; entries: any[]; grade_levels: number[] }) =>
      api.post<any>("/saved-schedules", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved_schedules"] }),
  });
}

export function useLoadSavedSchedule() {
  return useMutation({
    mutationFn: (id: string) => api.get<any>(`/saved-schedules/${id}`),
  });
}

export function useDeleteSavedSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/saved-schedules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved_schedules"] }),
  });
}

export function useApplySavedSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ message: string; total: number; classes: number }>(`/saved-schedules/${id}/apply`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_schedules"] });
      qc.invalidateQueries({ queryKey: ["schedule_entries"] });
    },
  });
}
// ─── UniPrep Types ───

export interface ExtracurricularRow {
  id: string;
  student_id: string;
  title: string;
  role: string | null;
  organization: string | null;
  hours_per_week: number;
  weeks_per_year: number;
  category: string;
  description: string | null;
  created_at: string;
}

export interface HonorRow {
  id: string;
  student_id: string;
  title: string;
  level: "School" | "Regional" | "National" | "International";
  year_received: number;
  created_at: string;
}

export interface ExamRegistrationRow {
  id: string;
  student_id: string;
  exam_type: string;
  subject: string | null;
  exam_date: string;
  location: string | null;
  created_at: string;
}

export interface TestResultRow {
  id: string;
  student_id: string;
  exam_type: string;
  subject: string | null;
  score: number;
  is_mock: boolean;
  date_taken: string | null;
  document_url: string | null;
  created_at: string;
}

export interface GradeSummaryResponse {
  chart: Array<{ month: string; [subject: string]: string | number }>;
  summary: Record<string, number>;
}

// ─── Meals Types ───

export interface FoodItemRow {
  id: string;
  name: string;
  description: string | null;
  price: string;
  type: "canteen" | "buffet";
  category: string | null;
  weight: string | null;
  calories: number | null;
  proteins: number | null;
  fats: number | null;
  carbs: number | null;
  image_url: string | null;
}

export interface OrderRow {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: { food_item_id: string; food_item_name: string; quantity: number; price: number }[];
}

// ─── Extracurriculars ───

export function useExtracurriculars(studentId?: string) {
  return useQuery({
    queryKey: ["extracurriculars", studentId],
    queryFn: () =>
      api.get<ExtracurricularRow[]>(
        studentId ? `/uni-prep/extracurriculars?student_id=${studentId}` : "/uni-prep/extracurriculars"
      ),
    enabled: !!studentId,
  });
}

export function useCreateExtracurricular() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      role?: string;
      organization?: string;
      hours_per_week: number;
      weeks_per_year: number;
      category: string;
      description?: string;
    }) => api.post<ExtracurricularRow>("/uni-prep/extracurriculars", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["extracurriculars"] }),
  });
}

export function useDeleteExtracurricular() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/uni-prep/extracurriculars/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["extracurriculars"] }),
  });
}

// ─── Honors ───

export function useHonors(studentId?: string) {
  return useQuery({
    queryKey: ["honors", studentId],
    queryFn: () =>
      api.get<HonorRow[]>(
        studentId ? `/uni-prep/honors?student_id=${studentId}` : "/uni-prep/honors"
      ),
    enabled: !!studentId,
  });
}

export function useCreateHonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      level: string;
      year_received: number;
    }) => api.post<HonorRow>("/uni-prep/honors", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["honors"] }),
  });
}

export function useDeleteHonor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/uni-prep/honors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["honors"] }),
  });
}

// ─── Exam Registrations ───

export function useExamRegistrations(studentId?: string) {
  return useQuery({
    queryKey: ["exam_registrations", studentId],
    queryFn: () =>
      api.get<ExamRegistrationRow[]>(
        studentId ? `/uni-prep/exam-registrations?student_id=${studentId}` : "/uni-prep/exam-registrations"
      ),
    enabled: !!studentId,
  });
}

export function useCreateExamRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      exam_type: string;
      subject?: string;
      exam_date: string;
      location?: string;
    }) => api.post<ExamRegistrationRow>("/uni-prep/exam-registrations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam_registrations"] }),
  });
}

export function useDeleteExamRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/uni-prep/exam-registrations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam_registrations"] }),
  });
}

// ─── Test Results ───

export function useTestResults(studentId?: string, examType?: string) {
  return useQuery({
    queryKey: ["test_results", studentId, examType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (studentId) params.set("student_id", studentId);
      if (examType) params.set("exam_type", examType);
      return api.get<TestResultRow[]>(`/uni-prep/test-results?${params.toString()}`);
    },
    enabled: !!studentId,
  });
}

export function useCreateTestResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      exam_type: string;
      subject?: string;
      score: number;
      is_mock?: boolean;
      date_taken?: string;
    }) => api.post<TestResultRow>("/uni-prep/test-results", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["test_results"] }),
  });
}

export function useDeleteTestResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/uni-prep/test-results/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["test_results"] }),
  });
}

// ─── Grades Summary ───

export function useGradeSummary(studentId?: string) {
  return useQuery({
    queryKey: ["grades_summary", studentId],
    queryFn: () =>
      api.get<GradeSummaryResponse>(
        `/grades/summary?student_id=${studentId}`
      ),
    enabled: !!studentId,
  });
}

// ─── Meals / Food Items ───

export function useFoodItems(type?: "canteen" | "buffet") {
  return useQuery({
    queryKey: ["food_items", type],
    queryFn: () =>
      api.get<FoodItemRow[]>(type ? `/meals/food-items?type=${type}` : "/meals/food-items"),
  });
}

export function useCanteenMenu(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["canteen_menu", startDate, endDate],
    queryFn: () => api.get<any[]>(`/meals/canteen/menu?start_date=${startDate}&end_date=${endDate}`),
  });
}

export function useCreateFoodItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FoodItemRow>) => api.post<FoodItemRow>("/meals/food-items", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["food_items"] }),
  });
}

export function useUpdateFoodItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<FoodItemRow>) =>
      api.patch<FoodItemRow>(`/meals/food-items/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["food_items"] }),
  });
}

export function useDeleteFoodItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/meals/food-items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["food_items"] }),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      items: { food_item_id: string; quantity: number }[];
      status?: "paid" | "pending_parental_approval";
    }) => api.post<OrderRow>("/meals/orders", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useOrders(userId?: string) {
  return useQuery({
    queryKey: ["orders", userId],
    queryFn: () =>
      api.get<OrderRow[]>(userId ? `/meals/orders?user_id=${userId}` : "/meals/orders"),
    enabled: !!userId,
  });
}

// ─── Announcements ───

export function useAnnouncements(classId?: string) {
  return useQuery({
    queryKey: ["announcements", classId],
    queryFn: () =>
      api.get<AnnouncementRow[]>(classId ? `/announcements?class_id=${classId}` : "/announcements"),
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; class_id?: string; is_global?: boolean }) =>
      api.post<AnnouncementRow>("/announcements", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

// ─── Alumni ───

export function useAlumni() {
  return useQuery({
    queryKey: ["alumni"],
    queryFn: () => api.get<AlumniRow[]>("/alumni"),
  });
}

export function useCreateAlumni() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AlumniRow>) => api.post<AlumniRow>("/alumni", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alumni"] }),
  });
}

// ─── Assignments ───

export function useAssignments(teacherId?: string, classId?: string) {
  return useQuery({
    queryKey: ["assignments", teacherId, classId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (teacherId) params.set("teacher_id", teacherId);
      if (classId) params.set("class_id", classId);
      return api.get<AssignmentRow[]>(`/assignments?${params.toString()}`);
    },
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AssignmentRow>) => api.post<AssignmentRow>("/assignments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

// ─── Grades ───

export interface GradeRow {
  id: string;
  student_id: string;
  subject_id: string;
  score?: number;
  semester?: string;
  comments?: string;
  assignment_id?: string;
  subjects?: { name: string };
  students?: { name: string };
  created_at: string;
}

export function useCreateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { student_id: string; subject_id: string; score: number; semester: string; comments?: string }) => 
      api.post<GradeRow>("/grades", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["grade_summary"] });
    },
  });
}

// ─── Admin Users & Roles ───

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<UserRow[]>("/admin/users"),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserRow>) => api.post<UserRow>("/admin/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["teachers"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<UserRow>) =>
      api.put<UserRow>(`/admin/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["teachers"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["teachers"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

// Admin Students management
export function useAdminStudents() {
  return useQuery({
    queryKey: ["admin_students"],
    queryFn: () => api.get<any[]>("/admin/students"),
  });
}

export function useUpdateAdminStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }: { userId: string } & any) =>
      api.put(`/admin/students/${userId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_students"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useCreateAdminStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/admin/students", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_students"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useDeleteAdminStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/students/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_students"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<RoleRow[]>("/admin/roles"),
  });
}

export function useClassGrades(classId?: string, subjectId?: string) {
  return useQuery({
    queryKey: ["classGrades", classId, subjectId],
    queryFn: async () => {
      if (!classId) return [];
      const url = subjectId 
        ? `/grades/class/${classId}?subject_id=${subjectId}` 
        : `/grades/class/${classId}`;
      const data = await api.get<Grade[]>(url);
      return data;
    },
    enabled: !!classId,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["school_settings"],
    queryFn: () => api.get<Record<string, string>>("/admin/settings"),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string>) => api.post("/admin/settings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["school_settings"] }),
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => api.get<PermissionRow[]>("/admin/permissions"),
  });
}

export function useUpdateRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      api.post(`/admin/roles/${roleId}/permissions`, { permissions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// ─── Communication (Chats) ───

export interface MessageRow {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  content?: string;
  file_url?: string;
  file_type?: string;
  is_read: boolean;
  is_pinned?: boolean;
  is_edited?: boolean;
  created_at: string;
}

export interface ChatRow {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  last_message?: MessageRow | null;
  unread_count?: number;
  other_user_id?: string;
}

export interface MeetingRow {
  id: string;
  title: string;
  host_id: string;
  host_name: string;
  room_key: string;
  scheduled_time: string | null;
  duration: number;
  started_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function useChats() {
  return useQuery({
    queryKey: ["chats"],
    queryFn: () => api.get<ChatRow[]>("/chats"),
  });
}

export function useChatMessages(chatId?: string) {
  return useQuery({
    queryKey: ["chat_messages", chatId],
    queryFn: () => api.get<MessageRow[]>(`/chats/${chatId}/messages`),
    enabled: !!chatId,
    refetchInterval: 5000, // Poll for new messages every 5s
  });
}

export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { is_group: boolean; name?: string; participant_ids: string[] }) =>
      api.post<ChatRow>("/chats", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chats"] }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, content, file_url, file_type }: { chatId: string; content?: string; file_url?: string; file_type?: string }) =>
      api.post<MessageRow>(`/chats/${chatId}/messages`, { content, file_url, file_type }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["chat_messages", variables.chatId] });
      qc.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export function useUserSearch(params: { q?: string; role?: string; class_id?: string }) {
  return useQuery({
    queryKey: ["user_search", params],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.q) sp.set("q", params.q);
      if (params.role) sp.set("role", params.role);
      if (params.class_id) sp.set("class_id", params.class_id);
      return api.get<UserRow[]>(`/users/search?${sp.toString()}`);
    },
    enabled: !!params.q || !!params.role || !!params.class_id,
  });
}

export function useUploadChatFile() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.postMultipart<{ file_url: string }>("/communication/upload", formData);
    }
  });
}

export function useUpdateMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, messageId, content, is_pinned }: { chatId: string; messageId: string; content?: string; is_pinned?: boolean }) =>
      api.patch<MessageRow>(`/chats/${chatId}/messages/${messageId}`, { content, is_pinned }),
    onSuccess: (_, { chatId }) => {
      qc.invalidateQueries({ queryKey: ["chat_messages", chatId] });
    }
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, messageId, deleteType = "me" }: { chatId: string; messageId: string; deleteType?: "me" | "everyone" }) =>
      api.delete(`/chats/${chatId}/messages/${messageId}?type=${deleteType}`),
    onSuccess: (_, { chatId }) => {
      qc.invalidateQueries({ queryKey: ["chat_messages", chatId] });
      qc.invalidateQueries({ queryKey: ["chats"] });
    }
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["unread_count"],
    queryFn: async () => {
      const chats = await api.get<ChatRow[]>("/chats");
      return chats.reduce((acc, chat) => acc + (chat.unread_count || 0), 0);
    },
    refetchInterval: 10000, // Check every 10s
  });
}

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: () => api.get<MeetingRow[]>("/meetings"),
    refetchInterval: 10000,
  });
}

export function useClassStudents(classId?: string) {
  return useQuery({
    queryKey: ["class-students", classId],
    queryFn: () => api.get<any[]>(`/classes/${classId}/students`),
    enabled: !!classId,
  });
}

export function useMeetingByRoom(roomKey?: string) {
  return useQuery({
    queryKey: ["meeting", roomKey],
    queryFn: () => api.get<MeetingRow>(`/meetings/room/${roomKey}`),
    enabled: !!roomKey,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; scheduled_time?: string; participant_ids?: string[]; class_ids?: string[] }) =>
      api.post<MeetingRow>("/meetings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useCloseMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) => api.delete(`/meetings/${meetingId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useUpdateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; scheduled_time?: string; duration?: number; participant_ids?: string[]; class_ids?: string[] }) =>
      api.patch<MeetingRow>(`/meetings/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useStartMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<MeetingRow>(`/meetings/${id}/start`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}
