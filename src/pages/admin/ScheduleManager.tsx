import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BentoCard } from "@/components/BentoCard";
import { 
  Building2, Book, Users, CalendarDays, Sparkles,
  Loader2, Users2, ChevronRight, ArrowRight, Search,
  Bot, MessageSquare, Save, CheckCircle2, Settings2,
  ClipboardList, Trash2, Eye, Clock, Pencil, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  useSubjects, useTeachers, useRooms,
  useClasses, useTeacherWorkloads,
  useTeacherConstraints, useScheduleEntries,
  useGradeSubjects,
  useGenerateSchedule, useUpdateScheduleEntry,
  useSavedSchedules, useSaveSchedule,
  useLoadSavedSchedule, useDeleteSavedSchedule,
  useApplySavedSchedule
} from '@/hooks/useApiData';
import { api } from '@/integrations/api/client';

export default function ScheduleManager() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("rooms");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  
  // Data Fetching
  const { data: rooms = [] } = useRooms();
  const { data: subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  const { data: classes = [] } = useClasses();
  const { data: allWorkloads = [] } = useTeacherWorkloads();
  const { data: allGradeSubjects = [] } = useGradeSubjects();

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            {t('scheduleManager.title')}
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">AI v2.0</Badge>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">{t('scheduleManager.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
            <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105" onClick={() => setActiveTab('ai-generate')}>
              <Sparkles className="h-4 w-4" />
              {t('scheduleManager.quickLaunch')}
            </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-muted/30 backdrop-blur-sm rounded-2xl border border-border/50 gap-1">
          <TabsTrigger value="rooms" className="rounded-xl py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <Building2 className="w-4 h-4 mr-2" />
            {t('scheduleManager.tabs.rooms')}
          </TabsTrigger>
          <TabsTrigger value="subjects" className="rounded-xl py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <Book className="w-4 h-4 mr-2" />
            {t('scheduleManager.tabs.subjects')}
          </TabsTrigger>
          <TabsTrigger value="staffing" className="rounded-xl py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <Users className="w-4 h-4 mr-2" />
            {t('scheduleManager.tabs.staffing')}
          </TabsTrigger>
          <TabsTrigger value="constraints" className="rounded-xl py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <Users2 className="w-4 h-4 mr-2" />
            {t('scheduleManager.tabs.limits')}
          </TabsTrigger>
          <TabsTrigger value="ai-generate" className="rounded-xl py-2.5 bg-primary/5 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <Sparkles className="w-4 h-4 mr-2" />
            {t('scheduleManager.tabs.aiGenerator')}
          </TabsTrigger>
          <TabsTrigger value="saved" className="rounded-xl py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
            <ClipboardList className="w-4 h-4 mr-2" />
            {t('scheduleManager.tabs.saved')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-4">
          <RoomsTab rooms={rooms} />
        </TabsContent>

        <TabsContent value="subjects" className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-4">
          <SubjectsTab 
            subjects={subjects} 
            classes={classes}
            allGradeSubjects={allGradeSubjects}
            gradeFilter={gradeFilter} 
            setGradeFilter={setGradeFilter}
          />
        </TabsContent>

        <TabsContent value="staffing" className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-4">
          <StaffingTab 
            subjects={subjects} 
            teachers={teachers} 
            classes={classes}
            allGradeSubjects={allGradeSubjects}
            gradeFilter={gradeFilter} 
            allWorkloads={allWorkloads}
            setGradeFilter={setGradeFilter}
          />
        </TabsContent>

        <TabsContent value="constraints" className="animate-in fade-in slide-in-from-bottom-2 duration-300 pt-4">
          <ConstraintsTab teachers={teachers} allWorkloads={allWorkloads} />
        </TabsContent>

        {/* AI Generator — always mounted, hidden via CSS */}
        <div className={activeTab === "ai-generate" ? "pt-4" : "hidden"}>
          <AiGeneratorTab 
            classes={classes} 
            teachers={teachers}
            rooms={rooms}
            subjects={subjects}
            allWorkloads={allWorkloads}
            allGradeSubjects={allGradeSubjects}
          />
        </div>

        {/* Saved Schedules — always mounted, hidden via CSS */}
        <div className={activeTab === "saved" ? "pt-4" : "hidden"}>
          <SavedSchedulesTab classes={classes} teachers={teachers} rooms={rooms} subjects={subjects} />
        </div>
      </Tabs>
    </div>
  );
}

// ─── Rooms Tab (Read-only) ───
function RoomsTab({ rooms }: any) {
  const { t } = useTranslation();
  return (
    <Card className="rounded-3xl border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>{t('scheduleManager.rooms.title')}</CardTitle>
        <CardDescription>{t('scheduleManager.rooms.desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border/40 overflow-hidden bg-background/40">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">{t('scheduleManager.rooms.name')}</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">{t('scheduleManager.rooms.capacity')}</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right">{t('scheduleManager.rooms.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((r: any) => (
                <TableRow key={r.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="font-bold text-primary py-4">{r.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg font-mono px-3">{r.capacity} {t('scheduleManager.rooms.seats')}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-green-500/10 text-green-500 border-none text-[8px] font-black uppercase">
                      {t('common.active')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                    {t('scheduleManager.rooms.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Subjects Tab (Read-only) ───
function SubjectsTab({ subjects, allGradeSubjects, gradeFilter, setGradeFilter }: any) {
  const { t } = useTranslation();

  // Normalize subjects for display
  const displaySubjects = useMemo(() => {
    return subjects.map((s: any) => {
      const linked = gradeFilter === 'all' ? null : allGradeSubjects.find((gs: any) => 
        gs.subject_id === s.id && gs.grade_level === parseInt(gradeFilter)
      );
      
      return {
        ...s,
        isLinked: !!linked,
        gradeHours: linked?.hours_per_week || s.standard_hours
      };
    });
  }, [subjects, allGradeSubjects, gradeFilter]);

  return (
    <Card className="rounded-3xl border-border/50 bg-card/50 backdrop-blur-sm min-h-[600px]">
      <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{t('scheduleManager.subjects.title')}</CardTitle>
          <CardDescription>
            {gradeFilter === 'all' 
              ? t('scheduleManager.subjects.allRegistry') 
              : t('scheduleManager.subjects.gradeCurriculum', { grade: gradeFilter })}
          </CardDescription>
        </div>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-48 rounded-xl h-11 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('scheduleManager.subjects.globalRegistry')}</SelectItem>
            {[1,2,3,4,5,6,7,8,9,10,11].map(g => (
              <SelectItem key={g} value={g.toString()}>
                {t('common.grade')} {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {displaySubjects.map((s: any) => (
            <div key={s.id} className="p-5 rounded-2xl border border-border/40 bg-background/40 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary"><Book className="h-5 w-5" /></div>
                  <div>
                    <h4 className="font-bold text-foreground leading-none">{s.name}</h4>
                    <span className="text-[10px] text-muted-foreground uppercase">{s.code || 'NO-CODE'} • {s.category}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/10">
                 <div className="flex items-center gap-1.5 text-[10px] font-black text-primary">
                    <CalendarDays className="h-3 w-3" />
                    {s.gradeHours} {t('common.hours').toUpperCase()}/НЕД
                 </div>
                 {s.isLinked && (
                   <Badge className="bg-green-500/10 text-green-500 border-none text-[8px] font-black uppercase">
                     {t('scheduleManager.subjects.linked')}
                   </Badge>
                 )}
              </div>
            </div>
          ))}
          {displaySubjects.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-40 italic">
              {t('scheduleManager.subjects.empty')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
// ─── Staffing Tab (Read-only) ───
function StaffingTab({ subjects, teachers, classes, allGradeSubjects, gradeFilter, setGradeFilter, allWorkloads }: any) {
  const { t } = useTranslation();
  const [workloadSearch, setWorkloadSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const teacherStats = useMemo(() => {
    const stats: Record<string, number> = {};
    if (Array.isArray(allWorkloads)) {
      allWorkloads.forEach((w: any) => {
        if (!w.teacher_id) return;
        const hours = parseFloat(w.hours_per_week || 0);
        stats[w.teacher_id] = (stats[w.teacher_id] || 0) + hours;
      });
    }
    return stats;
  }, [allWorkloads]);

  const filteredClasses = useMemo(() => {
    if (gradeFilter === 'all') return classes;
    return classes.filter((c: any) => c.grade_level?.toString() === gradeFilter);
  }, [classes, gradeFilter]);

  const selectedClassObj = useMemo(() => classes.find((c:any) => c.id === selectedClass), [classes, selectedClass]);

  const workloads = useMemo(() => {
    if (!selectedClass) return [];
    return Array.isArray(allWorkloads) ? allWorkloads.filter((w: any) => w.class_id === selectedClass) : [];
  }, [allWorkloads, selectedClass]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
           <BentoCard title={t('scheduleManager.staffing.selection')} icon={<Users2 className="h-5 w-5" />}>
              <div className="space-y-5">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{t('scheduleManager.staffing.filterParallel')}</label>
                   <Select value={gradeFilter} onValueChange={setGradeFilter}>
                     <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none px-5 font-bold"><SelectValue /></SelectTrigger>
                     <SelectContent className="rounded-2xl">
                       <SelectItem value="all">{t('scheduleManager.subjects.globalRegistry')}</SelectItem>
                       {[1,2,3,4,5,6,7,8,9,10,11].map(g => <SelectItem key={g} value={g.toString()}>{t('common.grade')} {g}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{t('scheduleManager.staffing.selectClass')}</label>
                   <Select value={selectedClass} onValueChange={setSelectedClass}>
                     <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none px-5 font-bold"><SelectValue placeholder={t('scheduleManager.staffing.classPlaceholder')} /></SelectTrigger>
                     <SelectContent className="rounded-2xl">
                       {filteredClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
              </div>
           </BentoCard>
        </div>

        <div className="lg:col-span-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 px-4">
             <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">{t('scheduleManager.staffing.tableTitle')}</h3>
                <p className="text-xs text-muted-foreground font-bold uppercase opacity-60">{selectedClassObj?.name || t('scheduleManager.staffing.selectToView')}</p>
             </div>
             {selectedClass && (
                <div className="relative w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
                   <Input 
                    placeholder={t('common.search')} 
                    value={workloadSearch} 
                    onChange={(e)=>setWorkloadSearch(e.target.value)} 
                    className="h-10 pl-10 rounded-xl bg-muted/20 border-none font-bold" 
                   />
                </div>
             )}
          </div>

          <div className="flex-1 rounded-3xl border border-border/40 bg-card/20 backdrop-blur-xl overflow-hidden shadow-2xl p-2">
             <Table>
               <TableHeader>
                 <TableRow className="border-none hover:bg-transparent">
                   <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] py-6 pl-8">{t('scheduleManager.staffing.colSubject')}</TableHead>
                   <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">{t('scheduleManager.staffing.colTeacher')}</TableHead>
                   <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">{t('scheduleManager.staffing.colLoad')}</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {workloads.filter((w:any) => w.subject_name.toLowerCase().includes(workloadSearch.toLowerCase()) || w.teacher_name.toLowerCase().includes(workloadSearch.toLowerCase())).map((w: any) => (
                   <TableRow key={w.id} className="group border-none hover:bg-primary/5 transition-all">
                     <TableCell className="py-5 pl-8">
                        <div>
                           <div className="text-lg font-black tracking-tight group-hover:text-primary transition-colors">{w.subject_name}</div>
                           <div className="flex items-center gap-2 mt-1">
                              <Badge className="text-[8px] font-black uppercase bg-primary/10 text-primary border-none px-2">{w.hours_per_week}{t('common.hours').toUpperCase()} PER WEEK</Badge>
                           </div>
                        </div>
                     </TableCell>
                     <TableCell>
                        <div className="flex items-center gap-3">
                           <div className="h-9 w-9 rounded-xl bg-muted/30 flex items-center justify-center text-xs font-black uppercase">{w.teacher_name.charAt(0)}</div>
                           <span className="font-bold uppercase text-xs">{w.teacher_name}</span>
                        </div>
                     </TableCell>
                     <TableCell>
                        <div className="flex flex-col gap-1.5 grayscale group-hover:grayscale-0 transition-all">
                           <div className="flex justify-between text-[9px] font-black uppercase opacity-60"><span>{t('scheduleManager.staffing.totalFlow')}</span><span>{teacherStats[w.teacher_id] || 0} ч</span></div>
                           <div className="w-24 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{width: `${Math.min(100, ((teacherStats[w.teacher_id] || 0)/24)*100)}%`}} />
                           </div>
                        </div>
                     </TableCell>
                   </TableRow>
                 ))}
                 {!selectedClass && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-64 text-center opacity-20 font-black uppercase tracking-widest">
                        {t('scheduleManager.staffing.pickClass')}
                      </TableCell>
                    </TableRow>
                 )}
                 {selectedClass && workloads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="h-64 text-center opacity-20 font-black uppercase tracking-widest">
                        {t('scheduleManager.staffing.noRecords')}
                      </TableCell>
                    </TableRow>
                 )}
               </TableBody>
             </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Constraints Tab (Read-only) ───
function ConstraintsTab({ teachers, allWorkloads }: any) {
  const { t } = useTranslation();
  const { data: allConstraints = [] } = useTeacherConstraints();
  const [search, setSearch] = useState('');

  // Calculate current hours per teacher from workloads
  const teacherStats = useMemo(() => {
    const stats: Record<string, { currentHours: number; maxHours: number; subjects: Set<string>; classes: Set<string> }> = {};
    
    // Init all teachers
    teachers.forEach((teacher: any) => {
      stats[teacher.id] = { currentHours: 0, maxHours: 24, subjects: new Set(), classes: new Set() };
    });

    // Sum workloads
    if (Array.isArray(allWorkloads)) {
      allWorkloads.forEach((w: any) => {
        if (stats[w.teacher_id]) {
          stats[w.teacher_id].currentHours += parseFloat(w.hours_per_week || 0);
          if (w.subject_name) stats[w.teacher_id].subjects.add(w.subject_name);
          if (w.class_name) stats[w.teacher_id].classes.add(w.class_name);
        }
      });
    }

    // Merge constraints
    if (Array.isArray(allConstraints)) {
      allConstraints.forEach((c: any) => {
        if (stats[c.teacher_id]) {
          stats[c.teacher_id].maxHours = c.max_hours_per_week || c.max_hours_per_day || 24;
        }
      });
    }

    return stats;
  }, [teachers, allWorkloads, allConstraints]);

  const filtered = useMemo(() => {
    if (!search.trim()) return teachers;
    return teachers.filter((teacher: any) => teacher.name?.toLowerCase().includes(search.toLowerCase()));
  }, [teachers, search]);

  return (
    <Card className="rounded-3xl border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle>{t('scheduleManager.limits.title')}</CardTitle>
          <CardDescription>{t('scheduleManager.limits.desc')}</CardDescription>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
          <Input 
            placeholder={t('common.search')} 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="h-10 pl-10 rounded-xl bg-muted/20 border-none font-bold" 
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border/40 overflow-hidden bg-background/30">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="border-border/20">
                <TableHead className="font-black uppercase text-[9px] tracking-widest pl-6 py-4">{t('scheduleManager.limits.teachers')}</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-widest">{t('scheduleManager.limits.subjectsCol')}</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-widest">{t('scheduleManager.limits.classesCol')}</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-widest text-center">{t('scheduleManager.limits.currentCol')}</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-widest text-center">{t('scheduleManager.limits.maxCol')}</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-widest w-40">{t('scheduleManager.limits.loadCol')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((teacher: any) => {
                const stat = teacherStats[teacher.id] || { currentHours: 0, maxHours: 24, subjects: new Set(), classes: new Set() };
                const pct = stat.maxHours > 0 ? Math.min(100, (stat.currentHours / stat.maxHours) * 100) : 0;
                const isOver = stat.currentHours > stat.maxHours;
                
                return (
                  <TableRow key={teacher.id} className="group border-border/10 hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black uppercase shrink-0",
                          isOver ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                        )}>
                          {teacher.name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{teacher.name}</div>
                          <div className="text-[10px] text-muted-foreground">{teacher.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {[...stat.subjects].slice(0, 3).map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[8px] font-bold rounded-md px-1.5 py-0">{s}</Badge>
                        ))}
                        {stat.subjects.size > 3 && (
                          <Badge variant="outline" className="text-[8px] font-bold rounded-md px-1.5 py-0">+{stat.subjects.size - 3}</Badge>
                        )}
                        {stat.subjects.size === 0 && <span className="text-[10px] text-muted-foreground italic">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-muted-foreground">{stat.classes.size}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-lg font-black",
                        isOver ? "text-destructive" : stat.currentHours > 0 ? "text-foreground" : "text-muted-foreground/40"
                      )}>
                        {stat.currentHours}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-lg font-black text-primary">{stat.maxHours}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                          <span>{Math.round(pct)}%</span>
                          <span className={isOver ? "text-destructive" : ""}>{stat.currentHours}/{stat.maxHours} {t('common.hours')}</span>
                        </div>
                        <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-700", isOver ? "bg-destructive" : pct > 80 ? "bg-amber-500" : "bg-primary")} 
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic">
                    {t('scheduleManager.staffing.noRecords')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


// ─── AI Scheduling Studio ───
const DAYS_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт"];
const PERIOD_COUNT = 8;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: Date;
}

function AiGeneratorTab({ classes, teachers, rooms, subjects, allWorkloads, allGradeSubjects }: any) {
  const { t } = useTranslation();

  // Grade selection — individual grades, not ranges
  const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
  const [selectedBellId, setSelectedBellId] = useState<string>("");
  const [bellSchedules, setBellSchedules] = useState<any[]>([]);

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: "system", text: t('scheduleManager.generator.welcomeMsg'), timestamp: new Date() },
  ]);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Generation
  const generateMutation = useGenerateSchedule();
  const saveMutation = useSaveSchedule();
  const updateEntryMutation = useUpdateScheduleEntry();
  const [generatedEntries, setGeneratedEntries] = useState<any[]>([]);
  const [scheduleName, setScheduleName] = useState("");

  // Edit mode
  const [editingCell, setEditingCell] = useState<any>(null);
  const [editTeacher, setEditTeacher] = useState("");
  const [editRoom, setEditRoom] = useState("");

  // View mode for result
  const [previewClass, setPreviewClass] = useState<string>("");

  // Load bell schedules
  useEffect(() => {
    api.get<any>("/admin/settings").then(data => {
      if (data.bell_schedule_config) {
        try {
          const parsed = JSON.parse(data.bell_schedule_config);
          if (Array.isArray(parsed)) {
            setBellSchedules(parsed);
            if (parsed.length > 0) setSelectedBellId(parsed[0].id);
          }
        } catch (e) { /* ignore */ }
      }
    });
  }, []);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Derived: filtered classes
  const filteredClasses = useMemo(() => {
    if (selectedGrades.length === 0) return classes;
    return classes.filter((c: any) => selectedGrades.includes(c.grade_level));
  }, [classes, selectedGrades]);

  // Derived: stats
  const stats = useMemo(() => {
    const relevantWorkloads = selectedGrades.length === 0
      ? allWorkloads
      : allWorkloads.filter((w: any) => {
          const cls = classes.find((c: any) => c.id === w.class_id);
          return cls && selectedGrades.includes(cls.grade_level);
        });
    const uniqueTeachers = new Set(relevantWorkloads.map((w: any) => w.teacher_id));
    const uniqueSubjects = new Set(relevantWorkloads.map((w: any) => w.subject_id));
    return {
      classes: filteredClasses.length,
      teachers: uniqueTeachers.size,
      subjects: uniqueSubjects.size,
      rooms: rooms.length,
      workloads: relevantWorkloads.length,
    };
  }, [selectedGrades, allWorkloads, classes, filteredClasses, rooms]);

  const toggleGrade = (g: number) => {
    setSelectedGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatHistory(prev => [...prev, { role: "user", text: chatInput.trim(), timestamp: new Date() }]);
    setChatInput("");
  };

  const handleGenerate = async () => {
    if (selectedGrades.length === 0) {
      toast.error(t('scheduleManager.generator.errorNoParallels'));
      return;
    }
    if (!selectedBellId && bellSchedules.length > 0) {
      toast.error(t('scheduleManager.generator.errorNoBell'));
      return;
    }

    // Combine all user messages into prompt
    const userMessages = chatHistory.filter(m => m.role === "user").map(m => m.text).join("\n");

    setChatHistory(prev => [...prev, {
      role: "system",
      text: `⏳ ${t('scheduleManager.generator.generating')} (${stats.classes} ${t('scheduleManager.generator.classesWord')}, ${stats.teachers} ${t('scheduleManager.generator.teachersWord')}, ${stats.workloads} ${t('scheduleManager.generator.workloadsWord')})...`,
      timestamp: new Date()
    }]);

    try {
      const result = await generateMutation.mutateAsync({
        user_prompt: userMessages,
        grade_levels: selectedGrades,
        bell_schedule_id: selectedBellId,
      });

      setGeneratedEntries(result.entries || []);

      // Pick first class for preview
      if (result.entries?.length > 0) {
        setPreviewClass(result.entries[0].class_id);
      }

      setChatHistory(prev => [...prev, {
        role: "assistant",
        text: `✅ ${result.message || t('scheduleManager.generator.successMsg')}`,
        timestamp: new Date()
      }]);

      toast.success(t('scheduleManager.generator.success'));
    } catch (err: any) {
      const errorMsg = err?.message || t('common.error');
      setChatHistory(prev => [...prev, {
        role: "assistant",
        text: `❌ ${errorMsg}`,
        timestamp: new Date()
      }]);
      toast.error(errorMsg);
    }
  };

  // Build grid for one class
  const classGrid = useMemo(() => {
    if (!previewClass) return [];
    const grid: (any | null)[][] = Array.from({ length: PERIOD_COUNT }, () => Array(5).fill(null));
    generatedEntries
      .filter((e: any) => e.class_id === previewClass)
      .forEach((e: any) => {
        if (e.day >= 0 && e.day < 5 && e.period >= 0 && e.period < PERIOD_COUNT) {
          grid[e.period][e.day] = e;
        }
      });
    return grid;
  }, [previewClass, generatedEntries]);

  // Classes that appear in generated entries
  const generatedClassIds = useMemo(() => {
    return [...new Set(generatedEntries.map((e: any) => e.class_id))];
  }, [generatedEntries]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6 animate-in fade-in duration-500">
      {/* LEFT PANEL: Config + Chat */}
      <div className="space-y-4 flex flex-col" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {/* Config */}
        <Card className="rounded-3xl border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <CardContent className="p-5 space-y-4">
            {/* Parallels */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                {t('scheduleManager.generator.step1')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[1,2,3,4,5,6,7,8,9,10,11].map(g => (
                  <Button
                    key={g}
                    variant={selectedGrades.includes(g) ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-9 w-9 rounded-xl p-0 font-black text-xs transition-all",
                      selectedGrades.includes(g) && "shadow-md shadow-primary/30"
                    )}
                    onClick={() => toggleGrade(g)}
                  >
                    {g}
                  </Button>
                ))}
              </div>
              {selectedGrades.length > 0 && (
                <p className="text-[10px] text-primary font-bold mt-1.5">
                  {selectedGrades.sort((a,b)=>a-b).join(", ")} {t('common.grade').toLowerCase()} — {stats.classes} {t('scheduleManager.generator.classesWord')}
                </p>
              )}
            </div>

            {/* Bell Schedule */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                {t('scheduleManager.generator.step2')}
              </label>
              <Select value={selectedBellId} onValueChange={setSelectedBellId}>
                <SelectTrigger className="h-11 rounded-xl bg-muted/20 border-none font-bold text-sm">
                  <SelectValue placeholder={t('scheduleManager.generator.bellPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {bellSchedules.map(b => (
                    <SelectItem key={b.id} value={b.id} className="font-bold">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* DB Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: <Users className="h-3 w-3" />, val: stats.classes, label: t('scheduleManager.generator.classesWord') },
                { icon: <Users2 className="h-3 w-3" />, val: stats.teachers, label: t('scheduleManager.generator.teachersWord') },
                { icon: <Building2 className="h-3 w-3" />, val: stats.rooms, label: t('scheduleManager.tabs.rooms') },
                { icon: <Book className="h-3 w-3" />, val: stats.workloads, label: t('scheduleManager.generator.workloadsWord') },
              ].map((s, i) => (
                <div key={i} className="bg-muted/10 rounded-xl p-2 text-center border border-border/30">
                  <div className="text-lg font-black text-primary">{s.val}</div>
                  <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">{s.icon} {s.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="rounded-3xl border-border/50 bg-card/50 backdrop-blur-sm flex-1 flex flex-col overflow-hidden min-h-[400px]">
          <CardHeader className="p-4 pb-2 shrink-0">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              {t('scheduleManager.generator.chatTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
              {chatHistory.map((msg, i) => (
                <div key={i} className={cn(
                  "rounded-2xl px-4 py-3 text-sm max-w-[92%] animate-in slide-in-from-bottom-2 leading-relaxed",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                    : msg.role === "assistant"
                    ? "bg-green-500/10 text-green-400 border border-green-500/20 rounded-bl-md"
                    : "bg-muted/30 text-muted-foreground italic rounded-bl-md text-xs"
                )}>
                  {msg.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 shrink-0">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder={t('scheduleManager.generator.promptPlaceholder')}
                className="rounded-xl bg-muted/20 border-none h-12 font-medium text-sm"
              />
              <Button size="icon" className="h-12 w-12 rounded-xl shrink-0" onClick={handleSendMessage}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Generate Button */}
            <Button
              className={cn(
                "w-full h-14 rounded-2xl gap-3 font-black uppercase tracking-widest text-xs mt-3 transition-all",
                generateMutation.isPending
                  ? "bg-primary/50 cursor-not-allowed"
                  : "bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95"
              )}
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <><Loader2 className="animate-spin h-5 w-5" /> {t('scheduleManager.generator.generating')}</>
              ) : (
                <><Sparkles className="h-5 w-5" /> {t('scheduleManager.generator.generateBtn')}</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT PANEL: Schedule Preview */}
      <Card className="rounded-3xl border-border/50 bg-card/50 backdrop-blur-sm flex flex-col overflow-hidden">
        <CardHeader className="p-4 pb-2 shrink-0 flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {t('scheduleManager.generator.resultTitle')}
            </CardTitle>
          </div>
          {generatedClassIds.length > 0 && (
            <Select value={previewClass} onValueChange={setPreviewClass}>
              <SelectTrigger className="w-48 h-9 rounded-xl bg-muted/20 border-none font-bold text-xs">
                <SelectValue placeholder={t('scheduleManager.staffing.classPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {generatedClassIds.map((cid: string) => {
                  const cls = classes.find((c: any) => c.id === cid);
                  return <SelectItem key={cid} value={cid} className="font-bold text-xs">{cls?.name || cid}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          )}
        </CardHeader>

        <CardContent className="p-4 pt-2 flex-1 overflow-auto">
          {generatedEntries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-40">
              <Bot className="h-20 w-20 mb-6 text-muted-foreground/30" />
              <h3 className="text-xl font-black tracking-tight mb-2">{t('scheduleManager.generator.ready')}</h3>
              <p className="text-sm font-medium max-w-md">{t('scheduleManager.generator.readyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Schedule Grid */}
              <div className="rounded-2xl border border-border/40 overflow-hidden bg-background/30">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/20">
                      <TableHead className="w-14 text-[9px] font-black uppercase tracking-widest text-center bg-muted/20">№</TableHead>
                      {DAYS_LABELS.map(d => (
                        <TableHead key={d} className="text-[9px] font-black uppercase tracking-widest text-center bg-muted/20">{d}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classGrid.map((row, period) => (
                      <TableRow key={period} className="border-border/10">
                        <TableCell className="text-center font-black text-xs text-muted-foreground py-2">
                          {period + 1}
                        </TableCell>
                        {row.map((cell, day) => (
                          <TableCell key={day} className="p-1">
                            {cell ? (
                              <div
                                className="bg-primary/8 border border-primary/15 rounded-lg p-2 min-h-[52px] hover:border-primary/40 transition-all group cursor-pointer relative"
                                onClick={() => {
                                  setEditingCell(cell);
                                  setEditTeacher(cell.teacher_id || "");
                                  setEditRoom(cell.room_id || "");
                                }}
                              >
                                <Pencil className="h-3 w-3 absolute top-1 right-1 opacity-0 group-hover:opacity-50 transition-opacity text-primary" />
                                <div className="font-bold text-[11px] leading-tight text-foreground truncate">
                                  {cell.subject_name || subjects.find((s:any) => s.id === cell.subject_id)?.name || "—"}
                                </div>
                                <div className="text-[9px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                                  <Users className="h-2.5 w-2.5 shrink-0" />
                                  {cell.teacher_name || teachers.find((tc:any) => tc.id === cell.teacher_id)?.name || "—"}
                                </div>
                                {cell.room_id ? (
                                  <div className="text-[8px] text-primary/60 mt-0.5 truncate flex items-center gap-0.5">
                                    <Building2 className="h-2 w-2 shrink-0" />
                                    {cell.room_name || rooms.find((r:any) => r.id === cell.room_id)?.name || cell.room_id}
                                  </div>
                                ) : (
                                  <div className="text-[8px] text-muted-foreground/40 mt-0.5 italic">—</div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-lg min-h-[52px] border border-dashed border-border/20" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-500">{t('scheduleManager.generator.successMsg')}</p>
                  <p className="text-[10px] text-green-500/70 font-medium">
                    {generatedEntries.length} {t('scheduleManager.generator.entriesWord')} • {generatedClassIds.length} {t('scheduleManager.generator.classesWord')}
                  </p>
                </div>
              </div>

              {/* Save */}
              <div className="flex gap-3">
                <Input
                  placeholder={t('scheduleManager.generator.namePlaceholder')}
                  value={scheduleName}
                  onChange={e => setScheduleName(e.target.value)}
                  className="h-12 rounded-xl font-bold bg-muted/20 border-none flex-1"
                />
                <Button
                  className="h-12 rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg hover:scale-105 transition-all"
                  disabled={!scheduleName.trim() || saveMutation.isPending}
                  onClick={async () => {
                    if (!scheduleName.trim()) return;
                    try {
                      await saveMutation.mutateAsync({
                        name: scheduleName.trim(),
                        entries: generatedEntries,
                        grade_levels: selectedGrades,
                      });
                      toast.success(t('scheduleManager.generator.savedToast'));
                      setScheduleName("");
                    } catch (err: any) {
                      toast.error(err?.message || "Error saving");
                    }
                  }}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t('scheduleManager.generator.saveBtn')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingCell} onOpenChange={(open) => { if (!open) setEditingCell(null); }}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              {t('scheduleManager.generator.editTitle') || 'Редактировать урок'}
            </DialogTitle>
          </DialogHeader>
          {editingCell && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                  {t('scheduleManager.subjects.title') || 'Предмет'}
                </label>
                <div className="h-10 rounded-xl bg-muted/20 border-none flex items-center px-3 font-bold text-sm">
                  {editingCell.subject_name || subjects.find((s:any) => s.id === editingCell.subject_id)?.name || "—"}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                  {t('scheduleManager.staffing.teacher') || 'Учитель'}
                </label>
                <Select value={editTeacher} onValueChange={setEditTeacher}>
                  <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-none font-bold text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60">
                    {teachers.map((tc:any) => (
                      <SelectItem key={tc.id} value={tc.id} className="font-bold text-sm">{tc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">
                  {t('scheduleManager.rooms.name') || 'Кабинет'}
                </label>
                <Select value={editRoom} onValueChange={setEditRoom}>
                  <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-none font-bold text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60">
                    {rooms.map((r:any) => (
                      <SelectItem key={r.id} value={r.id} className="font-bold text-sm">{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditingCell(null)}>
              {t('common.cancel') || 'Отмена'}
            </Button>
            <Button
              className="rounded-xl font-black"
              disabled={updateEntryMutation.isPending}
              onClick={async () => {
                if (!editingCell) return;
                try {
                  if (editingCell.id) {
                    // Saved entry — update via API
                    await updateEntryMutation.mutateAsync({
                      id: editingCell.id,
                      teacher_id: editTeacher,
                      room_id: editRoom,
                    });
                  }
                  // Also update local state
                  setGeneratedEntries(prev => prev.map(e => {
                    if (e.day === editingCell.day && e.period === editingCell.period && e.class_id === editingCell.class_id) {
                      const newTeacher = teachers.find((tc:any) => tc.id === editTeacher);
                      const newRoom = rooms.find((r:any) => r.id === editRoom);
                      return {
                        ...e,
                        teacher_id: editTeacher,
                        teacher_name: newTeacher?.name || e.teacher_name,
                        room_id: editRoom,
                        room_name: newRoom?.name || e.room_name,
                      };
                    }
                    return e;
                  }));
                  toast.success(t('common.saved') || 'Сохранено');
                  setEditingCell(null);
                } catch (err: any) {
                  toast.error(err?.message || 'Error');
                }
              }}
            >
              {updateEntryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('common.save') || 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ─── Saved Schedules Tab ───

const SAVED_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт"];
const SAVED_PERIODS_COUNT = 8;

function SavedSchedulesTab({ classes, teachers, rooms, subjects }: any) {
  const { t } = useTranslation();
  const { data: savedList = [], isLoading } = useSavedSchedules();
  const deleteMutation = useDeleteSavedSchedule();
  const loadMutation = useLoadSavedSchedule();
  const applyMutation = useApplySavedSchedule();

  const [viewingSchedule, setViewingSchedule] = useState<any>(null);
  const [viewClass, setViewClass] = useState<string>("");

  const handleView = async (id: string) => {
    try {
      const data = await loadMutation.mutateAsync(id);
      setViewingSchedule(data);
      const cids = [...new Set((data.entries || []).map((e: any) => e.class_id))];
      if (cids.length > 0) setViewClass(cids[0] as string);
    } catch (err: any) {
      toast.error(err?.message || "Error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      if (viewingSchedule?.id === id) setViewingSchedule(null);
      toast.success(t('common.deleted') || "Deleted");
    } catch (err: any) {
      toast.error(err?.message || "Error");
    }
  };

  const viewGrid = useMemo(() => {
    if (!viewingSchedule || !viewClass) return [];
    const grid: (any | null)[][] = Array.from({ length: SAVED_PERIODS_COUNT }, () => Array(5).fill(null));
    (viewingSchedule.entries || [])
      .filter((e: any) => e.class_id === viewClass)
      .forEach((e: any) => {
        if (e.day >= 0 && e.day < 5 && e.period >= 0 && e.period < SAVED_PERIODS_COUNT) {
          grid[e.period][e.day] = e;
        }
      });
    return grid;
  }, [viewingSchedule, viewClass]);

  const viewClassIds = useMemo(() => {
    if (!viewingSchedule) return [];
    return [...new Set((viewingSchedule.entries || []).map((e: any) => e.class_id))];
  }, [viewingSchedule]);

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-primary" />
            {t('scheduleManager.saved.title')}
          </CardTitle>
          <CardDescription>{t('scheduleManager.saved.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">{t('scheduleManager.saved.empty')}</p>
              <p className="text-sm mt-1">{t('scheduleManager.saved.emptyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedList.map((s: any) => (
                <div key={s.id} className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                  s.is_active ? "bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20" :
                  viewingSchedule?.id === s.id ? "bg-primary/10 border-primary/30" : "bg-muted/10 border-border/30 hover:border-border/60"
                )}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm truncate">{s.name}</h4>
                      {s.is_active && (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[9px] py-0 gap-1 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          {t('scheduleManager.saved.active') || 'Активное'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{s.total_entries} уроков</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.total_classes} классов</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}</span>
                      {s.grade_levels?.length > 0 && <Badge variant="secondary" className="text-[9px] py-0">{s.grade_levels.join(", ")} кл.</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!s.is_active && (
                      <Button
                        size="sm"
                        className="rounded-xl gap-1.5 text-xs font-black bg-green-600 hover:bg-green-700 text-white shadow-lg"
                        onClick={async () => {
                          try {
                            const res = await applyMutation.mutateAsync(s.id);
                            toast.success(res.message || 'Расписание применено!');
                          } catch (err: any) {
                            toast.error(err?.message || 'Error');
                          }
                        }}
                        disabled={applyMutation.isPending}
                      >
                        {applyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        {t('scheduleManager.saved.apply') || 'Применить'}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs font-bold" onClick={() => handleView(s.id)} disabled={loadMutation.isPending}>
                      {loadMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                      {t('common.view') || "Просмотр"}
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {viewingSchedule && (
        <Card className="rounded-3xl border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black">{viewingSchedule.name}</CardTitle>
              <CardDescription>{viewingSchedule.total_entries} уроков • {viewClassIds.length} классов</CardDescription>
            </div>
            {viewClassIds.length > 0 && (
              <Select value={viewClass} onValueChange={setViewClass}>
                <SelectTrigger className="w-48 h-9 rounded-xl bg-muted/20 border-none font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {viewClassIds.map((cid: string) => {
                    const cls = classes.find((c: any) => c.id === cid);
                    return <SelectItem key={cid} value={cid} className="font-bold text-xs">{cls?.name || cid}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-border/40 overflow-hidden bg-background/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/20">
                    <TableHead className="w-14 text-[9px] font-black uppercase tracking-widest text-center bg-muted/20">№</TableHead>
                    {SAVED_DAYS.map(d => (
                      <TableHead key={d} className="text-[9px] font-black uppercase tracking-widest text-center bg-muted/20">{d}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewGrid.map((row, period) => (
                    <TableRow key={period} className="border-border/10">
                      <TableCell className="text-center font-black text-xs text-muted-foreground py-2">{period + 1}</TableCell>
                      {row.map((cell: any, day: number) => (
                        <TableCell key={day} className="p-1">
                          {cell ? (
                            <div className="bg-primary/8 border border-primary/15 rounded-lg p-2 min-h-[48px]">
                              <div className="font-bold text-[10px] truncate">{cell.subject_name || subjects.find((s:any) => s.id === cell.subject_id)?.name || "—"}</div>
                              <div className="text-[8px] text-muted-foreground mt-0.5 truncate">{cell.teacher_name || teachers.find((tc:any) => tc.id === cell.teacher_id)?.name || "—"}</div>
                              {cell.room_id && <div className="text-[7px] text-primary/50 mt-0.5 truncate">{cell.room_name || rooms.find((r:any) => r.id === cell.room_id)?.name || ""}</div>}
                            </div>
                          ) : (
                            <div className="rounded-lg min-h-[48px] border border-dashed border-border/20" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
