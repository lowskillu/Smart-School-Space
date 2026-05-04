import React, { useState, useMemo } from 'react';
import { 
  Users, Plus, LayoutGrid, Search, Edit2, Trash2, 
  UserPlus, Check, ChevronRight, Hash, GraduationCap,
  Building, AlertCircle, ArrowLeft, MoreVertical, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  useClasses, useCreateClass, useUpdateClass, useDeleteClass,
  useAdminStudents, useUpdateAdminStudent, useRooms, useTeachers
} from '@/hooks/useApiData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Counter } from '@/components/ui/counter';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ClassesManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // API Hooks
  const { data: classes = [], isLoading: loadingClasses } = useClasses();
  const { data: students = [], isLoading: loadingStudents } = useAdminStudents();
  const { data: rooms = [] } = useRooms();
  const { data: allTeachers = [] } = useTeachers();
  
  const createClassMutation = useCreateClass();
  const updateClassMutation = useUpdateClass();
  const deleteClassMutation = useDeleteClass();
  const updateStudentMutation = useUpdateAdminStudent();

  // State
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [classForm, setClassForm] = useState<any>({ name: '', grade_level: 9, capacity: 22, homeroom_id: '', class_teacher_id: '' });
  const [studentForm, setStudentForm] = useState<any>({ userId: '' });
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');

  const selectedClass = classes?.find(c => c.id === selectedClassId);
  const classStudents = (students || []).filter(s => {
    if (selectedClassId === 'unassigned') return !s.class_id;
    return s.class_id === selectedClassId;
  });

  const unassignedCount = (students || []).filter(s => !s.class_id).length;

  const handleSaveClass = async () => {
    if (!classForm.name) return toast.error(t('common.required', 'Name is required'));
    try {
      if (classForm.id) {
        await updateClassMutation.mutateAsync({ id: classForm.id, ...classForm });
        toast.success(t('common.success', 'Success'));
      } else {
        await createClassMutation.mutateAsync(classForm);
        toast.success(t('common.success', 'Success'));
        setSelectedGrade(classForm.grade_level);
      }
      setIsClassModalOpen(false);
      setClassForm({ name: '', grade_level: selectedGrade, capacity: 22, homeroom_id: '', class_teacher_id: '' });
    } catch (err) {
      toast.error(t('common.error', 'Error'));
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm(t('common.confirmDelete', 'Are you sure?'))) return;
    try {
      await deleteClassMutation.mutateAsync(id);
      if (selectedClassId === id) setSelectedClassId(null);
      toast.success(t('common.deleted', 'Deleted'));
    } catch (err) {
      toast.error(t('common.error', 'Error'));
    }
  };

  const handleSaveStudent = async () => {
    if (!studentForm.userId) return toast.error(t('classesManager.modals.selectFromDb', 'Please select a student'));
    const targetStudent = students.find(s => s.user_id === studentForm.userId);
    try {
      await updateStudentMutation.mutateAsync({
        userId: studentForm.userId,
        class_id: selectedClassId
      });
      toast.success(`${targetStudent?.name} → ${selectedClass?.name || 'Class'}`);
      setIsStudentModalOpen(false);
      setStudentForm({ userId: '' });
      setStudentSearch('');
    } catch (err) {
      toast.error(t('common.error', 'Error'));
    }
  };

  const sortedClassesForTransfer = useMemo(() => {
    return [...(classes || [])].sort((a, b) => {
      if (a.grade_level !== b.grade_level) return (a.grade_level || 0) - (b.grade_level || 0);
      return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
    });
  }, [classes]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/admin')} className="h-10 w-10 shrink-0 rounded-xl hover:bg-accent text-muted-foreground">
             <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t('classesManager.title')} <span className="text-primary">{t('classesManager.titleAccent')}</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium">{t('classesManager.subtitle')}</p>
          </div>
        </div>
        <Button 
          onClick={() => { setClassForm({ name: '', grade_level: selectedGrade, capacity: 22, homeroom_id: '', class_teacher_id: '' }); setIsClassModalOpen(true); }} 
          className="h-10 px-4 gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm font-bold"
        >
          <Plus className="h-4 w-4" /> {t('classesManager.createClass')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-2xl shadow-sm border-border/50 h-fit overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3 pt-5 px-6 border-b border-border/40">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                   <LayoutGrid className="h-5 w-5 text-primary" /> {t('classesManager.classRegistry')}
                </CardTitle>
                <Badge variant="secondary" className="rounded-lg font-bold px-2 py-0.5 text-[10px] uppercase">
                   {classes?.length || 0} {t('classesManager.total')}
                </Badge>
              </div>
              
              <div className="grid grid-cols-6 gap-2 pt-2 mb-4">
                {Array.from({length: 12}, (_, i) => i + 1).map(grade => {
                  const hasClassesInGrade = classes?.some(c => c.grade_level === grade);
                  return (
                    <button key={grade} onClick={() => setSelectedGrade(grade)} className={cn("relative h-11 rounded-xl font-black text-sm transition-all border flex items-center justify-center", selectedGrade === grade ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.05] z-10" : "bg-background hover:bg-accent border-border/50 text-muted-foreground")}>
                      {grade}
                      {hasClassesInGrade && selectedGrade !== grade && <div className="absolute top-1.5 right-1.5 h-1 w-1 rounded-full bg-primary animate-pulse" />}
                    </button>
                  );
                })}
              </div>

              {/* Unassigned Area - Now much cleaner */}
              <button 
                onClick={() => { setSelectedGrade(0); setSelectedClassId("unassigned"); }} 
                className={cn(
                  "w-full h-14 rounded-2xl transition-all border flex items-center justify-between px-5 mt-2",
                  selectedGrade === 0 
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-600 shadow-sm" 
                    : "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-amber-600/70"
                )}
              >
                <div className="flex items-center gap-3">
                   <AlertCircle className={cn("h-4 w-4", selectedGrade === 0 ? "animate-pulse" : "")} />
                   <span className="font-black text-[10px] uppercase tracking-wider">{t('classesManager.unassignedTitle')}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-sm font-black">{unassignedCount}</span>
                   <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", selectedGrade === 0 ? "rotate-90" : "")} />
                </div>
              </button>

              <div className="flex items-center gap-2 mt-6 mb-2 px-1">
                 <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {selectedGrade === 0 ? t('classesManager.unassignedList') : `Grade ${selectedGrade} Classes`}
                 </span>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 gap-2 pr-2 pb-2">
                  {selectedGrade === 0 ? (
                    <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                       <AlertCircle className="h-12 w-12" />
                       <div className="space-y-1">
                         <p className="font-black text-xs uppercase">{t('classesManager.unassignedList')}</p>
                         <p className="text-[10px] font-bold">{unassignedCount} учеников ожидают зачисления</p>
                       </div>
                    </div>
                  ) : (
                    classes?.filter(cls => cls.grade_level === selectedGrade).sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, {numeric: true})).map(cls => (
                      <div key={cls.id} className="group/item relative">
                        <button onClick={() => setSelectedClassId(cls.id)} className={cn("w-full text-left p-3 rounded-xl transition-all border flex flex-col items-center justify-center text-center gap-2", selectedClassId === cls.id ? "bg-primary/10 border-primary/40 text-primary shadow-sm" : "bg-background hover:bg-accent/50 border-border/40")}>
                           <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm transition-all group-hover/item:scale-110", selectedClassId === cls.id ? "bg-primary text-primary-foreground" : "bg-primary/5 text-primary")}>
                             {cls.name}
                           </div>
                           <div className="space-y-0.5">
                             <p className="font-black text-xs tracking-tight">{cls.name}</p>
                             <p className="text-[9px] font-bold text-muted-foreground/80 flex items-center justify-center gap-1">
                                <Users className="h-2.5 w-2.5" />
                                {students.filter(s => s.class_id === cls.id).length}/{cls.capacity || 22}
                             </p>
                           </div>
                        </button>
                        <div className="absolute right-1 top-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                           <Popover>
                              <PopoverTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-background/80 backdrop-blur-sm border shadow-sm"><MoreVertical className="h-3 w-3" /></Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-1 rounded-2xl shadow-3xl border-border/40 bg-card/95 backdrop-blur-xl" align="end" side="left" sideOffset={10}>
                                 <Button variant="ghost" className="w-full justify-start rounded-lg text-xs h-9 px-3 font-medium" onClick={(e) => { e.stopPropagation(); setClassForm(cls); setIsClassModalOpen(true); }}><Edit2 className="h-3.5 w-3.5 mr-2" /> {t('classesManager.editDetails')}</Button>
                                 <Button variant="ghost" className="w-full justify-start rounded-lg text-xs h-9 px-3 font-medium text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}><Trash2 className="h-3.5 w-3.5 mr-2" /> {t('classesManager.dissolveClass')}</Button>
                              </PopoverContent>
                           </Popover>
                        </div>
                      </div>
                    ))
                  )}
                  {selectedGrade !== 0 && classes?.filter(cls => cls.grade_level === selectedGrade).length === 0 && (
                     <div className="col-span-2 py-12 text-center opacity-30">
                        <p className="text-[10px] font-black uppercase tracking-widest">Нет классов</p>
                     </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Roster Area */}
        <div className="lg:col-span-8">
          <Card className="rounded-2xl shadow-sm border-border/50 min-h-[600px] flex flex-col bg-card/50 backdrop-blur-sm overflow-hidden">
            {!selectedClassId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                 <div className="h-20 w-20 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
                    <GraduationCap className="h-10 w-10 text-primary opacity-30" />
                 </div>
                 <h3 className="text-xl font-bold tracking-tight mb-2">{t('classesManager.zeroStateTitle')}</h3>
                 <p className="text-muted-foreground text-sm max-w-xs font-medium">{t('classesManager.zeroStateDesc')}</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
                <CardHeader className="py-6 px-8 border-b border-border/40 flex flex-row items-center justify-between bg-accent/30">
                    <div className="flex items-center gap-5">
                       <div className={cn("h-16 w-16 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-md", selectedClassId === 'unassigned' ? "bg-amber-500" : "bg-primary")}>
                         {selectedClassId === 'unassigned' ? <AlertCircle className="h-8 w-8" /> : selectedClass?.name}
                       </div>
                       <div className="space-y-1">
                         <CardTitle className="text-2xl font-bold tracking-tight">{selectedClassId === 'unassigned' ? t('classesManager.unassignedList') : `${t('classesManager.groupTitle')} ${selectedClass?.name}`}</CardTitle>
                         <div className="flex items-center gap-3">
                            {selectedClassId !== 'unassigned' && (
                              <Badge variant="outline" className="rounded-md font-bold text-[10px] bg-background border-border/50 px-2 py-0">{t('classesManager.grade')} {selectedClass?.grade_level}</Badge>
                            )}
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{classStudents.length} {t('classesManager.assignedCount')}</p>
                         </div>
                       </div>
                    </div>
                    {selectedClassId !== 'unassigned' && (
                      <Button onClick={() => setIsStudentModalOpen(true)} className="h-10 px-4 gap-2 rounded-xl bg-foreground text-background font-bold shadow-sm"><UserPlus className="h-4 w-4" /> {t('classesManager.enlistStudent')}</Button>
                    )}
                </CardHeader>
                <div className="flex-1 overflow-auto">
                   <Table>
                      <TableHeader className="bg-muted/30 sticky top-0 bg-card/90 backdrop-blur-md">
                        <TableRow className="border-b border-border/40 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                          <TableHead className="px-8 py-4">{t('classesManager.table.identity')}</TableHead>
                          <TableHead className="py-4 text-center">{t('classesManager.table.status')}</TableHead>
                          <TableHead className="text-right px-8 py-4">{t('classesManager.table.action')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classStudents.map((student) => (
                          <TableRow key={student.user_id} className="group hover:bg-accent/30 border-b border-border/30 last:border-0">
                            <TableCell className="px-8 py-5">
                               <div className="flex items-center gap-4">
                                  <div className="h-11 w-11 rounded-lg bg-background border border-border/50 flex items-center justify-center font-bold text-sm text-primary shadow-sm">
                                    {(student.name || '?').split(' ').map((n: any) => n[0]).join('')}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm tracking-tight">{student.name}</p>
                                    <p className="text-[10px] font-medium text-muted-foreground/80">{student.email}</p>
                                  </div>
                               </div>
                            </TableCell>
                            <TableCell className="text-center">
                               <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-full px-3 py-0.5 font-bold text-[9px] uppercase tracking-wider">Active</Badge>
                            </TableCell>
                            <TableCell className="text-right px-8">
                               <div className="flex items-center justify-end gap-2">
                                  <Select onValueChange={async (newClassId) => { try { await updateStudentMutation.mutateAsync({ userId: student.user_id, class_id: newClassId }); toast.success(t('common.success')); } catch (err) { toast.error(t('common.error')); } }}>
                                    <SelectTrigger className="w-40 h-10 rounded-xl font-bold text-[10px] uppercase tracking-wide border-border/50 bg-background/50">
                                      <SelectValue placeholder={t('classesManager.table.transfer')} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/50 shadow-3xl bg-card/95 backdrop-blur-xl max-h-[300px]">
                                      {sortedClassesForTransfer.filter(c => c.id !== selectedClassId).map(c => (
                                        <SelectItem key={c.id} value={c.id} className="text-[11px] font-black uppercase rounded-xl m-1 h-10">
                                          {c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {selectedClassId !== 'unassigned' && (
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => updateStudentMutation.mutateAsync({ userId: student.user_id, class_id: null })}><Trash2 className="h-4.5 w-4.5" /></Button>
                                  )}
                               </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                   </Table>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* CLASS MODAL */}
      <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
        <DialogContent className="sm:max-w-3xl rounded-[3rem] p-12 border-none shadow-3xl bg-card/95 backdrop-blur-3xl overflow-hidden">
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-primary">{classForm.id ? t('classesManager.modals.optimizeClass') : t('classesManager.modals.provisionClass')}</DialogTitle>
            <DialogDescription className="font-bold text-[10px] uppercase opacity-40 mt-3">{t('classesManager.modals.classDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
               <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2">{t('classesManager.modals.titleVector')}</Label>
                  <Input value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value.toUpperCase()})} placeholder="E.G. 11A" className="h-20 rounded-[1.5rem] bg-accent/20 border-border/40 text-2xl font-black px-8 focus:ring-primary/20 transition-all text-center" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2 text-center block">{t('classesManager.grade')}</Label>
                    <Counter value={classForm.grade_level} onChange={(val) => setClassForm({...classForm, grade_level: val})} min={1} max={12} className="h-20 rounded-[1.5rem] border-border/40 bg-accent/10" />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2 text-center block">{t('classesManager.maxCapacity')}</Label>
                    <Counter value={classForm.capacity} onChange={(val) => setClassForm({...classForm, capacity: val})} min={1} max={100} className="h-20 rounded-[1.5rem] border-border/40 bg-accent/10" />
                  </div>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2">{t('classesManager.modals.homeRoom')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-18 rounded-2xl bg-accent/10 border-border/40 font-black text-sm uppercase justify-between px-8 hover:bg-accent/20 transition-all group">
                       <span className="truncate">{classForm.homeroom_id ? rooms.find((r:any) => r.id === classForm.homeroom_id)?.name : t('classesManager.modals.selectRoom')}</span>
                       <ChevronRight className="h-5 w-5 opacity-30 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-4 rounded-[2.5rem] shadow-3xl border-none bg-card/95 backdrop-blur-xl" align="center">
                    <div className="relative mb-4"><Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск кабинета..." value={roomSearch} onChange={e => setRoomSearch(e.target.value)} className="h-14 pl-14 text-sm rounded-2xl bg-accent/30 border-none" /></div>
                    <ScrollArea className="h-[300px] pr-2">
                      <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase h-12 px-4 rounded-xl hover:bg-destructive/10 mb-2" onClick={() => setClassForm({...classForm, homeroom_id: null})}>{t('classesManager.modals.unassignedRoom')}</Button>
                      {rooms?.filter((r:any) => r.name.toLowerCase().includes(roomSearch.toLowerCase())).map((r: any) => (
                        <Button key={r.id} variant={classForm.homeroom_id === r.id ? "secondary" : "ghost"} className={cn("w-full justify-start text-xs font-black uppercase h-12 px-4 rounded-xl mb-1", classForm.homeroom_id === r.id ? "bg-primary/10 text-primary" : "")} onClick={() => setClassForm({...classForm, homeroom_id: r.id})}>{r.name}</Button>
                      ))}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2">{t('classesManager.modals.classTeacher')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-18 rounded-2xl bg-accent/10 border-border/40 font-black text-sm uppercase justify-between px-8 hover:bg-accent/20 transition-all group">
                       <span className="truncate">{classForm.class_teacher_id ? allTeachers.find((t:any) => t.id === classForm.class_teacher_id)?.name : t('classesManager.modals.selectTeacher')}</span>
                       <ChevronRight className="h-5 w-5 opacity-30 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-4 rounded-[2.5rem] shadow-3xl border-none bg-card/95 backdrop-blur-xl" align="center">
                    <div className="relative mb-4"><Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск учителя..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} className="h-14 pl-14 text-sm rounded-2xl bg-accent/30 border-none" /></div>
                    <ScrollArea className="h-[300px] pr-2">
                      <Button variant="ghost" className="w-full justify-start text-[10px] font-black uppercase h-12 px-4 rounded-xl hover:bg-destructive/10 mb-2" onClick={() => setClassForm({...classForm, class_teacher_id: null})}>{t('classesManager.modals.unassignedTeacher')}</Button>
                      {allTeachers?.filter((t:any) => t.name.toLowerCase().includes(teacherSearch.toLowerCase())).map((t: any) => (
                        <Button key={t.id} variant={classForm.class_teacher_id === t.id ? "secondary" : "ghost"} className={cn("w-full justify-start text-xs font-black uppercase h-12 px-4 rounded-xl mb-1", classForm.class_teacher_id === t.id ? "bg-primary/10 text-primary" : "")} onClick={() => setClassForm({...classForm, class_teacher_id: t.id})}>{t.name}</Button>
                      ))}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-16"><Button onClick={handleSaveClass} className="w-full rounded-[2rem] h-24 font-black text-2xl uppercase tracking-[0.2em] bg-primary text-primary-foreground shadow-2xl transition-all">{classForm.id ? "Обновить данные" : "Создать группу"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Enlist Modal */}
      <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-10 border-none shadow-3xl bg-card">
          <DialogHeader className="mb-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xl shadow-primary/10"><UserPlus className="h-8 w-8" /></div>
            <div>
               <DialogTitle className="text-2xl font-black uppercase tracking-tighter">{t('classesManager.modals.enlistTitle')} {t('classesManager.modals.enlistAccent')}</DialogTitle>
               <DialogDescription className="font-bold text-[10px] uppercase opacity-40 mt-2">{t('classesManager.modals.enlistDesc')} {selectedClass?.name}</DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-6">
             <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2">{t('classesManager.modals.selectFromDb')}</Label>
                <div className="relative">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder={t('classesManager.modals.searchPlaceholder')} className="h-14 pl-14 rounded-2xl bg-accent/20 font-bold" />
                </div>
             </div>
             <ScrollArea className="h-[350px] pr-2">
                <div className="space-y-2">
                   {(students || []).filter(s => s.class_id !== selectedClassId).filter(s => { if (!studentSearch) return !s.class_id; return s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.email?.toLowerCase().includes(studentSearch.toLowerCase()); }).map((student) => (
                     <button key={student.user_id} onClick={() => setStudentForm({ userId: student.user_id })} className={cn("w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group", studentForm.userId === student.user_id ? "bg-primary/10 border-primary/50 shadow-sm" : "hover:bg-accent/50 border-transparent bg-accent/20")}>
                        <div className="flex items-center gap-4">
                           <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm transition-colors", studentForm.userId === student.user_id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/40 text-primary")}>{(student.name || '?').split(' ').map((n: string) => n[0]).join('')}</div>
                           <div><p className="font-black text-sm group-hover:text-primary transition-colors">{student.name}</p><p className="text-[10px] font-bold opacity-40 mt-1 uppercase tracking-widest">{student.class_id ? classes?.find(c => c.id === student.class_id)?.name : t('classesManager.unassigned')}</p></div>
                        </div>
                        {studentForm.userId === student.user_id && <Check className="h-4 w-4 text-primary" />}
                     </button>
                   ))}
                </div>
             </ScrollArea>
          </div>
          <DialogFooter className="mt-10"><Button onClick={handleSaveStudent} className="w-full rounded-[1.5rem] h-18 font-black uppercase text-xs tracking-widest bg-primary shadow-xl hover:scale-[1.02] active:scale-95 transition-all">{t('classesManager.modals.confirmAllocation')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
