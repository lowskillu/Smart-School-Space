import React, { useState, useMemo } from 'react';
import { 
  BookOpen, Plus, Minus, Trash2, Edit2, Search, ArrowLeft, MoreVertical,
  Filter, Download, LayoutGrid, List as ListIcon, ChevronRight,
  Database, Layers, Calendar, Clock, Sparkles, GraduationCap,
  Settings2, BookMarked, BrainCircuit, Microscope, FunctionSquare,
  Globe, Languages, Palette, Activity, Check, Users, Book
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject,
  useGradeSubjects, useCreateGradeSubject, useUpdateGradeSubject, useDeleteGradeSubject,
  useTeachers, useClasses, useCreateWorkload, useDeleteWorkload, useTeacherWorkloads, useUpdateWorkload, useTeacherConstraints,
} from '@/hooks/useApiData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Counter } from '@/components/ui/counter';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── ICON MAPPING ───
const getSubjectIcon = (name: string) => {
  if (!name) return <GraduationCap className="h-6 w-6" />;
  const n = name.toLowerCase();
  if (n.includes('math') || n.includes('алг') || n.includes('мат')) return <FunctionSquare className="h-6 w-6" />;
  if (n.includes('bio') || n.includes('био')) return <Microscope className="h-6 w-6" />;
  if (n.includes('phys') || n.includes('физ') || n.includes('chem') || n.includes('хим')) return <BrainCircuit className="h-6 w-6" />;
  if (n.includes('hist') || n.includes('ист') || n.includes('geo') || n.includes('гео')) return <Globe className="h-6 w-6" />;
  if (n.includes('lang') || n.includes('язык') || n.includes('engl') || n.includes('russ')) return <Languages className="h-6 w-6" />;
  if (n.includes('art') || n.includes('изо') || n.includes('music') || n.includes('муз')) return <Palette className="h-6 w-6" />;
  if (n.includes('sport') || n.includes('физк')) return <Activity className="h-6 w-6" />;
  return <GraduationCap className="h-6 w-6" />;
};

export default function SubjectsManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('registry');
  const [selectedGrade, setSelectedGrade] = useState<number>(10);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-[inset_0_0_20px_rgba(var(--primary),0.1)] border border-primary/20">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase leading-none mb-1.5">{t('subjectsManager.title')}</h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60">
              {activeTab === 'registry' 
                ? t('subjectsManager.subtitleRegistry') 
                : t('subjectsManager.subtitleCurriculum')}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/app/admin')} 
          className="h-10 w-10 shrink-0 rounded-xl hover:bg-accent text-muted-foreground"
        >
           <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-muted/20 p-1 rounded-2xl border border-border/40 inline-flex shadow-inner">
          <TabsTrigger value="registry" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all font-bold uppercase text-[10px] tracking-widest gap-2">
            <Database className="h-3.5 w-3.5" /> {t('subjectsManager.tabs.registry')}
          </TabsTrigger>
          <TabsTrigger value="curriculum" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all font-bold uppercase text-[10px] tracking-widest gap-2">
            <Layers className="h-3.5 w-3.5" /> {t('subjectsManager.tabs.curriculum')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="animate-in slide-in-from-left-4 duration-500">
          <SubjectsRegistry />
        </TabsContent>

        <TabsContent value="curriculum" className="animate-in slide-in-from-right-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Card className="lg:col-span-3 rounded-[2.5rem] border-border/40 bg-card/20 backdrop-blur-2xl shadow-2xl h-fit sticky top-24 overflow-hidden">
              <CardHeader className="p-6 border-b border-border/20 bg-muted/5">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">{t('subjectsManager.selectGrade')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                  <button
                    key={g}
                    onClick={() => setSelectedGrade(g)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-2xl border transition-all flex items-center justify-between group",
                      selectedGrade === g 
                        ? "bg-primary border-primary text-primary-foreground shadow-2xl shadow-primary/20 scale-[1.02] z-10" 
                        : "bg-transparent border-transparent hover:bg-muted/30 hover:border-border/40"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs transition-all", 
                        selectedGrade === g ? "bg-white text-primary" : "bg-muted/40 text-muted-foreground"
                      )}>
                        {g}
                      </div>
                      <span className="font-black tracking-tight text-[11px] uppercase opacity-90">{t('classesManager.grade')} {g}</span>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 transition-transform opacity-30", selectedGrade === g ? "translate-x-0 opacity-100" : "-translate-x-2")} />
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="lg:col-span-9">
              <GradeCurriculum gradeLevel={selectedGrade} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubjectsRegistry() {
  const { t } = useTranslation();
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();
  const deleteMutation = useDeleteSubject();
  
  const { data: allWorkloads = [] } = useTeacherWorkloads();
  const deleteWorkload = useDeleteWorkload();

  const [search, setSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: '', code: '', category: 'Core', credits: 1, standard_hours: 4, teacherIds: [] });

  const filtered = useMemo(() => subjects.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || (s.code && s.code.toLowerCase().includes(search.toLowerCase()))
  ), [subjects, search]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => 
      t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || 
      (t.email && t.email.toLowerCase().includes(teacherSearch.toLowerCase()))
    );
  }, [teachers, teacherSearch]);

  const handleSave = async () => {
    if (!form.name) return toast.error(t('common.required'));
    try {
      const payload = {
        ...form,
        teacherIds: form.teacherIds || [],
        credits: parseInt(form.credits || 1),
        standard_hours: parseInt(form.standard_hours || 4)
      };
      if (form.id) {
         await updateMutation.mutateAsync({ ...payload, id: form.id });
         const oldSubject = subjects.find(s => s.id === form.id);
         const oldTeacherIds = oldSubject?.teacher_ids || [];
         const newTeacherIds = payload.teacherIds;
         const removedIds = oldTeacherIds.filter(id => !newTeacherIds.includes(id));
         
         if (removedIds.length > 0) {
            const workloadsToDelete = allWorkloads.filter(w => w.subject_id === form.id && removedIds.includes(w.teacher_id));
            for (const w of workloadsToDelete) {
               await deleteWorkload.mutateAsync(w.id);
            }
         }
      }
      else await createMutation.mutateAsync(payload);
      setIsModalOpen(false);
      toast.success(t('common.success'));
    } catch (e) { toast.error(t('common.error')); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/20 backdrop-blur-xl p-6 rounded-[2.5rem] border border-border/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
          <Input 
            placeholder={t('subjectsManager.registry.searchPlaceholder')}
            className="h-14 pl-12 rounded-[1.5rem] bg-background/50 border-border/40 focus:ring-primary/20 transition-all font-bold" 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
          />
        </div>
        <Button 
          onClick={() => { 
            setForm({ name: '', code: '', category: 'Core', credits: 1, standard_hours: 4, teacherIds: [] }); 
            setTeacherSearch('');
            setIsModalOpen(true); 
          }} 
          className="rounded-[1.5rem] font-black h-14 px-8 shadow-2xl shadow-primary/20 gap-3 text-[11px] uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 bg-primary text-primary-foreground"
        >
          <Plus className="h-5 w-5" /> {t('subjectsManager.registry.add')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(s => (
          <div key={s.id} className="group relative p-6 rounded-[2.5rem] border border-border/40 bg-card/30 backdrop-blur-md shadow-xl hover:border-primary/40 hover:shadow-primary/5 transition-all overflow-hidden flex flex-col h-full min-h-[220px]">
             <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-1 transform translate-y-[-10px] group-hover:translate-y-0">
               <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background/80 shadow-sm" onClick={() => { setForm({...s, teacherIds: s.teacher_ids || []}); setTeacherSearch(''); setIsModalOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
               <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
               {getSubjectIcon(s.name)}
            </div>
            
            <div className="space-y-1.5 mb-6">
               <div className="flex items-center gap-2 mb-1">
                 <Badge variant="outline" className="text-[8px] font-black tracking-widest uppercase opacity-50 px-2 py-0 border-primary/20">{s.code || 'REG'}</Badge>
                 {s.teacher_ids && s.teacher_ids.length > 0 && (
                    <Badge className="text-[8px] font-black bg-primary/10 text-primary border-none">{s.teacher_ids.length} {t('subjectsManager.registry.teachersCount')}</Badge>
                 )}
               </div>
               <h3 className="text-xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors pr-8">{s.name}</h3>
            </div>
            
            <div className="mt-auto pt-5 border-t border-border/20 flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
                  {s.category === 'Core' ? t('subjectsManager.categories.core') : s.category || t('subjectsManager.categories.general')}
               </span>
               <div className="flex items-center gap-1.5 text-primary text-[10px] font-black">
                  <Clock className="h-3 w-3" />
                  {s.standard_hours} {t('subjectsManager.hoursUnit')}
               </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-[3rem] p-10 max-w-2xl border-none shadow-3xl bg-card/90 backdrop-blur-3xl overflow-hidden">
          <DialogHeader className="mb-6 items-center text-center">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter">{form.id ? t('subjectsManager.modals.editSubject') : t('subjectsManager.modals.addSubject')}</DialogTitle>
            <DialogDescription className="font-bold text-[10px] uppercase tracking-widest opacity-60">{t('subjectsManager.modals.subjectDesc')}</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
             <div className="space-y-6">
               <div className="space-y-2">
                 <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-3">{t('subjectsManager.modals.subjectName')}</Label>
                 <Input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="rounded-[1.5rem] h-14 bg-muted/20 border-none text-lg font-black px-6 focus:ring-primary/40" />
               </div>
               <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-3">{t('subjectsManager.modals.subjectCode')}</Label>
                  <Input value={form.code} onChange={e=>setForm({...form, code: e.target.value})} className="rounded-[1.5rem] h-14 bg-muted/20 border-none px-6 font-mono font-black placeholder:opacity-30" placeholder="e.g. MATH-X" />
               </div>
               <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 flex flex-col items-center justify-center text-center">
                  <Sparkles className="h-6 w-6 text-primary/40 mb-2" />
                  <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">{t('subjectsManager.modals.infoText')}</p>
               </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between ml-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t('subjectsManager.modals.assignTeachers')}</Label>
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">{form.teacherIds?.length || 0} {t('subjectsManager.modals.selectedCount')}</Badge>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40" />
                  <Input 
                    placeholder={t('subjectsManager.modals.teacherSearch')} 
                    value={teacherSearch}
                    onChange={e => setTeacherSearch(e.target.value)}
                    className="h-10 pl-9 rounded-xl bg-muted/20 border-none text-[11px] font-bold"
                  />
                </div>

                <div className="bg-muted/10 rounded-[1.5rem] border border-border/20 p-2 space-y-1 h-[250px] overflow-y-auto custom-scrollbar">
                   {filteredTeachers.map(t => {
                     const isSelected = form.teacherIds?.includes(t.id);
                     return (
                       <button
                         key={t.id}
                         onClick={() => {
                            const newIds = isSelected 
                              ? form.teacherIds.filter((id: string) => id !== t.id)
                              : [...(form.teacherIds || []), t.id];
                            setForm({...form, teacherIds: newIds});
                         }}
                         className={cn(
                           "w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left",
                           isSelected ? "bg-primary/20 border-primary/40 shadow-sm" : "bg-background/40 border-transparent hover:bg-muted/30"
                         )}
                       >
                         <div className={cn(
                           "h-4 w-4 rounded flex items-center justify-center border transition-all",
                           isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                         )}>
                            {isSelected && <Check className="h-2.5 w-2.5 bold" />}
                         </div>
                         <div className="flex-1 overflow-hidden">
                             <p className="text-[10px] font-black uppercase tracking-tight leading-none truncate">{t.name}</p>
                             <p className="text-[8px] text-muted-foreground font-bold mt-1 opacity-50 truncate">{t.email || "No Email"}</p>
                         </div>
                       </button>
                     );
                   })}
                </div>
             </div>
          </div>

          <DialogFooter className="mt-8 flex gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-[1.5rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest border border-border/40 hover:bg-muted/30">{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="flex-1 rounded-[1.5rem] h-14 font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-primary/30 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all">{form.id ? t('common.save') : t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GradeCurriculum({ gradeLevel }: { gradeLevel: number }) {
  const { t } = useTranslation();
  
  const { data: subjects = [] } = useSubjects();
  const { data: curriculum = [], isLoading: isCurLoading } = useGradeSubjects(gradeLevel);
  const { data: allTeachers = [] } = useTeachers();
  const { data: allClasses = [] } = useClasses();
  const { data: allWorkloads = [] } = useTeacherWorkloads();
  const { data: teacherConstraints = [] } = useTeacherConstraints();

  const createMutation = useCreateGradeSubject();
  const updateMutation = useUpdateGradeSubject();
  const deleteMutation = useDeleteGradeSubject();
  const updateWorkload = useUpdateWorkload();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [hours, setHours] = useState(4);

  const teacherStats = useMemo(() => {
    const stats: Record<string, number> = {};
    if (Array.isArray(allWorkloads)) {
      const processed = new Set<string>();
      allWorkloads.forEach((w: any) => {
        if (w.teacher_id && w.class_id && w.subject_id) {
          const key = `${w.teacher_id}-${w.subject_id}-${w.class_id}`;
          if (!processed.has(key)) {
            const h = parseFloat(w.hours_per_week || 0);
            stats[w.teacher_id] = (stats[w.teacher_id] || 0) + h;
            processed.add(key);
          }
        }
      });
    }
    return stats;
  }, [allWorkloads]);

  const availableSubjects = useMemo(() => {
    if (!Array.isArray(subjects) || !Array.isArray(curriculum)) return [];
    const curIds = new Set(curriculum.map(c => c.subject_id));
    return subjects.filter(s => !curIds.has(s.id));
  }, [subjects, curriculum]);

  const totalHours = Array.isArray(curriculum) ? curriculum.reduce((acc, curr) => acc + (parseFloat(curr.hours_per_week) || 0), 0) : 0;

  const handleAdd = async () => {
    if (!selectedSubId) return toast.error(t('common.required'));
    try {
      await createMutation.mutateAsync({ grade_level: gradeLevel, subject_id: selectedSubId, hours_per_week: hours });
      setIsAdding(false);
      setSelectedSubId('');
      toast.success(t('common.success'));
    } catch (e: any) { toast.error(t('common.error')); }
  };

  if (isCurLoading) return <div className="h-64 flex items-center justify-center"><div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-card/10 backdrop-blur-3xl p-8 rounded-[3rem] border border-border/20 shadow-2xl">
         <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-[2rem] bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30 font-black text-4xl">
              {gradeLevel}
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">{t('subjectsManager.curriculum.gradeTitle')} {gradeLevel}</h2>
              <div className="flex items-center gap-4">
                 <Badge className="bg-primary/10 text-primary border-none font-bold uppercase text-[10px] tracking-widest px-4 py-1">
                    {totalHours} {t('subjectsManager.curriculum.totalHours')}
                 </Badge>
                 <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">• {t('subjectsManager.curriculum.programSubtitle')}</span>
              </div>
            </div>
         </div>
         <Button onClick={() => setIsAdding(true)} className="rounded-2xl font-black h-16 px-10 shadow-2xl shadow-primary/20 gap-3 uppercase text-xs tracking-widest bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all">
           <Plus className="h-5 w-5" /> {t('subjectsManager.curriculum.addSubject')}
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {Array.isArray(curriculum) && curriculum.map(item => (
          <GradeSubjectCard 
            key={item.id} 
            item={item} 
            gradeLevel={gradeLevel}
            allTeachers={allTeachers}
            allClasses={allClasses}
            teacherStats={teacherStats}
            allWorkloads={allWorkloads}
            subjects={subjects}
            teacherConstraints={teacherConstraints}
            onDelete={() => deleteMutation.mutate({ id: item.id, grade_level: gradeLevel })}
            onUpdate={async (val: number) => {
               try {
                 await updateMutation.mutateAsync({ id: item.id, hours_per_week: val });
                 const classIds = new Set(allClasses.filter((c:any) => c.grade_level === gradeLevel).map((c:any) => c.id));
                 const relatedWorkloads = allWorkloads.filter((w:any) => w.subject_id === item.subject_id && classIds.has(w.class_id));
                 for (const w of relatedWorkloads) {
                    await updateWorkload.mutateAsync({ id: w.id, hours_per_week: val });
                 }
                 toast.success(t('subjectsManager.curriculum.syncSuccess'));
               } catch (err) {
                 toast.error(t('common.error'));
               }
            }}
          />
        ))}
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="rounded-[4rem] p-16 max-w-2xl border-none shadow-3xl bg-card/90 backdrop-blur-3xl overflow-hidden">
           <DialogHeader className="mb-12 items-center text-center">
              <DialogTitle className="text-4xl font-black uppercase tracking-tighter">{t('subjectsManager.curriculum.assignTitle')}</DialogTitle>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 mt-3">{t('subjectsManager.curriculum.gradeSubtitle')} {gradeLevel}</p>
           </DialogHeader>
           <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-4">{t('subjectsManager.curriculum.chooseSubject')}</label>
                <Select value={selectedSubId} onValueChange={setSelectedSubId}>
                   <SelectTrigger className="h-20 rounded-[2.5rem] bg-muted/20 border-none px-10 text-2xl font-black focus:ring-primary/40">
                     <SelectValue placeholder={t('subjectsManager.curriculum.searchPlaceholder')} />
                   </SelectTrigger>
                   <SelectContent className="rounded-[3rem] shadow-3xl p-4">
                      {availableSubjects.map(s => (
                        <SelectItem key={s.id} value={s.id} className="rounded-3xl py-6 font-black text-lg uppercase tracking-tight">
                           <div className="flex items-center gap-6">
                             <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">{getSubjectIcon(s.name)}</div>
                             {s.name}
                             <Badge variant="outline" className="ml-auto opacity-30">{s.code || '?'}</Badge>
                           </div>
                        </SelectItem>
                      ))}
                   </SelectContent>
                </Select>
              </div>
              <div className="space-y-6 flex flex-col items-center">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t('subjectsManager.curriculum.weeklyLoad')}</label>
                <Counter value={hours} onChange={setHours} label={t('subjectsManager.hoursUnit')} />
              </div>
           </div>
           <DialogFooter className="mt-16">
              <Button onClick={handleAdd} className="w-full h-20 rounded-[2.5rem] font-black text-2xl uppercase tracking-widest bg-primary text-primary-foreground shadow-2xl shadow-primary/40 active:scale-95 transition-all">
                {t('common.confirm')}
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GradeSubjectCard({ item, gradeLevel, onDelete, onUpdate, allTeachers, allClasses, teacherStats, allWorkloads, subjects, teacherConstraints }: any) {
  const { t } = useTranslation();
  const [isStaffingOpen, setIsStaffingOpen] = useState(false);
  const createWorkload = useCreateWorkload();
  const updateWorkload = useUpdateWorkload();

  const gradeClasses = useMemo(() => allClasses.filter((c: any) => c.grade_level === gradeLevel), [allClasses, gradeLevel]);
  const subject = subjects.find((s: any) => s.id === item.subject_id);
  const qualifiedTeacherIds = subject?.teacher_ids || [];
  const qualifiedTeachers = useMemo(() => allTeachers.filter((t: any) => qualifiedTeacherIds.includes(t.id)), [allTeachers, qualifiedTeacherIds]);
  
  const assignedTeachersForSubject = useMemo(() => {
     if (!Array.isArray(allWorkloads)) return [];
     const classIds = new Set(gradeClasses.map((c:any) => c.id));
     const workloadsForSub = allWorkloads.filter((w:any) => w.subject_id === item.subject_id && classIds.has(w.class_id));
     const uniqueTeacherIds = Array.from(new Set(workloadsForSub.map((w:any) => w.teacher_id)));
     return allTeachers.filter((t:any) => uniqueTeacherIds.includes(t.id) && qualifiedTeacherIds.includes(t.id));
  }, [allWorkloads, item.subject_id, gradeClasses, allTeachers, qualifiedTeacherIds]);

  return (
    <>
      <div className="group relative p-8 rounded-[3rem] border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl hover:border-primary/40 hover:shadow-primary/5 transition-all duration-700 flex flex-col h-full min-h-[350px]">
        <div className="flex items-start justify-between mb-6">
          <div className="h-16 w-16 rounded-[1.5rem] border border-primary/20 bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground shadow-inner transition-all duration-700">
            {getSubjectIcon(item?.subject_name)}
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
             <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-background/50 shadow-sm" onClick={() => setIsStaffingOpen(true)}>
                <Users className="h-5 w-5" />
             </Button>
             <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive/50 hover:text-white hover:bg-destructive rounded-xl transition-all" onClick={onDelete}>
                <Trash2 className="h-5 w-5" />
             </Button>
          </div>
        </div>

        <div className="mb-8 flex-1">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-2 opacity-40">{item?.subject_code || 'REG'}</p>
          <h4 className="text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-all duration-500">{item?.subject_name}</h4>
          
          <div className="mt-6 space-y-3">
             <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-30">{t('subjectsManager.card.facultyTitle')}</p>
             <div className="flex flex-wrap gap-2">
                 {assignedTeachersForSubject.map((t:any) => {
                    const limit = teacherConstraints.find((c: any) => c.teacher_id === t.id)?.max_hours_per_week || 24;
                    const currentLoad = teacherStats[t.id] || 0;
                    const isOverloaded = currentLoad > limit;
                    return (
                       <Badge key={t.id} variant="secondary" className={cn(
                          "rounded-lg border-none text-[9px] font-black px-2 py-1 flex items-center gap-1.5 transition-colors",
                          isOverloaded ? "bg-destructive/10 text-destructive shadow-[0_0_10px_rgba(var(--destructive),0.2)]" : "bg-primary/5 text-primary"
                       )}>
                          {t.name} <span className="opacity-40">• {currentLoad} ч</span>
                       </Badge>
                    );
                 })}
                {assignedTeachersForSubject.length === 0 && <span className="text-[10px] font-bold italic opacity-20">{t('subjectsManager.card.noTeachers')}</span>}
             </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-border/10">
           <div className="flex items-center justify-between mb-4">
             <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-40">{t('subjectsManager.card.loadLabel')}</span>
             <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] px-3">{item?.hours_per_week || 0} {t('subjectsManager.hoursUnit')}</Badge>
           </div>
            <div className="flex items-center gap-2">
               <Button 
                 variant="outline" 
                 size="icon" 
                 className="h-12 w-12 rounded-2xl border-border/40 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                 onClick={() => onUpdate(Math.max(1, (item?.hours_per_week || 0) - 1))}
               >
                 <Minus className="h-5 w-5" />
               </Button>
               <div className="flex-1 h-12 rounded-2xl bg-muted/20 flex items-center justify-center font-black text-xl tracking-tighter">
                 {item?.hours_per_week || 0}
               </div>
               <Button 
                 variant="outline" 
                 size="icon" 
                 className="h-12 w-12 rounded-2xl border-border/40 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                 onClick={() => onUpdate((item?.hours_per_week || 0) + 1)}
               >
                 <Plus className="h-5 w-5" />
               </Button>
            </div>
        </div>
      </div>

      <Dialog open={isStaffingOpen} onOpenChange={setIsStaffingOpen}>
        <DialogContent className="rounded-[4rem] p-12 max-w-4xl border-none shadow-3xl bg-card/90 backdrop-blur-3xl overflow-hidden">
          <DialogHeader className="mb-10 items-center text-center">
             <DialogTitle className="text-4xl font-black uppercase tracking-tighter">{t('subjectsManager.staffing.title')}</DialogTitle>
             <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 mt-2">{item?.subject_name} / {t('classesManager.grade')} {gradeLevel}</p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto px-4 custom-scrollbar">
             {gradeClasses.map((cls: any) => {
                const currentAssignment = Array.isArray(allWorkloads) ? allWorkloads.find((w: any) => w.class_id === cls.id && w.subject_id === item.subject_id) : null;
                return (
                   <div key={cls.id} className="p-8 rounded-[2.5rem] border border-border/40 bg-background/30 flex flex-col gap-6 group hover:border-primary/20 transition-all">
                      <div className="flex items-center justify-between">
                         <h5 className="font-black text-2xl tracking-tighter uppercase">{cls.name}</h5>
                         <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">{item?.hours_per_week}ч</div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-3 opacity-40">{t('subjectsManager.staffing.chooseInstructor')}</label>
                         <Select 
                           value={currentAssignment?.teacher_id || ""}
                           onValueChange={(teacherId) => {
                             if (currentAssignment) {
                                updateWorkload.mutate({ 
                                   id: currentAssignment.id, 
                                   teacher_id: teacherId,
                                   hours_per_week: item.hours_per_week 
                                });
                                toast.success(`${cls.name}: Instructor Updated`);
                             } else {
                                createWorkload.mutate({ 
                                   class_id: cls.id, 
                                   teacher_id: teacherId, 
                                   subject_id: item.subject_id, 
                                   hours_per_week: item.hours_per_week 
                                });
                                toast.success(`${cls.name}: Instructor Assigned`);
                             }
                         }}>
                            <SelectTrigger className="rounded-[1.5rem] h-14 bg-background border-border/40 font-black text-sm uppercase px-6">
                               <SelectValue placeholder={t('subjectsManager.staffing.pickPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent className="rounded-[2.5rem] p-3 shadow-3xl">
                               {qualifiedTeachers.map((t: any) => {
                                  const limit = teacherConstraints.find((c: any) => c.teacher_id === t.id)?.max_hours_per_week || 24;
                                  const currentLoad = teacherStats[t.id] || 0;
                                  const isOverloaded = currentLoad > limit;
                                  return (
                                     <SelectItem key={t.id} value={t.id} className="rounded-2xl py-4 font-black text-sm uppercase tracking-tight">
                                        <div className="flex items-center justify-between w-full min-w-[200px]">
                                           <span className={isOverloaded ? "text-destructive" : ""}>{t.name}</span>
                                           <span className={cn("text-[10px] font-black", isOverloaded ? "text-destructive" : "text-primary")}>
                                              🕒 {currentLoad} / {limit} ч
                                           </span>
                                        </div>
                                     </SelectItem>
                                  );
                               })}
                            </SelectContent>
                         </Select>
                      </div>
                   </div>
                );
             })}
          </div>
          <DialogFooter className="mt-12">
             <Button onClick={() => setIsStaffingOpen(false)} className="w-full h-18 rounded-[2.5rem] font-black text-xl uppercase tracking-widest shadow-2xl bg-primary text-primary-foreground active:scale-95 transition-all">{t('common.done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
