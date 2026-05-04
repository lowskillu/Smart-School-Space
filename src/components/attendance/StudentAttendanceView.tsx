import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { BentoCard } from "@/components/BentoCard";
import { CheckCircle2, Clock, XCircle, Calendar as CalendarIcon, Info, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentAttendanceHistory } from "@/hooks/useApiData";

const getStatusColor = (status: string) => {
  switch (status) {
    case "present": return "text-emerald-500/80";
    case "late": return "text-amber-500/80";
    case "absent": return "text-rose-500/80";
    default: return "text-muted-foreground";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "present": return <CheckCircle2 className={`h-5 w-5 ${getStatusColor(status)}`} />;
    case "late": return <Clock className={`h-5 w-5 ${getStatusColor(status)}`} />;
    case "absent": return <XCircle className={`h-5 w-5 ${getStatusColor(status)}`} />;
    default: return null;
  }
};

export function StudentAttendanceView() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const studentId = user?.student_id;
  const { data: history = [], isLoading } = useStudentAttendanceHistory(studentId);

  // Group history by date
  const groupedHistory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    history.forEach((h) => {
      if (!groups[h.date]) groups[h.date] = [];
      groups[h.date].push(h);
    });
    return groups;
  }, [history]);

  // Get data for the selected date
  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : null;
  const lessonsForDate = selectedDateStr ? groupedHistory[selectedDateStr] : null;

  // Calendar modifiers
  const presentDays = useMemo(() => 
    Object.keys(groupedHistory).filter(k => groupedHistory[k].some(l => l.status === "present")).map(d => new Date(d)),
    [groupedHistory]
  );
  const lateDays = useMemo(() => 
    Object.keys(groupedHistory).filter(k => groupedHistory[k].some(l => l.status === "late")).map(d => new Date(d)),
    [groupedHistory]
  );
  const absentDays = useMemo(() => 
    Object.keys(groupedHistory).filter(k => groupedHistory[k].some(l => l.status === "absent")).map(d => new Date(d)),
    [groupedHistory]
  );

  const stats = useMemo(() => {
    let lates = 0;
    let absences = 0;
    history.forEach(h => {
      if (h.status === "late") lates++;
      if (h.status === "absent") absences++;
    });
    return { lates, absences };
  }, [history]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Statistics Header */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border bg-card text-card-foreground flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{t("attendanceHub.totalAbsences")}</p>
            <p className="text-3xl font-bold text-rose-500/90">{stats.absences}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center">
            <XCircle className="h-6 w-6 text-rose-500/80" />
          </div>
        </div>
        <div className="p-4 rounded-2xl border bg-card text-card-foreground flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{t("attendanceHub.totalLates")}</p>
            <p className="text-3xl font-bold text-amber-500/90">{stats.lates}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="h-6 w-6 text-amber-500/80" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
          <BentoCard title={t("attendanceHub.calendarTitle")} icon={<CalendarIcon className="h-5 w-5" />}>
             <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
                modifiers={{
                  present: presentDays,
                  late: lateDays,
                  absent: absentDays,
                }}
                modifiersClassNames={{
                  present: "font-semibold",
                  late: "font-semibold",
                  absent: "font-semibold",
                }}
                components={{
                  DayContent: ({ date, activeModifiers }) => {
                     return (
                       <div className="relative flex items-center justify-center h-9 w-9">
                          <span>{date.getDate()}</span>
                          <div className="absolute bottom-1 w-full flex justify-center gap-0.5">
                             {activeModifiers.present && !activeModifiers.late && !activeModifiers.absent && (
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                             )}
                             {activeModifiers.late && (
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                             )}
                             {activeModifiers.absent && (
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                             )}
                          </div>
                       </div>
                     );
                  }
                }}
              />
          </BentoCard>

          <BentoCard className="min-h-[400px]" title={date ? format(date, "MMMM do, yyyy") : t("attendanceHub.statsTitle")} icon={<Info className="h-5 w-5" />}>
            {!lessonsForDate ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                 <CalendarIcon className="h-10 w-10 mb-4 opacity-50" />
                 <p>{t("attendanceHub.noLessonsSelected")}</p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                 {lessonsForDate.map((lesson, idx) => {
                   let statusKey = lesson.status === "present" ? "statusPresent" 
                                 : lesson.status === "late" ? "statusLate" : "statusAbsent";
                   
                   return (
                   <div key={idx} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                           {t("attendanceHub.lessonOrdinal", { count: lesson.period + 1 })} {lesson.subjects?.name || "—"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-background border px-3 py-1.5 rounded-full">
                         {getStatusIcon(lesson.status)}
                         <span className={`text-sm font-medium ${getStatusColor(lesson.status)}`}>
                            {t(`attendanceHub.${statusKey}`)}
                         </span>
                      </div>
                   </div>
                 )})}
              </div>
            )}
          </BentoCard>
        </div>
      )}
    </div>
  );
}
