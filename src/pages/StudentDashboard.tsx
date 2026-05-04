import { useState, useCallback, useMemo } from "react";
import StudentSchedule from "./StudentSchedule";
import { format, differenceInHours, addDays, isWeekend } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Megaphone, 
  BookOpen, 
  Loader2,
  Check,
  Search,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Coffee,
  Paperclip,
  Info
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useScheduleEntries, useAnnouncements, useAssignments, useStudents, useBellSchedule, useStudentAttendanceHistory } from "@/hooks/useApiData";
import { useSchool } from "@/contexts/SchoolContext";
import { toast } from "sonner";

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [scheduleView, setScheduleView] = useState<"day" | "week">("day");

  const studentId = user?.student_id;
  const { data: allStudents = [] } = useStudents();
  const { role } = useSchool();
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(studentId || null);
  const [openSelector, setOpenSelector] = useState(false);

  const currentStudent = allStudents.find(s => s.id === (selectedStudentId || studentId));
  const classId = currentStudent?.class_id;

  const { data: dbAnnouncements = [], isLoading: loadingAnnouncements } = useAnnouncements(classId || undefined);
  const { data: dbAssignments = [], isLoading: loadingAssignments } = useAssignments(undefined, classId || undefined);

  // Bell schedule — dynamic period times from DB
  const { data: bellSchedules = [] } = useBellSchedule();
  const activeBell = bellSchedules.length > 0 ? bellSchedules[0] : null;

  // Build period time map from bell schedule
  const periodTimes = useMemo(() => {
    const map: Record<number, { start: string; end: string }> = {};
    if (activeBell) {
      for (const p of activeBell.periods) {
        map[p.period] = { start: p.start, end: p.end };
      }
    }
    return map;
  }, [activeBell]);

  // Build break info for display between lessons
  const breakAfterPeriod = useMemo(() => {
    const map: Record<number, { name: string; duration: number }> = {};
    if (activeBell) {
      for (const p of activeBell.periods) {
        if (p.break_after && p.break_after.duration > 15) {
          map[p.period] = p.break_after;
        }
      }
    }
    return map;
  }, [activeBell]);

  // For tasks, we keep local status for checking since Assignment model doesn't have a StudentAssignment junction yet
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const selectedDay = useMemo(() => {
    if (!date) return 0;
    const d = date.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    return Math.max(d - 1, 0); // Mon=0 .. Fri=4, clamp weekends to 0
  }, [date]);

  const { data: scheduleAll = [], isLoading: loadingSchedule } = useScheduleEntries({ classId: classId || undefined });
  const { data: attendanceData = [] } = useStudentAttendanceHistory(selectedStudentId || studentId || undefined);

  const attendanceMap = useMemo(() => {
    const map: Record<string, string> = {};
    attendanceData.forEach((a: any) => {
      // Use date + period as key
      const key = `${a.date}_${a.period}`;
      map[key] = a.status;
    });
    return map;
  }, [attendanceData]);

  const todaySchedule = useMemo(() => {
    if (!scheduleAll.length) return [];
    return (scheduleAll as any[])
      .filter((e: any) => e.day === selectedDay)
      .sort((a: any, b: any) => a.period - b.period)
      .map((e: any) => {
        const times = periodTimes[e.period] || { start: "—", end: "—" };
        const breakInfo = breakAfterPeriod[e.period];
        return {
          id: e.id,
          subject: e.subjects?.name || "—",
          startTime: times.start,
          endTime: times.end,
          room: e.rooms?.name || "—",
          teacherName: e.teachers?.name || "—",
          period: e.period,
          breakAfter: breakInfo,
        };
      });
  }, [scheduleAll, selectedDay, periodTimes, breakAfterPeriod]);

  const toggleTask = useCallback((id: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const getTaskColor = (dueDate: string, isCompleted: boolean) => {
    if (isCompleted) return "border-green-500/50 bg-green-500/10 dark:bg-green-500/20";
    const hours = differenceInHours(new Date(dueDate), new Date());
    if (hours < 24) return "border-red-500/50 bg-red-500/10 dark:bg-red-500/20";
    if (hours < 72) return "border-yellow-500/50 bg-yellow-500/10 dark:bg-yellow-500/20";
    return "bg-card border-border border-l-4 border-l-secondary-foreground text-foreground";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        
        {role === 'admin' && (
           <Popover open={openSelector} onOpenChange={setOpenSelector}>
             <PopoverTrigger asChild>
               <Button
                 variant="outline"
                 role="combobox"
                 aria-expanded={openSelector}
                 className="w-[280px] h-12 justify-between rounded-xl border-primary/20 bg-primary/5"
               >
                 {selectedStudentId
                   ? allStudents.find((s) => s.id === selectedStudentId)?.name
                   : "Preview Student..."}
                 <UserIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
               </Button>
             </PopoverTrigger>
             <PopoverContent className="w-[280px] p-0 rounded-xl">
               <Command>
                 <CommandInput placeholder="Search students..." />
                 <CommandList>
                   <CommandEmpty>{t("marks.no_student_found", "No student found.")}</CommandEmpty>
                   <CommandGroup>
                     {allStudents.map((student) => (
                       <CommandItem
                         key={student.id}
                         value={student.name}
                         onSelect={() => {
                           setSelectedStudentId(student.id);
                           setOpenSelector(false);
                           toast.info(`Dashboard preview: ${student.name}`);
                         }}
                       >
                         <Check
                           className={cn(
                             "mr-2 h-4 w-4",
                             selectedStudentId === student.id ? "opacity-100" : "opacity-0"
                           )}
                         />
                         {student.name}
                       </CommandItem>
                     ))}
                   </CommandGroup>
                 </CommandList>
               </Command>
             </PopoverContent>
           </Popover>
        )}
      </div>

      {/* Schedule section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {scheduleView === "day" ? t("sidebar.schedule") : t("calendar.viewWeek", "Неделя")}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex bg-muted/30 p-1 rounded-xl">
              <button 
                onClick={() => setScheduleView("day")}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", scheduleView === "day" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                {t("calendar.viewDay", "День")}
              </button>
              <button 
                onClick={() => setScheduleView("week")}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", scheduleView === "week" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                {t("calendar.viewWeek", "Неделя")}
              </button>
            </div>
            {scheduleView === "day" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl hover:bg-accent hover:text-accent-foreground text-primary shadow-sm">
                    <CalendarIcon className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0 rounded-xl border-border shadow-lg">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    modifiers={{
                      weekend: (d) => isWeekend(d),
                      holiday: [new Date(2026, 4, 1), new Date(2026, 4, 9)],
                    }}
                    modifiersClassNames={{
                      weekend: "text-destructive font-medium",
                      holiday: "text-primary font-bold underline decoration-primary underline-offset-4",
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {scheduleView === "week" ? (
          <div className="-mt-4">
            <StudentSchedule />
          </div>
        ) : loadingSchedule ? (
          <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[170px] w-[280px] rounded-[32px] shrink-0" />)}
          </div>
        ) : (
          <div className="relative group">
            <div className="flex gap-4 overflow-x-auto pb-6 pt-2 no-scrollbar scroll-smooth">
              {todaySchedule.length > 0 ? (
                todaySchedule.map((lesson, idx) => (
                  <div key={lesson.id} className="flex items-center gap-4 shrink-0 first:pl-1 last:pr-1">
                    
                    {/* Break Logic */}
                    {idx > 0 && todaySchedule[idx - 1].breakAfter && (
                      <div className="relative flex flex-col items-center justify-center gap-2 w-[280px] h-[170px] rounded-[32px] bg-amber-500/5 dark:bg-amber-500/10 border border-dashed border-amber-500/30 text-amber-600 dark:text-amber-400 transition-all duration-300 hover:bg-amber-500/10">
                        <div className="p-3 rounded-2xl bg-amber-500/10">
                          <Coffee className="h-6 w-6" />
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-black uppercase tracking-widest block mb-1">
                            {todaySchedule[idx - 1].breakAfter!.name || "Break"}
                          </span>
                          <span className="text-lg font-black opacity-80">{todaySchedule[idx - 1].breakAfter!.duration} {t("common.min", "min")}</span>
                        </div>
                      </div>
                    )}

                    {/* Lesson Card */}
                    <div 
                      className={`
                        relative w-[280px] h-[170px] rounded-[32px] p-6 border transition-all duration-500 group/card flex flex-col justify-between
                        bg-card/40 border-border/50 hover:border-primary/40 hover:bg-card/60 hover:shadow-xl hover:-translate-y-1
                      `}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`
                            text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg
                            bg-secondary text-secondary-foreground
                          `}>
                            {t("bellSetup.period")} {lesson.period + 1}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground opacity-60">
                            <Clock className="h-3 w-3" />
                            {periodTimes[lesson.period] ? `${periodTimes[lesson.period].start} - ${periodTimes[lesson.period].end}` : `Period ${lesson.period + 1}`}
                          </div>
                        </div>
                        <h3 className="text-xl font-black tracking-tight leading-tight group-hover/card:text-primary transition-colors line-clamp-2 pr-2">
                          {lesson.subject}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex flex-col gap-1 flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 truncate">
                            <User className="h-4 w-4 opacity-40 shrink-0" />
                            <span className="text-xs font-bold tracking-tight truncate" title={lesson.teacherName}>{lesson.teacherName}</span>
                          </div>
                          {attendanceMap[`${format(date || new Date(), "yyyy-MM-dd")}_${lesson.period}`] && (
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md w-fit truncate",
                              attendanceMap[`${format(date || new Date(), "yyyy-MM-dd")}_${lesson.period}`] === 'present' ? 'bg-emerald-500/10 text-emerald-600' :
                              attendanceMap[`${format(date || new Date(), "yyyy-MM-dd")}_${lesson.period}`] === 'absent' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                            )}>
                              {t(`attendance.${attendanceMap[`${format(date || new Date(), "yyyy-MM-dd")}_${lesson.period}`]}`)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-secondary/30 border border-border/20 backdrop-blur-sm transition-all shrink-0 max-w-[100px]">
                          <MapPin className="h-3.5 w-3.5 opacity-40 shrink-0" />
                          <span className="text-[11px] font-bold truncate" title={lesson.room}>{lesson.room}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 w-full text-muted-foreground border-2 border-dashed border-border/50 rounded-[32px] bg-secondary/5">
                  <BookOpen className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium tracking-wide uppercase opacity-60">{t("teacher.noLessonsToday", "No lessons today.")}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Announcements */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("tiles.announcements")}</h2>
          <Card className="h-[400px] flex flex-col rounded-2xl shadow-sm border-border/50 overflow-hidden bg-card/50">
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="p-5 space-y-4">
                {loadingAnnouncements ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                ) : dbAnnouncements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic">
                    <Megaphone className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">{t("dashboard.noAnnouncements", "No announcements for your class.")}</p>
                  </div>
                ) : (
                  dbAnnouncements.map((a: any) => {
                    const colorClasses = (() => {
                      switch (a.color) {
                        case "emerald": return "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40";
                        case "amber": return "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40";
                        case "rose": return "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40";
                        case "violet": return "bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40";
                        case "cyan": return "bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40";
                        default: return "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40";
                      }
                    })();
                    const accentColor = (() => {
                      switch (a.color) {
                        case "emerald": return "bg-emerald-500";
                        case "amber": return "bg-amber-500";
                        case "rose": return "bg-rose-500";
                        case "violet": return "bg-violet-500";
                        case "cyan": return "bg-cyan-500";
                        default: return "bg-blue-500";
                      }
                    })();

                    return (
                      <div key={a.id} className={cn("p-4 rounded-xl border shadow-sm transition-all relative overflow-hidden", colorClasses)}>
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-60", accentColor)} />
                        <div className="flex justify-between items-start mb-2 text-wrap break-all pl-2">
                          <h4 className="font-semibold text-foreground">{a.title}</h4>
                          <span className="text-[10px] font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md shrink-0">
                            {format(new Date(a.created_at), "MMM d")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-2">{a.content}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deadlines / Tasks */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("tiles.deadlines")}</h2>
          <Card className="h-[400px] flex flex-col rounded-2xl shadow-sm border-border/50 overflow-hidden bg-card/50">
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="p-5 space-y-3">
                {loadingAssignments ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                ) : dbAssignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic">
                    <Clock className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">{t("dashboard.noTasks", "No tasks assigned.")}</p>
                  </div>
                ) : (
                  dbAssignments
                    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                    .map((task) => {
                      const isCompleted = completedTasks.has(task.id);
                      return (
                        <HoverCard key={task.id} openDelay={200}>
                          <HoverCardTrigger asChild>
                            <label
                              htmlFor={`task-${task.id}`}
                              className={cn(
                                "flex items-center p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                                getTaskColor(task.due_date, isCompleted)
                              )}
                            >
                              <Checkbox
                                id={`task-${task.id}`}
                                checked={isCompleted}
                                onCheckedChange={() => toggleTask(task.id)}
                                className="mr-4 ml-1 h-5 w-5 rounded-md"
                              />
                              <div className="flex-1 min-w-0 pr-2">
                                <h4 className={cn("text-[15px] font-semibold leading-tight mb-1", isCompleted && "line-through opacity-60")}>
                                   {task.title}
                                </h4>
                                <p className={cn("text-xs flex items-center gap-2 flex-wrap", isCompleted ? "opacity-60" : "text-muted-foreground")}>
                                  <span className="bg-background/80 shadow-sm border border-border/50 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                    {task.type_of_work}
                                  </span>
                                  <span>•</span>
                                  <span className="font-medium">{format(new Date(task.due_date), "MMM d")}</span>
                                  {task.attachment_url && (
                                    <a href={task.attachment_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-primary hover:underline">
                                      <Paperclip className="h-3 w-3" />
                                      <span className="text-[10px] font-bold">{t("assignments.attachment", "File")}</span>
                                    </a>
                                  )}
                                </p>
                              </div>
                            </label>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 rounded-2xl p-4 shadow-xl border-border/50" align="start" side="left">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <h4 className="font-black leading-tight text-lg">{task.title}</h4>
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-secondary rounded-md shrink-0">
                                  {task.type_of_work}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {format(new Date(task.due_date), "MMM d, yyyy")}
                                </div>
                                <div className="flex items-center gap-1">
                                  <UserIcon className="h-3 w-3" />
                                  {task.teacher_name || "Teacher"}
                                </div>
                              </div>

                              <hr className="border-border/40" />

                              {task.description ? (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {task.description}
                                </p>
                              ) : (
                                <div className="flex items-center text-muted-foreground opacity-60 text-sm italic">
                                  <Info className="h-4 w-4 mr-2" />
                                  {t("common.noDescription", "No description provided")}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[10px] font-bold pt-2">
                                <span className="uppercase tracking-widest opacity-50">{t("assignments.weight_system", "Weight")}:</span>
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">×{task.weight || 1}</span>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
