import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Copy, Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, Save, Trash2, 
  Check, AlertCircle, Loader2, Sparkles, Utensils,
  ArrowRight, Search, Clock, Minus
} from 'lucide-react';
import { format, addDays, addMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ru, enUS, kk, zhCN, es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/integrations/api/client';
import { useFoodItems, useCreateFoodItem } from '@/hooks/useApiData';
import { Counter } from '@/components/ui/counter';
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

const locales: Record<string, any> = { ru, en: enUS, kk, zh: zhCN, es };

interface MenuEntry {
  id?: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  name: string;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  food_item_id?: string;
  start_time?: string;
  end_time?: string;
}

const TimeInput = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) => {
  const [hh, mm] = (value || '00:00').split(':');
  
  const update = (newH: string, newM: string) => {
    let h = parseInt(newH) || 0;
    let m = parseInt(newM) || 0;
    if (h > 23) h = 0; if (h < 0) h = 23;
    if (m > 59) m = 0; if (m < 0) m = 59;
    onChange(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  };

  return (
    <div className="flex flex-col gap-4 items-center">
      <span className="text-[10px] font-black uppercase opacity-40 text-center tracking-[0.2em]">{label}</span>
      <div className="flex items-center gap-2">
        {/* Hours */}
        <div className="flex flex-col gap-1 items-center">
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-primary/20" onClick={() => update((parseInt(hh)+1).toString(), mm)}>
            <Plus className="w-3 h-3" />
          </Button>
          <input 
            type="number" 
            value={hh} 
            onChange={(e) => update(e.target.value, mm)}
            className="w-12 h-12 bg-muted/20 border border-border/40 rounded-xl text-center font-black text-xl focus:ring-2 focus:ring-primary/30 transition-all focus:outline-none"
          />
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-primary/20" onClick={() => update((parseInt(hh)-1).toString(), mm)}>
            <Minus className="w-3 h-3" />
          </Button>
        </div>

        <span className="font-black opacity-30 text-2xl mb-6">:</span>

        {/* Minutes */}
        <div className="flex flex-col gap-1 items-center">
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-primary/20" onClick={() => update(hh, (parseInt(mm)+5).toString())}>
            <Plus className="w-3 h-3" />
          </Button>
          <input 
            type="number" 
            value={mm} 
            onChange={(e) => update(hh, e.target.value)}
            className="w-12 h-12 bg-muted/20 border border-border/40 rounded-xl text-center font-black text-xl focus:ring-2 focus:ring-primary/30 transition-all focus:outline-none"
          />
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-primary/20" onClick={() => update(hh, (parseInt(mm)-5).toString())}>
            <Minus className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

export default function CanteenManager() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0];
  const currentLocale = locales[lang] || enUS;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<{from: Date, to: Date}>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 })
  });
  const [menuEntries, setMenuEntries] = useState<MenuEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [targetMealType, setTargetMealType] = useState<typeof MEAL_TYPES[number] | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  
  const [applyRangeOpen, setApplyRangeOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), 1),
    to: addDays(new Date(), 30),
  });

  const { data: libraryItems = [] } = useFoodItems('canteen');
  const createFoodItem = useCreateFoodItem();

  // Week Interval
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 4) });

  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [editingMealTime, setEditingMealTime] = useState<{mealType: string, start: string, end: string} | null>(null);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [applyTimeToAllDays, setApplyTimeToAllDays] = useState(false);

  useEffect(() => {
    setDateRange({
      from: startOfWeek(currentDate, { weekStartsOn: 1 }),
      to: endOfWeek(currentDate, { weekStartsOn: 1 })
    });
  }, [currentDate]);

  useEffect(() => {
    fetchMenu();
  }, [dateRange]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const start = format(dateRange.from, 'yyyy-MM-dd');
      const end = format(dateRange.to, 'yyyy-MM-dd');
      const response = await api.get<MenuEntry[]>(`/meals/canteen/menu?start_date=${start}&end_date=${end}`);
      setMenuEntries(response || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDish = (mealType: typeof MEAL_TYPES[number]) => {
    setTargetMealType(mealType);
    setLibraryOpen(true);
  };

  const addFromLibrary = (item: any) => {
    if (!targetMealType) return;
    
    const newEntry: MenuEntry = {
      date: format(selectedDay, 'yyyy-MM-dd'),
      meal_type: targetMealType,
      name: item.name,
      calories: item.calories || 0,
      proteins: item.proteins || 0,
      fats: item.fats || 0,
      carbs: item.carbs || 0,
      food_item_id: item.id
    };
    
    setMenuEntries([...menuEntries, newEntry]);
    handleUpdateEntry(newEntry);
    setLibraryOpen(false);
  };

  const handleCreateManual = (mealType: typeof MEAL_TYPES[number]) => {
    const existingForDay = menuEntries.find(e => e.meal_type === mealType && e.date === format(selectedDay, 'yyyy-MM-dd'));
    
    const newEntry: MenuEntry = {
      date: format(selectedDay, 'yyyy-MM-dd'),
      meal_type: mealType,
      name: '',
      calories: 0,
      proteins: 0,
      fats: 0,
      carbs: 0,
      start_time: existingForDay?.start_time || '',
      end_time: existingForDay?.end_time || ''
    };
    setMenuEntries([...menuEntries, newEntry]);
  };

  const handleUpdateTimeCategory = async (mealType: string, startTime: string, endTime: string, allDays = false) => {
    const dayStr = format(selectedDay, 'yyyy-MM-dd');
    const itemsToUpdate = allDays 
      ? menuEntries.filter(e => e.meal_type === mealType)
      : menuEntries.filter(e => e.meal_type === mealType && e.date === dayStr);
    
    const newEntries = menuEntries.map(e => {
      const match = allDays ? e.meal_type === mealType : (e.meal_type === mealType && e.date === dayStr);
      if (match) {
        return { ...e, start_time: startTime, end_time: endTime };
      }
      return e;
    });
    setMenuEntries(newEntries);

    try {
      setLoading(true);
      
      // If allDays is checked, update the global schedule for this meal type
      if (allDays) {
        await api.post('/meals/canteen/times', {
          meal_type: mealType,
          start_time: startTime,
          end_time: endTime
        });
      }

      for (const item of itemsToUpdate) {
        await handleUpdateEntry({ ...item, start_time: startTime, end_time: endTime }, true);
      }
      toast.success(t('common.success'));
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEntry = async (entry: MenuEntry, silent = false) => {
    if (!entry.name) return;
    try {
      if (!silent) setLoading(true);
      const updated = await api.post<MenuEntry>('/meals/canteen/menu', entry);
      setMenuEntries(prev => prev.map(e => {
        if (e === entry || (e.id && e.id === updated.id)) {
           return updated;
        }
        return e;
      }));
      if (!silent) toast.success(t('common.success'));
    } catch (err) {
      if (!silent) toast.error(t('common.error'));
      console.error("Failed to update entry:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCascadingUpdate = async (entry: MenuEntry) => {
    if (!entry.id) return;
    try {
      setLoading(true);
      await api.post('/meals/canteen/cascading-update', {
        entry_id: entry.id,
        target_end_date: format(addMonths(new Date(), 2), 'yyyy-MM-dd') // Default to 2 months ahead
      });
      toast.success(t('canteenAdmin.cascadingSuccess', 'Applied to all future same weekdays!'));
      fetchMenu();
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await api.delete(`/meals/canteen/menu/${id}`);
      setMenuEntries(prev => prev.filter(e => e.id !== id));
      toast.success(t('common.deleted'));
    } catch (err) {
      toast.error(t('common.error'));
    }
  };

  const handleCopyDay = async (targetDateStr: string) => {
    try {
      await api.post('/meals/canteen/copy-day', {
        source_date: format(selectedDay, 'yyyy-MM-dd'),
        target_date: targetDateStr
      });
      toast.success(t('canteenAdmin.copySuccess'));
      fetchMenu();
    } catch (err) {
      toast.error(t('common.error'));
    }
  };

  const handleApplyRange = async () => {
    if (!selectedRange?.from || !selectedRange?.to) {
      toast.error(t('common.selectDate'));
      return;
    }

    try {
      setLoading(true);
      await api.post('/meals/canteen/apply-range', {
        source_start_date: format(weekStart, 'yyyy-MM-dd'),
        target_start_date: format(selectedRange.from, 'yyyy-MM-dd'),
        target_end_date: format(selectedRange.to, 'yyyy-MM-dd')
      });
      toast.success(t('canteenAdmin.periodApplySuccess'));
      setApplyRangeOpen(false);
      fetchMenu();
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToLibrary = async (item: MenuEntry) => {
    if (!item.name) return;
    try {
      await createFoodItem.mutateAsync({
        name: item.name,
        calories: item.calories,
        proteins: item.proteins,
        fats: item.fats,
        carbs: item.carbs,
        type: 'canteen',
        price: '0'
      });
      toast.success(t('canteenAdmin.saveToLibrarySuccess', 'Saved to library!'));
    } catch (err) {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 backdrop-blur-xl border border-border/40 rounded-[2rem] p-8 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
             <Utensils className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter uppercase">{t('canteenAdmin.menuManagement')}</h2>
            <div className="flex items-center gap-2 text-muted-foreground font-black text-[10px] uppercase tracking-widest opacity-60">
               <CalendarIcon className="w-4 h-4" />
               <span>{format(weekStart, 'dd.MM')} — {format(addDays(weekStart, 4), 'dd.MM')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/20 rounded-xl p-1 border border-border/40">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Days */}
      <div className="flex overflow-x-auto gap-3 pb-4 -mx-1 px-1 no-scrollbar">
        {days.map((day) => {
          const isActive = isSameDay(day, selectedDay);
          return (
            <button
              key={day.toString()}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-w-[120px] p-6 rounded-3xl border transition-all duration-500 flex flex-col items-center gap-2 group relative overflow-hidden ${
                isActive 
                ? 'bg-primary border-primary text-primary-foreground premium-glow-active scale-[1.08] z-10 ring-4 ring-primary/20' 
                : 'bg-card/40 hover:bg-muted/50 border-border/40'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              )}
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {format(day, 'eee', { locale: currentLocale })}
              </span>
              <span className="text-3xl font-black tracking-tight">{format(day, 'dd')}</span>
            </button>
          );
        })}
      </div>

      {/* Action Buttons & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest bg-card border border-border/40 hover:bg-primary/5 transition-all gap-2">
                <Copy className="w-4 h-4 text-primary" />
                {t('canteenAdmin.copyDay')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[3rem] p-10 border-none shadow-3xl overflow-hidden">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">{t('canteenAdmin.selectTargetDay')}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-4 gap-3">
                {days.map(day => (
                  <Button 
                    key={day.toString()}
                    variant={isSameDay(day, selectedDay) ? "secondary" : "outline"}
                    disabled={isSameDay(day, selectedDay)}
                    onClick={() => handleCopyDay(format(day, 'yyyy-MM-dd'))}
                    className="rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95"
                  >
                    {format(day, 'eee', { locale: currentLocale })}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={applyRangeOpen} onOpenChange={setApplyRangeOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest bg-primary shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all gap-2">
                <Sparkles className="w-4 h-4" />
                {t('canteenAdmin.applyToPeriod')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl rounded-[3rem] p-10 border-none shadow-3xl overflow-hidden">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                  {t('canteenAdmin.applyToPeriod')}
                </DialogTitle>
                <p className="text-muted-foreground text-sm font-medium">
                  {t('canteenAdmin.designWeekTemplate')}
                </p>
              </DialogHeader>

              <div className="flex flex-col items-center gap-6">
                <div className="p-4 bg-muted/20 rounded-[2rem] border border-border/40 shadow-inner">
                  <Calendar
                    mode="range"
                    selected={selectedRange}
                    onSelect={setSelectedRange}
                    className="rounded-md"
                    initialFocus
                  />
                </div>

                <div className="grid grid-cols-2 w-full gap-4">
                  <div className="bg-muted/10 p-4 rounded-2xl border border-border/20 text-center">
                    <span className="text-[10px] font-black uppercase opacity-50 block mb-1">{t('canteenAdmin.startDate')}</span>
                    <span className="font-bold">{selectedRange?.from ? format(selectedRange.from, 'dd.MM.yyyy') : '...'}</span>
                  </div>
                  <div className="bg-muted/10 p-4 rounded-2xl border border-border/20 text-center">
                    <span className="text-[10px] font-black uppercase opacity-50 block mb-1">{t('canteenAdmin.endDate')}</span>
                    <span className="font-bold">{selectedRange?.to ? format(selectedRange.to, 'dd.MM.yyyy') : '...'}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-8">
                <Button 
                  onClick={handleApplyRange} 
                  disabled={loading || !selectedRange?.from || !selectedRange?.to}
                  className="w-full rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest bg-primary shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all gap-2"
                >
                  {loading ? '...' : t('canteenAdmin.confirmCopy')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Nutrition Summary */}
        <div className="flex items-center gap-6 bg-primary/5 px-8 py-3 rounded-2xl border border-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]">
          {[
            { label: 'ккал', value: menuEntries.filter(e => e.date === format(selectedDay, 'yyyy-MM-dd')).reduce((acc, curr) => acc + curr.calories, 0), color: 'text-primary' },
            { label: 'Б', value: Math.round(menuEntries.filter(e => e.date === format(selectedDay, 'yyyy-MM-dd')).reduce((acc, curr) => acc + curr.proteins, 0)), color: 'text-emerald-500' },
            { label: 'Ж', value: Math.round(menuEntries.filter(e => e.date === format(selectedDay, 'yyyy-MM-dd')).reduce((acc, curr) => acc + curr.fats, 0)), color: 'text-orange-500' },
            { label: 'У', value: Math.round(menuEntries.filter(e => e.date === format(selectedDay, 'yyyy-MM-dd')).reduce((acc, curr) => acc + curr.carbs, 0)), color: 'text-blue-500' },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className={`text-lg font-black ${stat.color} drop-shadow-sm`}>{stat.value}</span>
              <span className="text-[8px] font-black uppercase opacity-50">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Library Dialog */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[3rem] p-10 border-none shadow-3xl overflow-hidden max-h-[80vh] flex flex-col">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              <Utensils className="w-6 h-6 text-primary" />
              {t('canteenAdmin.dishLibrary', 'Библиотека блюд')}
            </DialogTitle>
            <p className="text-muted-foreground text-sm font-medium">Выберите готовое блюдо или создайте новое вручную.</p>
          </DialogHeader>
          
          <div className="mb-6 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder={t('common.search', 'Поиск блюда...')} 
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-muted/20 border-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {libraryItems.filter((i: any) => i.name.toLowerCase().includes(librarySearch.toLowerCase())).length > 0 ? (
                libraryItems
                  .filter((i: any) => i.name.toLowerCase().includes(librarySearch.toLowerCase()))
                  .map((item: any) => (
                  <button 
                    key={item.id}
                    onClick={() => addFromLibrary(item)}
                    className="p-5 rounded-3xl bg-muted/20 border border-border/40 text-left hover:bg-primary/5 hover:border-primary/30 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-all">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="font-black text-sm group-hover:text-primary transition-colors">{item.name}</h4>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 opacity-60 text-[9px] font-bold uppercase tracking-wider">
                      <span className="text-primary">{item.calories} ккал</span>
                      <span className="text-emerald-500">Б: {item.proteins}г</span>
                      <span className="text-orange-500">Ж: {item.fats}г</span>
                      <span className="text-blue-500">У: {item.carbs}г</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground opacity-50">
                   Библиотека пуста.
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="mt-8 pt-6 border-t border-border/40">
            <Button 
              variant="outline" 
              onClick={() => {
                if (targetMealType) handleCreateManual(targetMealType);
                setLibraryOpen(false);
              }}
              className="w-full rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('canteenAdmin.createManual', 'Создать вручную')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Area - Meal Cards */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Processing Space Menu...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-32">
          {MEAL_TYPES.map(mealType => (
            <Card key={mealType} className="rounded-[2.5rem] border border-border/40 shadow-xl overflow-hidden bg-card/40 backdrop-blur-3xl">
              <CardHeader className="p-8 border-b border-border/40 flex flex-row items-center justify-between bg-muted/5 gap-4">
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                    {t(`canteenAdmin.${mealType}`)}
                  </CardTitle>
                  <button 
                    onClick={() => {
                      const entry = menuEntries.find(e => e.meal_type === mealType && e.date === format(selectedDay, 'yyyy-MM-dd'));
                      setEditingMealTime({
                        mealType,
                        start: entry?.start_time || '00:00',
                        end: entry?.end_time || '00:00'
                      });
                      setTimeDialogOpen(true);
                    }}
                    className="flex items-center gap-2 bg-muted/20 hover:bg-primary/10 px-3 py-1.5 rounded-xl border border-border/40 transition-all group"
                  >
                    <Clock className="w-3.5 h-3.5 text-primary opacity-60 group-hover:opacity-100" />
                    <span className="text-[10px] font-black tracking-widest text-muted-foreground group-hover:text-primary">
                      {menuEntries.find(e => e.meal_type === mealType && e.date === format(selectedDay, 'yyyy-MM-dd'))?.start_time || '00:00'} - {menuEntries.find(e => e.meal_type === mealType && e.date === format(selectedDay, 'yyyy-MM-dd'))?.end_time || '00:00'}
                    </span>
                  </button>
                </div>
                <Button onClick={() => handleAddDish(mealType)} size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all">
                  <Plus className="w-5 h-5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {menuEntries
                    .filter(e => e.meal_type === mealType && e.date === format(selectedDay, 'yyyy-MM-dd'))
                    .map((item, idx) => (
                      <div key={item.id || idx} className="p-8 group hover:bg-muted/5 transition-all">
                        <div className="flex flex-col gap-6">
                          <div className="flex items-center gap-4">
                            <Input 
                              value={item.name} 
                              onChange={e => {
                                const newEntries = [...menuEntries];
                                const target = newEntries.find(entry => entry === item);
                                if (target) target.name = e.target.value;
                                setMenuEntries(newEntries);
                              }}
                              onBlur={() => handleUpdateEntry(item)}
                              placeholder={t('canteenAdmin.dishName')}
                              className="h-12 rounded-xl border-none bg-muted/20 focus:ring-2 focus:ring-primary/30 font-black text-lg px-6"
                            />
                            <div className="flex flex-col items-center">
                               <Counter 
                                 value={item.calories} 
                                 onChange={v => {
                                     const newEntries = [...menuEntries];
                                     const target = newEntries.find(entry => entry === item);
                                     if (target) target.calories = v;
                                     setMenuEntries(newEntries);
                                     handleUpdateEntry(target!);
                                 }}
                                 max={5000}
                                 label="ккал"
                                 className="h-12"
                               />
                            </div>
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                {item.id && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-orange-500 bg-orange-500/10 rounded-xl hover:bg-orange-500 hover:text-white transition-all"
                                    onClick={() => handleCascadingUpdate(item)}
                                    title={t('canteenAdmin.applyToFutureDays', 'Apply to all future same weekdays')}
                                  >
                                    <Sparkles className="w-4 h-4" />
                                  </Button>
                                )}
                                {!item.food_item_id && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-primary bg-primary/10 rounded-xl hover:bg-primary hover:text-primary-foreground shadow-lg shadow-primary/20 transition-all scale-110"
                                    onClick={() => handleSaveToLibrary(item)}
                                    title={t('canteenAdmin.saveToLibrary')}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 text-destructive bg-destructive/5 rounded-xl hover:bg-destructive hover:text-white"
                                  onClick={() => item.id && handleDeleteEntry(item.id)}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </Button>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                             <div className="flex flex-col gap-2 bg-muted/10 p-3 rounded-2xl border border-border/20">
                                <span className="text-[9px] font-black uppercase text-muted-foreground px-2 opacity-60">Белки (г)</span>
                                <Counter 
                                    value={Math.round(item.proteins)} 
                                    onChange={v => {
                                        const newEntries = [...menuEntries];
                                        const target = newEntries.find(entry => entry === item);
                                        if (target) target.proteins = v;
                                        setMenuEntries(newEntries);
                                        handleUpdateEntry(target!);
                                    }}
                                    className="h-10 w-full"
                                />
                             </div>
                             <div className="flex flex-col gap-2 bg-muted/10 p-3 rounded-2xl border border-border/20">
                                <span className="text-[9px] font-black uppercase text-muted-foreground px-2 opacity-60">Жиры (г)</span>
                                <Counter 
                                    value={Math.round(item.fats)} 
                                    onChange={v => {
                                        const newEntries = [...menuEntries];
                                        const target = newEntries.find(entry => entry === item);
                                        if (target) target.fats = v;
                                        setMenuEntries(newEntries);
                                        handleUpdateEntry(target!);
                                    }}
                                    className="h-10 w-full"
                                />
                             </div>
                             <div className="flex flex-col gap-2 bg-muted/10 p-3 rounded-2xl border border-border/20">
                                <span className="text-[9px] font-black uppercase text-muted-foreground px-2 opacity-60">Угл (г)</span>
                                <Counter 
                                    value={Math.round(item.carbs)} 
                                    onChange={v => {
                                        const newEntries = [...menuEntries];
                                        const target = newEntries.find(entry => entry === item);
                                        if (target) target.carbs = v;
                                        setMenuEntries(newEntries);
                                        handleUpdateEntry(target!);
                                    }}
                                    className="h-10 w-full"
                                />
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                   {menuEntries.filter(e => e.meal_type === mealType && e.date === format(selectedDay, 'yyyy-MM-dd')).length === 0 && (
                     <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-muted/10 flex items-center justify-center opacity-20">
                           <AlertCircle className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{t('canteenAdmin.menuNotConfigured')}</span>
                     </div>
                   )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Unified TimePicker Dialog */}
      <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-[3rem] p-10 border-none shadow-3xl bg-card/95 backdrop-blur-2xl">
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-primary">
              {editingMealTime ? t(`canteenAdmin.${editingMealTime.mealType}`) : ''}
            </DialogTitle>
            <p className="text-[10px] font-black uppercase opacity-40 tracking-[0.3em] mt-2">
              {t('canteenAdmin.setMealSchedule')}
            </p>
          </DialogHeader>
          
          {editingMealTime && (
            <div className="flex items-center justify-between gap-6 px-4">
              <TimeInput 
                label="Start"
                value={editingMealTime.start}
                onChange={(val) => setEditingMealTime({...editingMealTime, start: val})}
              />
              <div className="mt-6 flex flex-col items-center">
                <ArrowRight className="w-6 h-6 text-primary opacity-20 animate-pulse" />
              </div>
              <TimeInput 
                label="End"
                value={editingMealTime.end}
                onChange={(val) => setEditingMealTime({...editingMealTime, end: val})}
              />
            </div>
          )}

            <div className="flex items-center gap-2 mt-8 px-4 py-3 bg-muted/10 rounded-2xl border border-border/20 cursor-pointer hover:bg-muted/20 transition-all" onClick={() => setApplyTimeToAllDays(!applyTimeToAllDays)}>
               <div className={`h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center ${applyTimeToAllDays ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                 {applyTimeToAllDays && <Check className="w-3 h-3 text-primary-foreground stroke-[4]" />}
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                 {t('canteenAdmin.applyTimeToAllDays', 'Применить ко всем дням недели')}
               </span>
            </div>

            <DialogFooter className="mt-8">
              <Button 
                className="w-full rounded-2xl h-16 font-black uppercase text-xs tracking-[0.2em] bg-primary shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all" 
                onClick={() => {
                  if (editingMealTime) {
                    handleUpdateTimeCategory(editingMealTime.mealType, editingMealTime.start, editingMealTime.end, applyTimeToAllDays);
                  }
                  setTimeDialogOpen(false);
                  setApplyTimeToAllDays(false);
                }}
              >
                 {t('common.save', 'OK')}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
