import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Search, CalendarDays, 
  Plus, CheckCircle2, BookOpen, Users, GraduationCap, 
  Trash2, Calendar as CalendarIcon, Settings2, AlertCircle, X, Trophy, Palette, Languages, Cpu, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useSchool } from "@/contexts/SchoolContext";
import { useClasses } from "@/hooks/useApiData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AddCourseModal } from "@/components/courses/AddCourseModal";
import { Skeleton } from "@/components/ui/skeleton";

interface Course {
  id: string;
  title: string;
  description: string;
  teacher_id: string;
  teacher_name: string;
  enrollment_limit: number;
  enrollment_count: number;
  created_at: string;
  is_active: boolean;
  target_class_ids: string[];
  schedules: {
    id: string;
    day_of_week: number | null;
    start_time: string;
    end_time: string;
    start_date: string;
    end_date: string | null;
  }[];
  is_enrolled: boolean;
  category?: string;
  cancellations: {
    id: string;
    start_date: string;
    end_date: string;
    reason: string;
  }[];
}

const ENROLLMENT_TYPES = [
  { id: "day", labelKey: "extracourses.type_day", icon: CalendarIcon },
  { id: "week", labelKey: "extracourses.type_week", icon: CalendarDays },
  { id: "month", labelKey: "extracourses.type_month", icon: CalendarIcon },
  { id: "full", labelKey: "extracourses.type_full", icon: GraduationCap },
];

const CATEGORIES = [
  { id: "academic", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", labelKey: "extracourses.cat_academic" },
  { id: "sports", icon: Trophy, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", labelKey: "extracourses.cat_sports" },
  { id: "creative", icon: Palette, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20", labelKey: "extracourses.cat_creative" },
  { id: "languages", icon: Languages, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", labelKey: "extracourses.cat_languages" },
  { id: "tech", icon: Cpu, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20", labelKey: "extracourses.cat_tech" }
];

const getCategoryData = (catId: string | undefined, t: any) => {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (cat) return { ...cat, label: t(cat.labelKey) };
  return { 
    id: "custom", 
    icon: Sparkles, 
    color: "text-primary", 
    bg: "bg-primary/10", 
    border: "border-primary/20", 
    label: catId || t("extracourses.cat_custom") 
  };
};

const CourseCard = ({ course, t, user, role, onEdit, onDelete, onEnroll, onUnenroll, onViewEnrollments, onCancelSessions }: any) => {
  const catInfo = getCategoryData(course.category, t);
  const CatIcon = catInfo.icon;
  const isTeacher = role === 'teacher' || role === 'admin';
  const isOwnCourse = isTeacher && (course.teacher_id === user?.id || role === 'admin');

  const getDayName = (day: number | null) => {
    if (day === null) return t("extracourses.oneTime");
    const days = [
      t("calendar.mon"), t("calendar.tue"), t("calendar.wed"),
      t("calendar.thu"), t("calendar.fri"), t("calendar.sat"), t("calendar.sun")
    ];
    return days[day];
  };

  const upcomingCancellations = course.cancellations?.filter((c: any) => new Date(c.end_date) >= new Date()) || [];

  return (
    <Card className={cn(
      "group relative bg-card/60 dark:bg-white/5 border border-border hover:border-primary/50 rounded-[3rem] transition-all duration-500 overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-primary/10",
      catInfo.border
    )}>
      <div className="absolute top-6 left-6 z-10">
         <div className={cn(
           "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest",
           catInfo.bg, catInfo.color, catInfo.border
         )}>
            <CatIcon className="w-3 h-3" />
            {catInfo.label}
         </div>
      </div>

      <div className="absolute top-6 right-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
         {isOwnCourse && (
           <>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onCancelSessions(course)}
              className="h-10 w-10 rounded-xl hover:bg-orange-500/20 hover:text-orange-500 text-muted-foreground bg-background/50 backdrop-blur-sm"
              title={t("extracourses.cancel_sessions")}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onEdit(course)}
              className="h-10 w-10 rounded-xl hover:bg-primary/20 hover:text-primary text-muted-foreground bg-background/50 backdrop-blur-sm"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDelete(course.id)}
              className="h-10 w-10 rounded-xl hover:bg-destructive/20 hover:text-destructive text-muted-foreground bg-background/50 backdrop-blur-sm"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
           </>
         )}
      </div>

      <CardHeader className="p-8 pt-20 pb-4">
        <div className="flex items-center gap-2 mb-4">
           <Badge variant="outline" className="border-border/40 dark:border-white/10 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 bg-muted/50 dark:bg-white/5 max-w-[150px] truncate">
              {course.teacher_name}
           </Badge>
        </div>
        <CardTitle className="text-2xl font-black mb-3 line-clamp-2 text-foreground group-hover:text-primary transition-colors leading-tight min-h-[4rem]">
          {course.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-muted-foreground text-sm leading-relaxed min-h-[40px]">
          {course.description || t("extracourses.no_description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-8 pb-4 flex-grow space-y-5">
         {upcomingCancellations.length > 0 && (
           <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-3 animate-pulse">
             <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
             <div className="space-y-1">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider">
                  {t("extracourses.suspended")}
                </p>
                {upcomingCancellations.map((c: any, i: number) => (
                  <p key={i} className="text-[9px] text-orange-500/70 font-bold">
                    {c.start_date} — {c.end_date}
                  </p>
                ))}
             </div>
           </div>
         )}

         <div className="p-5 rounded-[1.5rem] bg-muted/50 dark:bg-white/5 border border-border/40 dark:border-white/10 space-y-3">
           <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold">
              <span className="flex items-center gap-2 text-muted-foreground/60">
                <Users className="w-4 h-4" />
                {t("extracourses.enrollment")}
              </span>
              <div className="flex items-center gap-3">
                {isOwnCourse && (
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewEnrollments(course);
                    }}
                    className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10 rounded-lg"
                  >
                    {t("extracourses.view_students")}
                  </Button>
                )}
                <span className={cn(
                  "font-black",
                  course.enrollment_count >= course.enrollment_limit ? "text-destructive" : "text-primary"
                )}>
                  {course.enrollment_count} / {course.enrollment_limit}
                </span>
              </div>
           </div>
           <div className="w-full bg-muted dark:bg-white/10 h-2 rounded-full overflow-hidden">
              <div 
                 className={cn(
                   "h-full transition-all duration-1000",
                   course.enrollment_count >= course.enrollment_limit ? "bg-destructive" : "bg-primary"
                 )}
                 style={{ width: `${Math.min(100, (course.enrollment_count / course.enrollment_limit) * 100)}%` }}
              />
           </div>
         </div>

        <div className="space-y-3">
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-black ml-1">
            {t("extracourses.schedule")}
          </h4>
          <div className="space-y-2">
            {course.schedules.slice(0, 2).map((s, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs text-foreground bg-muted/50 dark:bg-white/5 p-3 rounded-2xl border border-border/40 dark:border-white/5 hover:bg-muted dark:hover:bg-white/10 transition-colors">
                 <CalendarIcon className="w-4 h-4 text-primary/60" />
                 <span className="font-bold">{getDayName(s.day_of_week)}</span>
                 <span className="text-muted-foreground/60 ml-auto font-mono">{s.start_time} - {s.end_time}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-8 pt-4 mt-auto">
        {course.is_enrolled ? (
          <Button 
            onClick={() => onUnenroll(course.id)}
            className="w-full h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/50 hover:bg-destructive hover:text-white hover:border-destructive transition-all duration-300 gap-2 font-bold"
          >
            <CheckCircle2 className="h-5 w-5" />
            {t("extracourses.enrolled")}
          </Button>
        ) : (
          <Button 
            disabled={course.enrollment_count >= course.enrollment_limit || (isTeacher && course.teacher_id !== user?.id && role === 'teacher')}
            onClick={() => onEnroll(course)}
            className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all gap-2 bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {course.enrollment_count >= course.enrollment_limit ? t("extracourses.full") : t("extracourses.enroll")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default function Courses() {
  const { t } = useTranslation();
  const { user, accessToken } = useAuth();
  const { role } = useSchool();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCourseForEnrollments, setSelectedCourseForEnrollments] = useState<Course | null>(null);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [courseToEnroll, setCourseToEnroll] = useState<Course | null>(null);
  const [courseToCancel, setCourseToCancel] = useState<Course | null>(null);
  const [cancelData, setCancelData] = useState({ start_date: "", end_date: "", reason: "" });
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [isEnrollmentsLoading, setIsEnrollmentsLoading] = useState(false);
  const [studentToKick, setStudentToKick] = useState<string | null>(null);

  const enrolledCourses = courses.filter(c => c.is_enrolled);
  const availableCourses = courses.filter(c => !c.is_enrolled);
  const filteredCourses = (selectedCategory 
    ? availableCourses.filter(c => c.category === selectedCategory) 
    : availableCourses
  ).filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.description?.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    fetchCourses();
  }, [accessToken, searchQuery]);

  const fetchCourses = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const q = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
      const data = await api.get<Course[]>(`/courses${q}`);
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(t("extracourses.error_loading"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async (courseId: string, enrollmentType: string = "full") => {
    try {
      await api.post(`/courses/${courseId}/enroll`, { enrollment_type: enrollmentType });
      toast.success(t("extracourses.success_enrolled"));
      setCourseToEnroll(null);
      fetchCourses();
    } catch (e: any) {
      toast.error(e.message || t("extracourses.error_enrolling"));
    }
  };

  const handleCancelSessions = async () => {
    if (!courseToCancel) return;
    try {
      await api.post(`/courses/${courseToCancel.id}/cancel-sessions`, cancelData);
      toast.success(t("extracourses.success_cancelled"));
      setCourseToCancel(null);
      setCancelData({ start_date: "", end_date: "", reason: "" });
      fetchCourses();
    } catch (e: any) {
      toast.error(e.message || t("extracourses.error_cancelling"));
    }
  };

  const handleUnenroll = async (courseId: string) => {
    try {
      await api.post(`/courses/${courseId}/unenroll`, {});
      toast.success(t("extracourses.success_unenrolled"));
      fetchCourses();
    } catch (e: any) {
      toast.error(e.message || t("extracourses.error_unenrolling"));
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    try {
      await api.delete(`/courses/${courseId}`);
      toast.success(t("common.deleteSuccess"));
      fetchCourses();
    } catch (e: any) {
      toast.error(e.message || t("common.deleteError"));
    }
  };

  const handleEdit = (course: Course) => {
    setCourseToEdit(course);
    setIsAddModalOpen(true);
  };

  const isTeacher = role === 'teacher' || role === 'admin';

  const fetchEnrollments = async (courseId: string) => {
    setIsEnrollmentsLoading(true);
    try {
      const data = await api.get<any[]>(`/courses/${courseId}/enrollments`);
      setEnrollments(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load enrollments");
    } finally {
      setIsEnrollmentsLoading(false);
    }
  };

  const handleKickStudent = async (studentId: string) => {
    if (!selectedCourseForEnrollments) return;
    try {
      await api.delete(`/courses/${selectedCourseForEnrollments.id}/enrollments/${studentId}`);
      toast.success(t("extracourses.success_kicked"));
      setStudentToKick(null);
      fetchEnrollments(selectedCourseForEnrollments.id);
      fetchCourses(); // Refresh counts
    } catch (e: any) {
      toast.error(e.message || t("extracourses.error_kicking"));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 dark:border-white/10 p-8 sm:p-12 shadow-2xl shadow-primary/5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] uppercase font-black tracking-widest">
                <BookOpen className="w-3 h-3" />
                {t("extracourses.academicHub")}
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-foreground leading-tight">
                {t("extracourses.title")}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-xl font-medium leading-relaxed">
                {t("extracourses.subtitle")}
              </p>
            </div>
            {isTeacher && (
              <Button 
                onClick={() => { setCourseToEdit(null); setIsAddModalOpen(true); }}
                className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/40 hover:scale-[1.05] active:scale-95 transition-all gap-3 bg-primary text-primary-foreground"
              >
                <Plus className="h-5 w-5" />
                {t("extracourses.addCourse")}
              </Button>
            )}
          </div>
        </div>

        {enrolledCourses.length > 0 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black text-foreground">{t("extracourses.my_enrolled")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {enrolledCourses.map(course => (
                <CourseCard 
                  key={course.id} course={course} t={t} user={user} role={role}
                  onEdit={handleEdit} onDelete={handleDelete} onEnroll={setCourseToEnroll}
                  onUnenroll={handleUnenroll} onViewEnrollments={(c: Course) => { setSelectedCourseForEnrollments(c); fetchEnrollments(c.id); }}
                  onCancelSessions={setCourseToCancel}
                />
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-12" />
          </div>
        )}

        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black text-foreground">{t("extracourses.explore")}</h2>
            </div>
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary group-focus-within:scale-110 transition-transform" />
              <input 
                type="text" placeholder={t("extracourses.search_placeholder")}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-card/60 dark:bg-white/5 pl-12 pr-6 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                !selectedCategory ? "bg-foreground text-background border-foreground shadow-xl" : "bg-card/60 border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {t("common.all")}
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                  selectedCategory === cat.id ? cn("border-transparent shadow-xl", cat.bg, cat.color) : "bg-card/60 border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <cat.icon className="w-4 h-4" />
                {t(cat.labelKey)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[400px] rounded-[3rem] bg-card/60 border border-border" />)
            ) : filteredCourses.length === 0 ? (
              <div className="col-span-full py-24 text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-2xl font-black">{t("extracourses.no_courses_found")}</h3>
                <p className="text-muted-foreground">{t("extracourses.no_courses_desc")}</p>
              </div>
            ) : (
              filteredCourses.map(course => (
                <CourseCard 
                  key={course.id} course={course} t={t} user={user} role={role}
                  onEdit={handleEdit} onDelete={handleDelete} onEnroll={setCourseToEnroll}
                  onUnenroll={handleUnenroll} onViewEnrollments={(c: Course) => { setSelectedCourseForEnrollments(c); fetchEnrollments(c.id); }}
                  onCancelSessions={setCourseToCancel}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <AddCourseModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} onSuccess={fetchCourses} editCourse={courseToEdit} />

      {courseToEnroll && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setCourseToEnroll(null)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
            <h3 className="text-2xl font-black">{t("extracourses.select_duration")}</h3>
            <div className="grid grid-cols-2 gap-4">
              {ENROLLMENT_TYPES.map(type => (
                <button
                  key={type.id} onClick={() => handleEnroll(courseToEnroll.id, type.id)}
                  className="flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-muted/50 border border-border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <type.icon className="w-6 h-6 group-hover:text-primary transition-colors" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t(type.labelKey)}</span>
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setCourseToEnroll(null)} className="w-full h-12 rounded-2xl font-bold">{t("common.cancel")}</Button>
          </div>
        </div>
      )}

      {courseToCancel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setCourseToCancel(null)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500"><AlertCircle className="w-6 h-6" /></div>
              <h3 className="text-2xl font-black">{t("extracourses.cancel_sessions")}</h3>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider ml-1">{t("extracourses.startDate")}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-bold rounded-2xl border-border bg-muted/20 hover:bg-muted/40 transition-all",
                          !cancelData.start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {cancelData.start_date ? format(new Date(cancelData.start_date), "PPP") : <span>{t("extracourses.select_date")}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-border shadow-2xl z-[110]" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={cancelData.start_date ? new Date(cancelData.start_date) : undefined}
                        onSelect={(date) => setCancelData({...cancelData, start_date: date ? format(date, "yyyy-MM-dd") : ""})}
                        initialFocus
                        className="rounded-2xl"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider ml-1">{t("extracourses.endDate")}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-bold rounded-2xl border-border bg-muted/20 hover:bg-muted/40 transition-all",
                          !cancelData.end_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {cancelData.end_date ? format(new Date(cancelData.end_date), "PPP") : <span>{t("extracourses.select_date")}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-border shadow-2xl z-[110]" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={cancelData.end_date ? new Date(cancelData.end_date) : undefined}
                        onSelect={(date) => setCancelData({...cancelData, end_date: date ? format(date, "yyyy-MM-dd") : ""})}
                        initialFocus
                        className="rounded-2xl"
                        disabled={(date) => cancelData.start_date ? date < new Date(cancelData.start_date) : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <textarea 
                value={cancelData.reason} onChange={e => setCancelData({...cancelData, reason: e.target.value})}
                className="w-full h-32 rounded-2xl bg-muted/50 border border-border p-4 font-bold outline-none resize-none"
                placeholder={t("extracourses.reason_placeholder")}
              />
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setCourseToCancel(null)} className="flex-1 h-12 rounded-2xl font-bold">{t("common.cancel")}</Button>
                <Button onClick={handleCancelSessions} className="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-[10px]">{t("extracourses.confirm_cancellation")}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCourseForEnrollments && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedCourseForEnrollments(null)} />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-border/40 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">{t("extracourses.view_students")}</h3>
                <p className="text-xs text-muted-foreground">{selectedCourseForEnrollments.title}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedCourseForEnrollments(null)}><X className="w-5 h-5" /></Button>
            </div>
            <ScrollArea className="h-[400px] p-8">
              {isEnrollmentsLoading ? <Skeleton className="h-full w-full" /> : enrollments.length === 0 ? (
                <div className="text-center py-12"><Users className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" /><p>{t("extracourses.no_students")}</p></div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((e, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">{e.student_name.charAt(0)}</div>
                        <div><p className="text-sm font-black">{e.student_name}</p><p className="text-[10px] text-muted-foreground">{new Date(e.enrolled_at).toLocaleDateString()}</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase">{t("common.active")}</Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setStudentToKick(e.student_id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                          title={t("extracourses.kick")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
      {studentToKick && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setStudentToKick(null)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black">{t("extracourses.kick")}</h3>
                <p className="text-sm text-muted-foreground">{t("extracourses.confirm_kick")}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStudentToKick(null)} className="flex-1 h-12 rounded-2xl font-bold">{t("common.cancel")}</Button>
              <Button onClick={() => handleKickStudent(studentToKick)} className="flex-1 h-12 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest text-[10px]">{t("extracourses.kick")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
