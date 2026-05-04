
import React, { useState } from 'react';
import { 
  Building, Plus, Trash2, Edit2, Search, ArrowLeft, MoreVertical, DoorOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom
} from '@/hooks/useApiData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Counter } from '@/components/ui/counter';

export default function RoomsManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: rooms = [] } = useRooms();
  const createMutation = useCreateRoom();
  const updateMutation = useUpdateRoom();
  const deleteMutation = useDeleteRoom();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: '', capacity: 30 });
  const [search, setSearch] = useState('');

  const handleSave = async () => {
    if (!form.name) return toast.error(t('common.required'));
    try {
      if (form.id) await updateMutation.mutateAsync(form);
      else await createMutation.mutateAsync(form);
      setIsModalOpen(false);
      setForm({ name: '', capacity: 30 });
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
              {t('resourcesManager.rooms.title')}
            </h1>
            <p className="text-muted-foreground text-sm font-medium">{t('resourcesManager.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('common.search')} className="h-10 pl-9 rounded-xl text-xs w-48 sm:w-64" value={search} onChange={e => setSearch(e.target.value)} />
           </div>
           <Button onClick={() => { setForm({ name: '', capacity: 30 }); setIsModalOpen(true); }} className="h-10 rounded-xl font-bold bg-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> {t('resourcesManager.rooms.add')}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map(room => (
          <Card key={room.id} className="group hover:border-primary/30 transition-all rounded-2xl shadow-sm bg-card/40 backdrop-blur-sm overflow-hidden">
             <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                   <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <DoorOpen className="h-4 w-4" />
                   </div>
                   <Popover>
                      <PopoverTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                         </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1 rounded-xl shadow-lg" align="end">
                         <Button variant="ghost" className="w-full justify-start rounded-lg text-xs h-8 px-3 font-medium" onClick={() => { setForm(room); setIsModalOpen(true); }}>
                            <Edit2 className="h-3 w-3 mr-2" /> {t('common.edit')}
                         </Button>
                         <Button variant="ghost" className="w-full justify-start rounded-lg text-xs h-8 px-3 font-medium text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutateAsync(room.id)}>
                            <Trash2 className="h-3 w-3 mr-2" /> {t('common.delete')}
                         </Button>
                      </PopoverContent>
                   </Popover>
                </div>
             </CardHeader>
             <CardContent className="px-5 pb-5">
                <h4 className="font-black text-lg leading-tight mb-1">{room.name}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0 border-emerald-500/20 bg-emerald-500/5 text-emerald-600">
                     {room.capacity} {t('resourcesManager.rooms.capacity')}
                  </Badge>
                </div>
             </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-8 border-border/50 shadow-2xl">
           <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-bold">{form.id ? t('resourcesManager.modals.editRoom') : t('resourcesManager.modals.addRoom')}</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
              <div className="space-y-2">
                 <Label className="text-xs font-bold text-muted-foreground uppercase">{t('resourcesManager.modals.roomName')}</Label>
                 <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-12 rounded-xl" placeholder="A-101" />
              </div>
              <div className="space-y-3 flex flex-col items-center">
                 <Label className="text-[10px] font-black tracking-widest text-muted-foreground uppercase self-start ml-2">{t('resourcesManager.modals.capacity')}</Label>
                 <Counter 
                    value={form.capacity} 
                    onChange={v => setForm({...form, capacity: v})} 
                    label="МЕСТ"
                    className="w-full h-14"
                 />
              </div>
           </div>
           <DialogFooter className="mt-8">
              <Button onClick={handleSave} className="w-full rounded-xl h-12 font-bold">{t('common.save')}</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
