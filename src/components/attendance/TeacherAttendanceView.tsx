import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Users, Loader2, Save, X, CheckCircle2, XCircle, Clock, BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  useStudents,
  useAttendanceByClass,
  useBatchUpsertAttendance
} from "@/hooks/useApiData";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { cn } from "@/lib/utils";

interface TeacherClass {
  id: string;
  name: string;
  subjects: { id: string; name: string; days: number[] }[];
}

export function TeacherAttendanceView() {
  const { t } = useTranslation();

  // Fetch teacher's classes
  const { data: teacherClasses = [], isLoading: loadingClasses } = useQuery<TeacherClass[]>({
    queryKey: ["teacher_classes"],
    queryFn: () => api.get<TeacherClass[]>("/assignments/classes"),
  });

  // State
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [localAttendance, setLocalAttendance] = useState<Record<string, string>>({}); // studentId -> status
  const [isSaving, setIsSaving] = useState(false);

  // Data hooks
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: students = [], isLoading: loadingStudents } = useStudents(selectedClass?.id);
  const { data: classAttendance = [], isLoading: loadingAttendance } = useAttendanceByClass(selectedClass?.id, dateStr);
  const batchAttendance = useBatchUpsertAttendance();

  const allowedDays = useMemo(() => {
    if (!selectedClass) return [];
    return Array.from(new Set(selectedClass.subjects.flatMap(s => s.days || [])));
  }, [selectedClass]);

  // Pre-fill local attendance when data loads or changes
  useEffect(() => {
    if (!loadingAttendance && classAttendance) {
      const map: Record<string, string> = {};
      classAttendance.forEach(a => {
        if (a.student_id && a.status) {
          map[a.student_id] = a.status;
        }
      });
      setLocalAttendance(map);
    }
  }, [classAttendance, loadingAttendance, selectedClass, dateStr]);

  const handleStatusChange = (studentId: string, status: string) => {
    setLocalAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    setIsSaving(true);
    try {
      const dayOfWeek = selectedDate.getDay(); // 0-6 (Sunday-Saturday)
      
      const records = students.map(student => {
        const status = localAttendance[student.id];
        if (!status) return null;
        return {
          student_id: student.id,
          class_id: selectedClass.id,
          period: 1, // Assume period 1 if not tied to specific lesson
          day: dayOfWeek,
          date: dateStr,
          status: status
        };
      }).filter(Boolean) as any[];

      if (records.length === 0) {
        toast.error(t("common.error", "Nothing to save"));
        setIsSaving(false);
        return;
      }

      await batchAttendance.mutateAsync(records);
      toast.success(t("teacher.attendanceSaved", "Attendance saved successfully"));
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || "Error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingClasses) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Step 1: Select Class
  if (!selectedClass) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">{t("sidebar.attendance", "Attendance")}</h1>
          <p className="text-muted-foreground mt-2">{t("teacher.selectClass", "Select a class to manage attendance")}</p>
        </div>

        {teacherClasses.length === 0 ? (
          <div className="p-16 rounded-[32px] border-2 border-dashed text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold">{t("teacher.noClasses", "No classes assigned")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teacherClasses.map(cls => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className="p-5 rounded-[28px] border bg-card hover:border-primary/50 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Users className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg group-hover:text-primary transition-colors">{cls.name}</h3>
                    <p className="text-xs text-muted-foreground">{cls.subjects.length} {t("crud.subjects", "subjects")}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Step 2: Manage Attendance
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedClass(null)} className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center hover:bg-primary/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{t("sidebar.attendance", "Attendance")} - {selectedClass.name}</h1>
            <p className="text-muted-foreground text-sm">{students.length} {t("common.students", "students")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                disabled={(date) => {
                  if (allowedDays.length === 0) return false;
                  const mapped = date.getDay() === 0 ? 6 : date.getDay() - 1;
                  return !allowedDays.includes(mapped);
                }}
                initialFocus
              />
              <div className="p-3 border-t bg-muted/20 text-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{t("assignments.lessonDaysOnly", "lesson days only")}</span>
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={handleSave} disabled={isSaving || loadingStudents || loadingAttendance} className="rounded-xl font-bold gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("common.save", "Save")}
          </Button>
        </div>
      </div>

      <div className="rounded-[28px] border bg-card overflow-hidden">
        {loadingStudents || loadingAttendance ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <p className="font-bold">{t("teacher.noStudents", "No students")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-4 font-black text-xs uppercase tracking-widest">{t("common.student", "Student")}</th>
                <th className="p-4 text-center font-black text-xs uppercase tracking-widest">{t("attendance.present", "Present")}</th>
                <th className="p-4 text-center font-black text-xs uppercase tracking-widest">{t("attendance.late", "Late")}</th>
                <th className="p-4 text-center font-black text-xs uppercase tracking-widest">{t("attendance.absent", "Absent")}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => {
                const status = localAttendance[student.id];
                return (
                  <tr key={student.id} className={`border-b last:border-0 hover:bg-muted/10 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                    <td className="p-4 font-bold">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center text-xs font-black">{student.name.charAt(0)}</div>
                        <span>{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleStatusChange(student.id, "present")}
                        className={cn(
                          "mx-auto h-8 w-8 rounded-full flex items-center justify-center transition-all",
                          status === "present" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleStatusChange(student.id, "late")}
                        className={cn(
                          "mx-auto h-8 w-8 rounded-full flex items-center justify-center transition-all",
                          status === "late" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Clock className="h-5 w-5" />
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleStatusChange(student.id, "absent")}
                        className={cn(
                          "mx-auto h-8 w-8 rounded-full flex items-center justify-center transition-all",
                          status === "absent" ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
