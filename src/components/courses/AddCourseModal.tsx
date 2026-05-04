import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Plus, X, Calendar as CalendarIcon, Clock, Users, BookOpen, 
  Type, Info, ChevronRight, Hash, GraduationCap,
  CalendarDays, Trophy, Palette, Languages, Cpu
} from "lucide-react";
import { useClasses } from "@/hooks/useApiData";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/integrations/api/client";
import { CourseClassRow } from "./CourseClassRow";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface AddCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editCourse?: any; // Added for editing support
}

interface ScheduleEntry {
  days_of_week: number[]; // Array of selected days
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string | null;
}

export function AddCourseModal({ open, onOpenChange, onSuccess, editCourse }: AddCourseModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [enrollmentLimit, setEnrollmentLimit] = useState("20");
  const [category, setCategory] = useState("academic");
  const [customCategory, setCustomCategory] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<{ id: string; name: string }[]>([]);
  
  // Simplified to single schedule
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0]);
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("18:00");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const { data: classes = [] } = useClasses();

  // Populate state if editing
  useEffect(() => {
    if (editCourse && open) {
      setTitle(editCourse.title || "");
      setDescription(editCourse.description || "");
      setEnrollmentLimit(editCourse.enrollment_limit?.toString() || "20");
      
      const cat = editCourse.category || "academic";
      const isFixed = ["academic", "sports", "creative", "languages", "tech"].includes(cat);
      if (isFixed) {
          setCategory(cat);
          setCustomCategory("");
      } else {
          setCategory("custom");
          setCustomCategory(cat);
      }
      
      if (classes.length > 0) {
        const targetClasses = classes.filter(c => editCourse.target_class_ids?.includes(c.id));
        setSelectedClasses(targetClasses.map(c => ({ id: c.id, name: c.name })));
      }

      if (editCourse.schedules && editCourse.schedules.length > 0) {
          const s = editCourse.schedules[0]; // Take first slot
          setStartTime(s.start_time);
          setEndTime(s.end_time);
          setStartDate(new Date(s.start_date));
          if (s.end_date) setEndDate(new Date(s.end_date));
          
          const days = editCourse.schedules.map((sched: any) => sched.day_of_week === null ? -1 : sched.day_of_week);
          setDaysOfWeek(days);
      }
    } else if (!open) {
      // Reset when closed
      setTitle("");
      setDescription("");
      setEnrollmentLimit("20");
      setCategory("academic");
      setCustomCategory("");
      setSelectedClasses([]);
      setDaysOfWeek([0]);
      setStartTime("17:00");
      setEndTime("18:00");
      setStartDate(new Date());
      setEndDate(undefined);
    }
  }, [editCourse, open, classes]);

  const toggleClass = (c: { id: string; name: string }) => {
    if (selectedClasses.find(cl => cl.id === c.id)) {
      setSelectedClasses(prev => prev.filter(cl => cl.id !== c.id));
    } else {
      setSelectedClasses(prev => [...prev, c]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t("extracourses.error_title_required"));
      return;
    }

    try {
      const finalCategory = category === "custom" ? customCategory : category;
      const payload = {
        title,
        description,
        enrollment_limit: parseInt(enrollmentLimit),
        category: finalCategory,
        target_class_ids: selectedClasses.map(c => c.id),
        schedules: daysOfWeek.map(day => ({
            start_time: startTime,
            end_time: endTime,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate ? endDate.toISOString().split('T')[0] : null,
            day_of_week: day === -1 ? null : day
        }))
      };

      if (editCourse) {
        await api.put(`/courses/${editCourse.id}`, payload);
        toast.success(t("extracourses.success_updated") || "Course updated successfully!");
      } else {
        await api.post("/courses", payload);
        toast.success(t("extracourses.success_created"));
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || (editCourse ? "Error updating course" : t("extracourses.error_creating")));
    }
  };

  const groupedClasses = classes.reduce((acc, c) => {
    const grade = c.grade_level || 0;
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(c);
    return acc;
  }, {} as Record<number, any[]>);

  const sortedGrades = Object.keys(groupedClasses).map(Number).sort((a, b) => a - b);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-background border-border rounded-[2rem] p-0 overflow-hidden shadow-2xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <DialogHeader className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-primary/20 text-primary border border-primary/30">
              <Plus className="w-5 h-5" />
            </div>
            <DialogTitle className="text-2xl font-black text-foreground">
              {editCourse ? (t("extracourses.editCourse") || "Edit Course") : t("extracourses.addCourse")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            {t("extracourses.create_desc")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] p-8 pt-0 pr-6 overflow-y-auto custom-scrollbar">
          <style dangerouslySetInnerHTML={{ __html: `
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.2); }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
          `}} />
          <div className="space-y-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 ml-1">
                    {t("extracourses.courseTitle")}
                  </label>
                  <div className="relative group">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder={t("extracourses.placeholderTitle")}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="h-12 bg-muted/50 border-border text-foreground rounded-xl pl-11 focus:ring-inset focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 ml-1">
                    {t("extracourses.limit")}
                  </label>
                  <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-xl p-1 w-full max-w-[200px]">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      type="button"
                      onClick={() => setEnrollmentLimit(prev => Math.max(1, parseInt(prev) - 1).toString())}
                      className="h-10 w-10 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors"
                    >
                      <X className="w-4 h-4 rotate-45" />
                    </Button>
                    <div className="flex-1 text-center font-black text-foreground text-lg">
                      {enrollmentLimit}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      type="button"
                      onClick={() => setEnrollmentLimit(prev => (parseInt(prev) + 1).toString())}
                      className="h-10 w-10 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Course Category */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 ml-1">
                    {t("extracourses.category") || "Category"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "academic", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10", label: t("extracourses.cat_academic") },
                      { id: "sports", icon: Trophy, color: "text-orange-500", bg: "bg-orange-500/10", label: t("extracourses.cat_sports") },
                      { id: "creative", icon: Palette, color: "text-pink-500", bg: "bg-pink-500/10", label: t("extracourses.cat_creative") },
                      { id: "languages", icon: Languages, color: "text-emerald-500", bg: "bg-emerald-500/10", label: t("extracourses.cat_languages") },
                      { id: "tech", icon: Cpu, color: "text-violet-500", bg: "bg-violet-500/10", label: t("extracourses.cat_tech") },
                      { id: "custom", icon: Sparkles, color: "text-primary", bg: "bg-primary/10", label: t("extracourses.cat_custom") }
                    ].map(cat => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all text-xs font-bold shadow-sm",
                            isSelected 
                              ? cn("border-primary ring-2 ring-primary/20", cat.bg, cat.color)
                              : "border-border bg-card/50 hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className={cn("w-4 h-4", isSelected ? cat.color : "text-muted-foreground")} />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>

                  {category === "custom" && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <Input 
                        placeholder={t("extracourses.placeholder_custom_cat")}
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        className="h-12 rounded-2xl border-primary/30 bg-primary/5 focus:ring-primary/20 focus:border-primary font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 ml-1">
                  {t("extracourses.description")}
                </label>
                <textarea 
                  placeholder={t("extracourses.placeholderDesc")}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full h-[104px] bg-muted/50 border border-border text-foreground rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all resize-none placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            {/* Target Classes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 ml-1">
                  {t("extracourses.targetClasses")}
                </label>
                <Badge variant="outline" className="text-[10px] border-primary/40 bg-primary/10 text-primary rounded-lg px-2 py-0.5">
                  {selectedClasses.length} {t("common.selected")}
                </Badge>
              </div>
              <div className="p-5 rounded-[2rem] bg-muted/20 border border-border space-y-4 shadow-inner">
                {sortedGrades.map(grade => (
                  <CourseClassRow
                    key={grade}
                    grade={grade}
                    classes={groupedClasses[grade]}
                    selectedClasses={selectedClasses}
                    onToggle={toggleClass}
                  />
                ))}
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 ml-1">
                {t("extracourses.schedule")}
              </label>
              
              <div className="p-6 rounded-[2.5rem] bg-card border border-border shadow-xl space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                  {/* Left Column: Days & Date Range */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider ml-1">{t("extracourses.frequency")}</label>
                      <div className="flex flex-wrap gap-2">
                        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, idx) => {
                          const isSelected = daysOfWeek.includes(idx);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                if (daysOfWeek.includes(-1)) setDaysOfWeek([idx]);
                                else if (isSelected) setDaysOfWeek(daysOfWeek.filter(d => d !== idx));
                                else setDaysOfWeek([...daysOfWeek, idx].sort());
                              }}
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all border",
                                isSelected 
                                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-110" 
                                  : "bg-background border-border text-muted-foreground hover:border-primary/50"
                              )}
                            >
                              {day}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setDaysOfWeek([-1])}
                          className={cn(
                            "px-4 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all border ml-auto",
                            daysOfWeek.includes(-1)
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                              : "bg-background border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          {t("extracourses.oneTime")}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider ml-1">{t("extracourses.startDate")}</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-12 justify-start text-left font-bold rounded-2xl border-border bg-background hover:bg-muted/50 transition-all",
                                !startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                              {startDate ? format(startDate, "PPP") : <span>{t("extracourses.select_date")}</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl border-border shadow-2xl" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={startDate}
                              onSelect={(date) => date && setStartDate(date)}
                              initialFocus
                              className="rounded-2xl"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {!daysOfWeek.includes(-1) && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                          <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider ml-1">{t("extracourses.endDate")}</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full h-12 justify-start text-left font-bold rounded-2xl border-border bg-background hover:bg-muted/50 transition-all",
                                  !endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {endDate ? format(endDate, "PPP") : <span>{t("extracourses.select_date")}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-border shadow-2xl" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={endDate}
                                onSelect={setEndDate}
                                initialFocus
                                className="rounded-2xl"
                                disabled={(date) => date < startDate}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Time Selection */}
                  <div className="space-y-6 lg:border-l lg:border-border lg:pl-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-black text-foreground uppercase tracking-tight">{t("extracourses.startTime")}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium">{t("extracourses.time_desc") || "Set the lesson duration"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-[2rem] bg-muted/10 border border-border/50">
                      <div className="flex-1 space-y-2 text-center">
                         <div className="text-[9px] uppercase tracking-widest font-black text-muted-foreground/60">{t("extracourses.startTime")}</div>
                         <Input 
                           type="time" 
                           value={startTime}
                           onChange={e => setStartTime(e.target.value)}
                           className="h-14 text-2xl font-black text-center bg-background border-border rounded-2xl focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                         />
                      </div>
                      <div className="h-0.5 w-4 bg-muted-foreground/20 mt-6" />
                      <div className="flex-1 space-y-2 text-center">
                         <div className="text-[9px] uppercase tracking-widest font-black text-muted-foreground/60">{t("extracourses.endTime")}</div>
                         <Input 
                           type="time" 
                           value={endTime}
                           onChange={e => setEndTime(e.target.value)}
                           className="h-14 text-2xl font-black text-center bg-background border-border rounded-2xl focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                         />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 text-[10px] text-primary font-bold border border-primary/10">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {t("extracourses.keyboard_hint") || "Use your keyboard to quickly type the exact time"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-8 border-t border-border bg-muted/20">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-12 px-6 text-foreground hover:bg-muted"
          >
            {t("common.cancel")}
          </Button>
          <Button 
            onClick={handleSubmit}
            className="rounded-xl h-12 px-8 font-black shadow-xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all bg-primary text-primary-foreground"
          >
            {editCourse ? (t("common.save") || "Save Changes") : t("extracourses.createCourse")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
