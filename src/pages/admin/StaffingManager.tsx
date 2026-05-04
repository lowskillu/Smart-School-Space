
import React, { useState } from 'react';
import { 
  UserCheck, Search, ArrowLeft, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  useSubjects, useTeachers, useUpdateTeacher
} from '@/hooks/useApiData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function StaffingManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  const updateTeacherMutation = useUpdateTeacher();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ teacherId: '', subjectIds: [] });
  const [search, setSearch] = useState('');

  const handleSave = async () => {
    if (!form.teacherId) return toast.error(t('common.required'));
    try {
      await updateTeacherMutation.mutateAsync({
        id: form.teacherId,
        subjectIds: form.subjectIds
      });
      setIsModalOpen(false);
      toast.success(t('common.success'));
    } catch (err) { toast.error(t('common.error')); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/admin')} className="h-10 w-10 rounded-xl">
             <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t('resourcesManager.tabs.staffing')}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">{t('resourcesManager.subtitle')}</p>
          </div>
        </div>
        <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input placeholder={t('common.search')} className="h-10 pl-9 rounded-xl text-xs w-48 sm:w-64" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="rounded-2xl border-border/50 bg-card/40 backdrop-blur-md overflow-hidden">
        <Table>
          <TableHeader className="bg-accent/50">
            <TableRow>
              <TableHead className="px-8 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/80">{t('resourcesManager.table.identity')}</TableHead>
              <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/80">{t('resourcesManager.table.subjects')}</TableHead>
              <TableHead className="text-right px-8 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/80">{t('resourcesManager.table.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).map(teacher => (
              <TableRow key={teacher.id} className="hover:bg-accent/30 transition-colors border-border/30 last:border-0">
                <TableCell className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-background border flex items-center justify-center font-bold text-xs text-primary shadow-sm">
                      {teacher.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{teacher.name}</p>
                      <p className="text-[10px] text-muted-foreground">{teacher.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-md">
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.teacher_subjects?.length ? teacher.teacher_subjects.map((ts: any) => (
                      <Badge key={ts.id} variant="secondary" className="text-[9px] font-bold bg-primary/5 text-primary border-primary/20 px-2 rounded-md">
                        {subjects.find(s => s.id === ts.subject_id)?.name}
                      </Badge>
                    )) : (
                      <span className="text-[10px] text-muted-foreground italic">{t('resourcesManager.subjects.noTeacher')}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right px-8">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl h-8 px-4 font-bold text-[10px] tracking-wide"
                    onClick={() => {
                      setForm({
                        teacherId: teacher.id,
                        subjectIds: teacher.teacher_subjects?.map((ts: any) => ts.subject_id) || []
                      });
                      setIsModalOpen(true);
                    }}
                  >
                    {t('resourcesManager.modals.assignTeacher')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-10 border-border/50 shadow-2xl bg-card">
           <DialogHeader className="mb-8 text-center border-b pb-6">
              <DialogTitle className="text-2xl font-bold">{t('resourcesManager.modals.assignTeacher')}</DialogTitle>
              <DialogDescription className="font-medium">{teachers.find(t => t.id === form.teacherId)?.name}</DialogDescription>
           </DialogHeader>
           <div className="space-y-6">
              <div className="space-y-3">
                 <Label className="text-xs font-bold text-muted-foreground uppercase px-1">{t('resourcesManager.tabs.subjects')}</Label>
                 <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-2xl scrollbar-thin">
                    {subjects.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          const exists = form.subjectIds.includes(s.id);
                          const next = exists 
                            ? form.subjectIds.filter((id: string) => id !== s.id) 
                            : [...form.subjectIds, s.id];
                          setForm({...form, subjectIds: next});
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all text-left",
                          form.subjectIds.includes(s.id) 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "hover:bg-accent border-transparent bg-accent/20"
                        )}
                      >
                         {s.name}
                         {form.subjectIds.includes(s.id) && <Check className="h-3 w-3" />}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
           <DialogFooter className="mt-10">
              <Button onClick={handleSave} className="w-full rounded-[1.25rem] h-14 font-black shadow-lg shadow-primary/20">{t('common.save')}</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
