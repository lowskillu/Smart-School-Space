import { useState, useMemo, useEffect } from "react";
import StudentSchedule from "./StudentSchedule";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ClipboardList, CheckCircle2, XCircle, Clock, 
  PlayCircle, Loader2, Megaphone, Bell, Calendar as CalendarIcon,
  ChevronRight, ArrowRight, Coffee, Plus, DoorOpen, MessageSquare, User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  useClasses, useStudents, useBatchUpsertAttendance, 
  useScheduleEntries, useAnnouncements, useBellSchedule, useChats 
} from "@/hooks/useApiData";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const statusIcons = {
  present: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  absent: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  late: { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
} as const;

export default function TeacherDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 1. All Base Data Hooks
  const { data: classes = [] } = useClasses();
  const { data: schedule = [] } = useScheduleEntries({ teacherId: user?.teacher_id });
  const { data: bellSchedules = [] } = useBellSchedule();
  const { data: chats = [] } = useChats();
  const batchUpsertAttendance = useBatchUpsertAttendance();

  // 2. States
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent" | "late">>({});
  const [isSaving, setIsSaving] = useState(false);
  const [tick, setTick] = useState(0);
  const [scheduleView, setScheduleView] = useState<"day" | "week">("day");
  // Announcement creation
  const [annDlg, setAnnDlg] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annColor, setAnnColor] = useState("blue");
  const [annAudience, setAnnAudience] = useState("staff");
  const [annClassId, setAnnClassId] = useState<string>("");
  const [annSaving, setAnnSaving] = useState(false);
  const qc = useQueryClient();

  // 3. Time Tracking Effects
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // 4. Derived Data (Memos)
  const currentDay = useMemo(() => {
    try {
      // Robust day detection for Almaty
      const almatyDay = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Almaty' });
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const idx = days.indexOf(almatyDay);
      return idx !== -1 ? idx : (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
    } catch (e) {
      const d = new Date().getDay();
      return d === 0 ? 6 : d - 1;
    }
  }, [tick]);

  const currentPeriod = useMemo(() => {
    if (!bellSchedules || bellSchedules.length === 0) return -1;
    const now = new Date();
    const nowStr = now.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Almaty' 
    });
    
    const firstSchedule = bellSchedules[0];
    if (firstSchedule?.periods) {
      const active = firstSchedule.periods.find((p: any) => {
        return nowStr >= p.start && nowStr <= p.end;
      });
      return active ? active.period : -1;
    }
    return -1;
  }, [bellSchedules, tick]);

  const periodTimes = useMemo(() => {
    const map: Record<number, { start: string; end: string }> = {};
    const firstSchedule = (bellSchedules || [])[0];
    if (firstSchedule?.periods) {
      for (const p of firstSchedule.periods) {
        map[p.period] = { start: p.start, end: p.end };
      }
    }
    return map;
  }, [bellSchedules]);

  const breakAfterPeriod = useMemo(() => {
    const map: Record<number, { name: string; duration: number }> = {};
    const firstSchedule = (bellSchedules || [])[0];
    if (firstSchedule?.periods) {
      for (const p of firstSchedule.periods) {
        if (p.break_after && p.break_after.duration > 15) {
          map[p.period] = p.break_after;
        }
      }
    }
    return map;
  }, [bellSchedules]);

  const todaySchedule = useMemo(() => {
    if (!Array.isArray(schedule)) return [];
    return schedule
      .filter((e: any) => e.day === currentDay)
      .sort((a, b) => a.period - b.period)
      .map(e => ({
        id: e.id,
        period: e.period,
        subject: e.subjects?.name || t("common.subject", "Subject"),
        class_id: e.class_id,
        class: (classes || []).find((c: any) => c.id === e.class_id)?.name || "—",
        room: e.rooms?.name || "—",
        breakAfter: breakAfterPeriod[e.period] || null
      }));
  }, [schedule, currentDay, classes, breakAfterPeriod]);

  const currentLesson = todaySchedule.find(s => s.period === currentPeriod);

  const firstClassId = (classes || [])[0]?.id;
  const { data: students, isLoading: studentsLoading } = useStudents(activeLesson?.class_id || firstClassId);
  const { data: announcements = [] } = useAnnouncements(firstClassId);

  useEffect(() => {
    if (activeLesson) {
      setAttendance({});
    }
  }, [activeLesson]);

  const toggleStatus = (studentId: string) => {
    setAttendance(prev => {
      const current = prev[studentId] || "present";
      const next: "present" | "absent" | "late" = current === "present" ? "absent" : current === "absent" ? "late" : "present";
      return { ...prev, [studentId]: next };
    });
  };

  const handleSaveAttendance = async () => {
    if (!activeLesson) return;
    setIsSaving(true);
    try {
      const records = (students || []).map(student => ({
        student_id: student.id,
        class_id: activeLesson.class_id,
        day: currentDay,
        period: activeLesson.period,
        date: new Date().toISOString().split('T')[0],
        status: attendance[student.id] || "present"
      }));

      await batchUpsertAttendance.mutateAsync(records);
      toast.success(t("teacher.attendanceSaved", "Attendance saved successfully!"));
      setAttendanceOpen(false);
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.message || t("common.error");
      toast.error(`${t("common.error")}: ${errorMsg}`);
      console.error("Attendance save failed:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) return;
    setAnnSaving(true);
    try {
      await api.post("/announcements", {
        title: annTitle,
        content: annContent,
        is_global: annAudience !== "class",
        class_id: annAudience === "class" ? annClassId : null,
        color: annColor,
        audience: annAudience === "class" ? "all" : annAudience,
      });
      toast.success(t("teacher.announcementCreated", "Announcement published!"));
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setAnnDlg(false);
      setAnnTitle("");
      setAnnContent("");
      setAnnColor("blue");
      setAnnAudience("staff");
      setAnnClassId("");
    } catch (e: any) {
      toast.error(t("common.error"));
    } finally {
      setAnnSaving(false);
    }
  };

  const ANN_COLORS = [
    { id: "blue", bg: "bg-blue-500/15", border: "border-blue-500/40", ring: "ring-blue-500", text: "text-blue-500", accent: "bg-blue-500" },
    { id: "emerald", bg: "bg-emerald-500/15", border: "border-emerald-500/40", ring: "ring-emerald-500", text: "text-emerald-500", accent: "bg-emerald-500" },
    { id: "amber", bg: "bg-amber-500/15", border: "border-amber-500/40", ring: "ring-amber-500", text: "text-amber-500", accent: "bg-amber-500" },
    { id: "rose", bg: "bg-rose-500/15", border: "border-rose-500/40", ring: "ring-rose-500", text: "text-rose-500", accent: "bg-rose-500" },
    { id: "violet", bg: "bg-violet-500/15", border: "border-violet-500/40", ring: "ring-violet-500", text: "text-violet-500", accent: "bg-violet-500" },
    { id: "cyan", bg: "bg-cyan-500/15", border: "border-cyan-500/40", ring: "ring-cyan-500", text: "text-cyan-500", accent: "bg-cyan-500" },
  ];

  const AUDIENCES = [
    { id: "all", label: "teacher.audience_all", icon: "🌐" },
    { id: "staff", label: "teacher.audience_staff", icon: "👔" },
    { id: "teachers", label: "teacher.audience_teachers", icon: "📚" },
    { id: "class", label: "teacher.audience_class", icon: "🏫" },
  ];

  const localizedDate = new Date().toLocaleDateString(i18n.language, { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  return (
    <div className="space-y-10 max-w-7xl mx-auto p-4 sm:p-6 pb-20 animate-in fade-in duration-500">
      
      {/* 1. Header Segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-none">
            {t("sidebar.dashboard", "DASHBOARD")}
          </h1>
          <p className="text-lg font-medium text-muted-foreground mt-2 flex items-center gap-4">
            <span>{t("teacher.welcomeBack", "Welcome back,")} <span className="text-foreground font-bold">{user?.name || t("common.teacher", "Teacher")}</span></span>
            <span className="h-1.5 w-1.5 rounded-full bg-border" />
            <span className="text-primary font-black tracking-widest bg-primary/5 px-3 py-1 rounded-full text-xs">
              {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => { if(currentLesson) { setActiveLesson(currentLesson); setAttendanceOpen(true); } }}
            disabled={!currentLesson}
            className={`
              h-16 px-8 rounded-full font-black uppercase text-[11px] tracking-widest gap-3 shadow-2xl transition-all duration-300
              ${currentLesson 
                ? 'bg-primary text-primary-foreground shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5' 
                : 'bg-muted text-muted-foreground'
              }
            `}
          >
            <PlayCircle className={`h-5 w-5 ${currentLesson ? 'animate-pulse' : ''}`} />
            <span>{t("teacher.currentLesson", "Current Lesson")}</span>
          </Button>
        </div>
      </div>

      {/* 2. Schedule Row */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <CalendarIcon className="h-6 w-6" />
            </div>
            {scheduleView === "day" ? t("teacher.myScheduleToday", "My Schedule Today") : t("calendar.viewWeek", "Неделя")}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex bg-muted/30 p-1 rounded-xl">
              <button 
                onClick={() => setScheduleView("day")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${scheduleView === "day" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t("calendar.viewDay", "День")}
              </button>
              <button 
                onClick={() => setScheduleView("week")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${scheduleView === "week" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t("calendar.viewWeek", "Неделя")}
              </button>
            </div>
            {scheduleView === "day" && (
              <div className="text-[10px] hidden sm:block font-black uppercase tracking-widest text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
                {localizedDate}
              </div>
            )}
          </div>
        </div>

        {scheduleView === "week" ? (
          <div className="-mt-4">
            <StudentSchedule />
          </div>
        ) : (
          <div className="relative group">
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 no-scrollbar scroll-smooth">
            {todaySchedule.length > 0 ? (
              todaySchedule.map((lesson, idx) => (
                <div key={lesson.id} className="flex items-center gap-4 shrink-0 first:pl-1 last:pr-1">
                  
                  {/* Lesson Card */}
                  <div 
                    onClick={() => { setActiveLesson(lesson); setAttendanceOpen(true); }}
                    className={`
                      relative w-[280px] h-[170px] rounded-[32px] p-6 cursor-pointer border transition-all duration-500 group/card flex flex-col justify-between
                      ${lesson.period === currentPeriod 
                        ? 'bg-primary/10 border-primary/40 shadow-2xl ring-1 ring-primary/50' 
                        : 'bg-card/40 border-border/50 hover:border-primary/40 hover:bg-card/60 hover:shadow-xl hover:-translate-y-1'
                      }
                    `}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`
                          text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg
                          ${lesson.period === currentPeriod ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}
                        `}>
                          {t("bellSetup.period")} {lesson.period + 1}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground opacity-60">
                          <Clock className="h-3 w-3" />
                          {periodTimes[lesson.period] ? `${periodTimes[lesson.period].start} - ${periodTimes[lesson.period].end}` : `${t("bellSetup.period")} ${lesson.period + 1}`}
                        </div>
                      </div>
                      <h3 className="text-xl font-black tracking-tight leading-tight group-hover/card:text-primary transition-colors line-clamp-2 pr-2">
                        {lesson.subject}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 opacity-40" />
                        <span className="text-sm font-bold tracking-tight">{lesson.class}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-secondary/30 border border-border/20 backdrop-blur-sm transition-all">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t("crud.rooms")}</span>
                        <span className="text-xs font-bold">{lesson.room}</span>
                      </div>
                    </div>
                  </div>

                  {/* Break Logic */}
                  {lesson.breakAfter && (
                    <div className="relative flex flex-col items-center justify-center gap-2 w-[280px] h-[170px] rounded-[32px] bg-amber-500/5 dark:bg-amber-500/10 border border-dashed border-amber-500/30 text-amber-600 dark:text-amber-400 transition-all duration-300 hover:bg-amber-500/10">
                      <div className="p-3 rounded-2xl bg-amber-500/10">
                        <Coffee className="h-6 w-6" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-black uppercase tracking-widest block mb-1">
                          {lesson.breakAfter.name || t("bellSetup.break", "Break")}
                        </span>
                        <span className="text-lg font-black opacity-80">{lesson.breakAfter.duration} {t("common.min")}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 w-full text-muted-foreground border-2 border-dashed border-border/50 rounded-[32px] bg-secondary/5">
                <ClipboardList className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium tracking-wide uppercase opacity-60">{t("teacher.noLessonsToday", "No lessons today.")}</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* 3. Bottom Grid - Announcements | Notifications & Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Announcements */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
              <div className="p-2 rounded-2xl bg-primary/10 text-primary">
                <Megaphone className="h-6 w-6" />
              </div>
              {t("tiles.announcements", "Announcements")}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setAnnDlg(true)} className="rounded-full text-xs font-bold gap-2">
              {t("common.post", "Post")} <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {(announcements || []).length > 0 ? (
              (announcements || []).slice(0, 3).map((a: any) => {
                const ac = ANN_COLORS.find(c => c.id === a.color) || ANN_COLORS[0];
                return (
                <div key={a.id} className={`group p-5 rounded-[28px] border ${ac.border} ${ac.bg} hover:shadow-lg transition-all duration-300 relative overflow-hidden`}>
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${ac.accent} rounded-l-[28px]`} />
                  <div className="flex justify-between items-start gap-4 pl-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${ac.text} ${ac.bg} px-2 py-0.5 rounded-full`}>
                          {a.is_global ? t("teacher.global", "Global") : t("teacher.class_scope", "Class")}
                        </span>
                        {a.audience && a.audience !== "all" && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {t(`teacher.audience_${a.audience}`, a.audience)}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString(i18n.language, { day: "numeric", month: "short" }) : t("common.today", "Today")}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{a.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>
                      <p className="text-[10px] text-muted-foreground/60 font-bold">{a.author_name}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                );
              })
            ) : (
              <div className="p-10 rounded-[32px] border border-dashed text-center opacity-40">
                <p className="text-sm font-bold uppercase tracking-widest">{t("teacher.noAnnouncements", "No recent announcements")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Notifications & Chats */}
        <div className="lg:col-span-5 space-y-8">
           {/* Notifications Part */}
           <div className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
                  <div className="p-2 rounded-2xl bg-primary/10 text-primary">
                    <Bell className="h-6 w-6" />
                  </div>
                  {t("common.notifications", "Notifications")}
                </h2>
              </div>
              <div className="p-6 rounded-[32px] bg-card border border-border/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Bell className="h-20 w-20" />
                </div>
                <div className="space-y-4">
                  {chats.some(c => c.unread_count > 0) ? (
                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-primary/5 border border-primary/10">
                       <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                          <MessageSquare className="h-5 w-5" />
                       </div>
                       <div>
                          <p className="text-sm font-black">{t("teacher.new_messages", "New Messages")}</p>
                          <p className="text-xs text-muted-foreground">{t("teacher.unread_chats", "You have unread chats to reply")}</p>
                       </div>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-muted-foreground opacity-60 text-center py-4">{t("common.noNotifications", "No new notifications")}</p>
                  )}
                </div>
              </div>
           </div>

           {/* Quick Chats Part */}
           <div className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-black flex items-center gap-3 tracking-tight">
                  <div className="p-2 rounded-2xl bg-primary/10 text-primary">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  {t("communication.recentChats", "Recent Chats")}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate("/app/communication")} className="rounded-full text-xs font-bold gap-2">
                   {t("communication.openChat", "Open Chat")} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {chats.slice(0, 3).map(chat => (
                  <div 
                    key={chat.id} 
                    onClick={() => navigate(`/app/communication?chatId=${chat.id}`)}
                    className="flex items-center justify-between p-4 rounded-3xl bg-card border border-border/50 hover:border-primary/40 hover:bg-card/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden">
                        {chat.is_group ? (
                          <div className="grid grid-cols-2 gap-0.5">
                            <div className="w-4 h-4 bg-primary/40 rounded-sm" />
                            <div className="w-4 h-4 bg-secondary-foreground/20 rounded-sm" />
                            <div className="w-4 h-4 bg-secondary-foreground/20 rounded-sm" />
                            <div className="w-4 h-4 bg-primary/40 rounded-sm" />
                          </div>
                        ) : (
                          <UserIcon className="h-6 w-6 opacity-40" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-sm group-hover:text-primary transition-colors line-clamp-1">{chat.name || t("chat.chat", "Chat")}</p>
                        <p className="text-[10px] font-medium text-muted-foreground line-clamp-1">
                          {chat.last_message?.content || t("communication.noMessages", "No messages yet")}
                        </p>
                      </div>
                    </div>
                    {chat.unread_count > 0 && (
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shadow-lg shadow-primary/20">
                        {chat.unread_count}
                      </div>
                    )}
                  </div>
                ))}
                {chats.length === 0 && (
                 <div className="p-8 rounded-[32px] border border-dashed text-center opacity-40">
                    <p className="text-xs font-bold uppercase tracking-widest">{t("communication.noMessages", "No recent chats")}</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Action Dialog (Attendance) */}
      <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[40px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-8 bg-gradient-to-br from-primary/10 via-background to-background">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20">
                  <ClipboardList className="h-7 w-7" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tight leading-none">
                    {t("sidebar.attendance", "Attendance")}
                  </DialogTitle>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    {activeLesson?.subject} <span className="text-primary">— {activeLesson?.class}</span>
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {studentsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t("common.loading", "Loading...")}</span>
                </div>
              ) : (students || []).map((student) => {
                const status = attendance[student.id] || "present";
                const config = statusIcons[status];
                const StatusIcon = config.icon;
                
                return (
                  <div 
                    key={student.id}
                    onClick={() => toggleStatus(student.id)}
                    className={`
                      group flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer
                      ${status === 'present' ? 'bg-card/40 border-border/50 hover:bg-card/80' : 'bg-secondary/40 border-primary/20 shadow-inner'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center text-xs font-black">
                        {student.name.slice(0, 1)}
                      </div>
                      <span className="font-bold tracking-tight">{student.name}</span>
                    </div>
                    
                    <div className={`
                      flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-300
                      ${config.bg} ${config.color} ${status !== 'present' ? 'scale-105 border-primary/30' : 'border-transparent'}
                    `}>
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {t(`attendance.${status}`, status)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="mt-8 gap-3 sm:gap-0">
              <Button 
                variant="ghost" 
                onClick={() => setAttendanceOpen(false)}
                className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest"
              >
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex-1 sm:flex-none"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcement Creation Dialog */}
      <Dialog open={annDlg} onOpenChange={setAnnDlg}>
        <DialogContent className="sm:max-w-[520px] rounded-[40px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-8 bg-gradient-to-br from-primary/10 via-background to-background space-y-6">
            <DialogHeader>
              <div className="flex items-center gap-4 mb-2">
                <div className="h-14 w-14 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20">
                  <Megaphone className="h-7 w-7" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tight">
                    {t("teacher.new_announcement", "New Announcement")}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">{t("teacher.ann_desc", "Publish for all staff")}</p>
                </div>
              </div>
            </DialogHeader>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t("common.title", "Title")}</label>
              <Input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder={t("teacher.ann_title_ph", "Announcement title...")} className="h-12 rounded-2xl bg-secondary/20 border-transparent text-lg font-bold focus-visible:border-primary" />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t("common.description", "Description")}</label>
              <textarea value={annContent} onChange={e => setAnnContent(e.target.value)} rows={3} placeholder={t("teacher.ann_content_ph", "Details...")} className="flex w-full rounded-2xl bg-secondary/20 border-transparent px-4 py-3 text-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary outline-none resize-none" />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t("teacher.ann_color", "Accent color")}</label>
              <div className="flex gap-2">
                {ANN_COLORS.map(c => (
                  <button key={c.id} onClick={() => setAnnColor(c.id)} className={`h-10 w-10 rounded-xl ${c.accent} transition-all ${annColor === c.id ? 'ring-2 ring-offset-2 ring-offset-background ' + c.ring + ' scale-110' : 'opacity-50 hover:opacity-80'}`} />
                ))}
              </div>
            </div>

            {/* Audience Selector */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t("teacher.ann_target", "Target")}</label>
              <div className="flex gap-2 flex-wrap">
                {AUDIENCES.map(a => (
                  <button key={a.id} onClick={() => { setAnnAudience(a.id); if (a.id !== "class") setAnnClassId(""); }} className={`px-4 py-2.5 rounded-2xl text-xs font-black tracking-widest transition-all flex items-center gap-2 ${annAudience === a.id ? 'bg-primary text-primary-foreground shadow-lg scale-105' : 'bg-secondary/30 hover:bg-secondary/50 text-muted-foreground'}`}>
                    <span>{a.icon}</span>
                    {t(a.label, a.id)}
                  </button>
                ))}
              </div>
              {/* Class picker — visible only when "class" audience is selected */}
              {annAudience === "class" && (
                <select
                  value={annClassId}
                  onChange={e => setAnnClassId(e.target.value)}
                  className="w-full h-12 rounded-2xl bg-secondary/20 border-transparent px-4 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none"
                >
                  <option value="" disabled>{t("teacher.ann_class_pick", "Pick a class")}</option>
                  {(classes || []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Preview */}
            {annTitle && (() => {
              const ac = ANN_COLORS.find(c => c.id === annColor) || ANN_COLORS[0];
              return (
              <div className={`p-4 rounded-[20px] border ${ac.border} ${ac.bg} relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-1.5 h-full ${ac.accent}`} />
                <div className="pl-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t("teacher.ann_preview", "Preview")}</p>
                  <h4 className="font-bold text-base">{annTitle}</h4>
                  {annContent && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{annContent}</p>}
                </div>
              </div>
              );
            })()}

            <DialogFooter className="gap-3 sm:gap-0">
              <Button variant="ghost" onClick={() => setAnnDlg(false)} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest">
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreateAnnouncement} disabled={annSaving || !annTitle.trim() || !annContent.trim() || (annAudience === "class" && !annClassId)} className="h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex-1 sm:flex-none">
                {annSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
                {t("common.publish", "Publish")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
