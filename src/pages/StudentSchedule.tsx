import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useScheduleEntries, useBellSchedule } from "@/hooks/useApiData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Loader2, MapPin, Users2, List, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DAYS = ["onboarding.mon", "onboarding.tue", "onboarding.wed", "onboarding.thu", "onboarding.fri"];

const getSubjectColor = (subjectName: string) => {
  const colors = [
    "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20",
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20",
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20",
    "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/20",
    "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-cyan-500/20",
    "bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-pink-500/20",
  ];
  if (!subjectName) return colors[0];
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function StudentSchedule() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const currentDayOfWeek = new Date().getDay();
  const defaultDay = currentDayOfWeek >= 1 && currentDayOfWeek <= 5 ? currentDayOfWeek - 1 : 0;
  const [selectedDay, setSelectedDay] = useState(defaultDay);

  // Use either teacher_id or student_id depending on the user's role
  const params = user?.role === "teacher" 
    ? { teacherId: user.teacher_id || user.id } 
    : { studentId: user?.student_id || user?.id };

  const { data: schedule = [], isLoading } = useScheduleEntries(params);
  const { data: bellSchedules = [] } = useBellSchedule();

  // Determine periods count from bell schedule or default to 8
  const defaultPeriods = 8;
  const periods = bellSchedules[0]?.periods?.length || defaultPeriods;
  const PERIODS_ARRAY = Array.from({ length: periods }, (_, i) => i);
  
  const getEntry = (day: number, period: number) => schedule.find((e: any) => e.day === day && e.period === period);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isTeacher = user?.role === "teacher";
  const title = isTeacher ? t("mySchedule", "Моё расписание") : t("studentSchedule.title", "Расписание студента");
  
  let subtitle = t("studentSchedule.noClass", "Класс не назначен");
  if (isTeacher) {
    subtitle = user?.name || "";
  } else if (schedule.length > 0) {
    subtitle = schedule[0].class_name || schedule[0].classes?.name || "";
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-primary" />
          {title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">
          {subtitle}
        </p>
      </div>

      <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-muted/10 border-b border-border/50 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {viewMode === "week" ? t("studentSchedule.weeklyView", "Расписание на неделю") : t("studentSchedule.dailyView", "Расписание на день")}
          </CardTitle>
          <div className="flex bg-muted/30 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode("day")}
              className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", viewMode === "day" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="w-3.5 h-3.5" />
              {t("calendar.viewDay", "День")}
            </button>
            <button 
              onClick={() => setViewMode("week")}
              className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", viewMode === "week" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {t("calendar.viewWeek", "Неделя")}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === "day" && (
            <div className="flex gap-2 p-4 border-b border-border/50 overflow-x-auto">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                    selectedDay === i 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {t(d)}
                </button>
              ))}
            </div>
          )}
          {schedule.length === 0 ? (
            <div className="py-20 text-center opacity-50 flex flex-col items-center">
              <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">{t("studentSchedule.noSchedule", "Расписание пока не составлено")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="w-full text-sm border-separate border-spacing-y-3 border-spacing-x-2">
                <thead>
                  <tr>
                    <th className="p-2 text-center w-16">
                      <span className="font-black uppercase text-[10px] tracking-wider text-muted-foreground opacity-60">{t("schedule.period", "Урок")}</span>
                    </th>
                    {DAYS.map((d, i) => {
                      if (viewMode === "day" && i !== selectedDay) return null;
                      return (
                        <th key={i} className="p-2 text-center">
                          <span className="font-black uppercase text-[11px] tracking-widest opacity-50">{t(d)}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS_ARRAY.map((period) => {
                    const bell = bellSchedules[0]?.periods?.find((p: any) => p.period === period);
                    
                    return (
                      <tr key={period} className="group">
                        <td className="p-2 font-medium text-center relative w-16 align-top pt-6">
                          <div className="text-xl font-black text-foreground/80">{period + 1}</div>
                          {bell && (
                            <div className="text-[9px] text-muted-foreground font-black mt-1 opacity-40 uppercase tracking-widest leading-tight">
                              {bell.start}<br/>{bell.end}
                            </div>
                          )}
                        </td>
                        {DAYS.map((_, day) => {
                          if (viewMode === "day" && day !== selectedDay) return null;
                          
                          const entry = getEntry(day, period);
                          if (!entry) return (
                            <td key={day} className="p-1 relative h-36 align-top min-w-[140px]">
                              <div className="absolute inset-1 rounded-3xl border-2 border-dashed border-border/30 bg-muted/5 transition-colors hover:bg-muted/10"></div>
                            </td>
                          );
                          
                          const subjectName = entry.subject_name || entry.subjects?.name || "—";
                          const colorClasses = getSubjectColor(subjectName);
                          
                          return (
                            <td key={day} className="p-1 relative h-36 align-top min-w-[140px]">
                              <div className={cn(
                                "absolute inset-1 rounded-3xl p-4 flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:z-10 cursor-pointer ring-1",
                                colorClasses
                              )}>
                                <div>
                                  <div className="font-black text-[13px] leading-snug line-clamp-3">
                                    {subjectName}
                                  </div>
                                  <div className="text-[10px] mt-2.5 font-bold opacity-80 flex items-center gap-1.5 tracking-wide">
                                    {isTeacher ? (
                                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 uppercase"><Users2 className="h-3 w-3" /> {entry.class_name || entry.classes?.name || "—"}</span>
                                    ) : (
                                      <span className="line-clamp-2 leading-tight">{entry.teacher_name || entry.teachers?.name || "—"}</span>
                                    )}
                                  </div>
                                </div>
                                
                                {entry.room_name && (
                                  <div className="flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-widest opacity-60 bg-black/5 dark:bg-white/10 w-fit px-2 py-1 rounded-lg">
                                    <MapPin className="h-3 w-3" />
                                    {entry.room_name}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
