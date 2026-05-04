import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, 
  Plus, Trash2, Save, Info,
  Sun, Moon, Coffee, Palmtree,
  LayoutGrid, List, CalendarDays,
  ArrowRight, Sparkles, Check,
  X, Edit3, Calendar as CalendarIcon2,
  CalendarRange, Eye
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, addMonths, subMonths, 
  isWeekend, startOfYear, endOfYear, eachMonthOfInterval,
  addYears, subYears, setMonth, setYear, getMonth, getYear,
  isWithinInterval, parseISO, isAfter, startOfDay, addDays, subDays, differenceInDays
} from 'date-fns';
import { ru, enUS, kk, zhCN, es } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const locales: Record<string, any> = { ru, en: enUS, kk, zh: zhCN, es };

const PRESET_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Slate', value: '#64748b' },
];

interface CalendarEvent {
  id?: number;
  date: string;
  type: string;
  color?: string;
  description?: string;
}

interface EventGroup {
  id: string;
  description: string;
  startDate: string;
  endDate: string;
  color: string;
  type: string;
  dayCount: number;
}

export default function SchoolCalendar({ isAdmin = false }: { isAdmin?: boolean }) {
  const { t, i18n } = useTranslation();
  const currentLocale = locales[i18n.language] || locales.ru;
  const [viewMode, setViewMode] = useState<'month' | 'year'>(isAdmin ? 'year' : 'month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const academicYearStart = getMonth(currentDate) < 8 ? getYear(currentDate) - 1 : getYear(currentDate);
  const queryClient = useQueryClient();
  
  // States
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventType, setEventType] = useState<string>('holiday');
  const [eventColor, setEventColor] = useState<string>(PRESET_COLORS[4].value);
  const [description, setDescription] = useState('');
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<EventGroup | null>(null);
  
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rangeEnd, setRangeEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const startDate = viewMode === 'month' ? startOfMonth(currentDate) : startOfMonth(setMonth(setYear(new Date(), academicYearStart), 8));
  const endDate = viewMode === 'month' ? endOfMonth(currentDate) : endOfMonth(setMonth(setYear(new Date(), academicYearStart + 1), 7));

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['school_calendar', format(startDate, 'yyyy-MM'), viewMode],
    queryFn: () => api.get<CalendarEvent[]>(`/calendar?start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}`)
  });

  // Grouping logic for periods
  const eventGroups = useMemo(() => {
    if (events.length === 0) return [];
    
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    const groups: EventGroup[] = [];
    
    if (sorted.length === 0) return [];
    
    let currentGroup: EventGroup = {
      id: sorted[0].date,
      description: sorted[0].description || '',
      startDate: sorted[0].date,
      endDate: sorted[0].date,
      color: sorted[0].color || PRESET_COLORS[4].value,
      type: sorted[0].type,
      dayCount: 1
    };
    
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = parseISO(sorted[i-1].date);
      const currDate = parseISO(sorted[i].date);
      const diff = differenceInDays(currDate, prevDate);
      
      const isSameEvent = sorted[i].description === sorted[i-1].description && 
                          sorted[i].color === sorted[i-1].color;
      
      if (diff === 1 && isSameEvent) {
        currentGroup.endDate = sorted[i].date;
        currentGroup.dayCount++;
      } else {
        groups.push(currentGroup);
        currentGroup = {
          id: sorted[i].date,
          description: sorted[i].description || '',
          startDate: sorted[i].date,
          endDate: sorted[i].date,
          color: sorted[i].color || PRESET_COLORS[4].value,
          type: sorted[i].type,
          dayCount: 1
        };
      }
    }
    groups.push(currentGroup);
    
    return groups.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [events]);

  const batchMutation = useMutation({
    mutationFn: (data: any) => api.post('/calendar/batch', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school_calendar'] });
      queryClient.refetchQueries({ queryKey: ['school_calendar'] });
      setBatchDialogOpen(false);
      setViewDialogOpen(false);
      toast.success(t('common.success', 'Операция выполнена'));
    }
  });

  const handleEditGroup = (group: EventGroup) => {
    setRangeStart(group.startDate);
    setRangeEnd(group.endDate);
    setEventType(group.type);
    setEventColor(group.color);
    setDescription(group.description);
    setBatchDialogOpen(true);
    setViewDialogOpen(false);
  };

  const handleDeleteGroup = (group: EventGroup) => {
    const dates = eachDayOfInterval({
      start: parseISO(group.startDate),
      end: parseISO(group.endDate)
    }).map(d => format(d, 'yyyy-MM-dd'));

    batchMutation.mutate({
      dates,
      type: 'clear'
    });
  };

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const group = eventGroups.find(g => isWithinInterval(parseISO(dateStr), { start: parseISO(g.startDate), end: parseISO(g.endDate) }));
    
    if (group) {
      setViewingEvent(group);
      setViewDialogOpen(true);
    } else if (isAdmin) {
      setSelectedDate(date);
      setRangeStart(dateStr);
      setRangeEnd(dateStr);
      setEventType('holiday');
      setEventColor(PRESET_COLORS[3].value); // Green default for new
      setDescription('');
      setBatchDialogOpen(true);
    }
  };

  const handleBatchSave = () => {
    const dates = eachDayOfInterval({
      start: parseISO(rangeStart),
      end: parseISO(rangeEnd)
    }).map(d => format(d, 'yyyy-MM-dd'));

    batchMutation.mutate({
      dates,
      type: eventType,
      color: eventColor,
      description
    });
  };

  const renderMonth = (monthDate: Date, isSmall = false) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const startDay = (monthStart.getDay() + 6) % 7;
    const emptyDays = Array(startDay).fill(null);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <h4 className="font-black uppercase tracking-widest text-sm opacity-60">
             {format(monthDate, 'LLLL', { locale: currentLocale })}
           </h4>
        </div>
        <div className={cn("grid grid-cols-7", isSmall ? "gap-1.5" : "gap-3")}>
          {['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(d => (
            <div key={d} className="text-center text-[8px] font-black uppercase opacity-20">{d}</div>
          ))}
          {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
          {days.map((date, i) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const event = events.find(e => e.date === dateStr);
            const isToday = isSameDay(date, new Date());
            const isWE = isWeekend(date);

            return (
              <button
                key={i}
                onClick={() => handleDayClick(date)}
                style={{ 
                  backgroundColor: event?.color ? `${event.color}4D` : undefined,
                  borderColor: event?.color ? `${event.color}` : undefined,
                  color: event?.color ? (isToday ? '#fff' : event.color) : undefined,
                  borderWidth: event?.color ? '2px' : '1px'
                }}
                className={cn(
                  "relative rounded-xl flex flex-col items-center justify-center transition-all border overflow-hidden",
                  isSmall ? "h-11 text-[11px]" : "h-20 text-sm",
                  isToday && !event && "bg-primary text-primary-foreground shadow-lg border-primary z-10",
                  isToday && event && "ring-4 ring-primary ring-inset z-10",
                  isWE && !event && "opacity-30",
                  !event && !isToday && "bg-muted/5 border-border/60 dark:border-border/20",
                  "cursor-pointer active:scale-95 hover:scale-105"
                )}
              >
                <span className={cn("font-black mb-1", isSmall && "mb-0")}>{format(date, 'd')}</span>
                {event && !isSmall && (
                   <div className="px-1 w-full">
                      <p className="text-[7px] font-black uppercase tracking-tighter truncate opacity-80 text-center">
                        {event.description}
                      </p>
                   </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const months = useMemo(() => {
    if (viewMode === 'month') return [currentDate];
    return eachMonthOfInterval({ start: startDate, end: endDate });
  }, [viewMode, currentDate, startDate, endDate]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 space-y-6">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 bg-card/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-border/50 shadow-2xl">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                 <CalendarDays className="w-6 h-6 text-primary" />
              </div>
              <div>
                 <h2 className="text-xl font-black uppercase tracking-tighter">
                    {academicYearStart}-{academicYearStart + 1}
                 </h2>
                 <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">{t('calendar.academicYear', 'Учебный год')}</p>
              </div>
           </div>

           <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-2xl border border-border/20">
              <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')} className="rounded-xl font-bold uppercase text-[10px] px-4 h-10">
                <List className="w-3.5 h-3.5 mr-2" /> {t('calendar.viewMonth', 'Месяц')}
              </Button>
              <Button variant={viewMode === 'year' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('year')} className="rounded-xl font-bold uppercase text-[10px] px-4 h-10">
                <LayoutGrid className="w-3.5 h-3.5 mr-2" /> {t('calendar.viewYear', '12 Месяцев')}
              </Button>
           </div>

           <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subYears(currentDate, 1))} className="rounded-xl border-border/40 h-10 w-10">
                 <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="px-6 py-2 bg-muted/10 rounded-xl border border-border/20 font-black text-sm uppercase">
                 {format(currentDate, 'yyyy')}
              </div>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addYears(currentDate, 1))} className="rounded-xl border-border/40 h-10 w-10">
                 <ChevronRight className="w-5 h-5" />
              </Button>
           </div>

           {isAdmin && (
             <Button onClick={() => { setBatchDialogOpen(true); setRangeStart(format(new Date(), 'yyyy-MM-dd')); setRangeEnd(format(new Date(), 'yyyy-MM-dd')); setDescription(''); }} className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest bg-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
               <Sparkles className="w-4 h-4 mr-2" /> {t('calendar.addRange', 'Добавить период')}
             </Button>
           )}
        </div>

        <div className={cn("grid gap-6", viewMode === 'year' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
          {months.map((m, i) => (
             <Card key={i} className={cn("border-none shadow-2xl bg-card/40 backdrop-blur-md overflow-hidden", viewMode === 'month' ? "rounded-[3.5rem] p-10" : "rounded-[2.5rem] p-6")}>
               {renderMonth(m, viewMode === 'year')}
             </Card>
          ))}
        </div>
      </div>

      {/* Grouped Periods Sidebar */}
      <div className="w-full lg:w-96 space-y-6">
        <Card className="rounded-[2.5rem] border-none bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden sticky top-6">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
              <CalendarRange className="w-6 h-6 text-primary" />
              {t('calendar.periods', 'Список периодов')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-[700px] px-4">
              <div className="space-y-4">
                {eventGroups.length === 0 ? (
                  <div className="py-12 text-center opacity-20 italic text-sm">{t('calendar.noEvents', 'Событий нет')}</div>
                ) : (
                  eventGroups.map((group) => (
                    <div 
                      key={group.id} 
                      className="group p-5 rounded-[2rem] bg-muted/10 border border-border/20 hover:bg-muted/20 transition-all cursor-pointer"
                      onClick={() => { setViewingEvent(group); setViewDialogOpen(true); }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="rounded-lg font-black uppercase text-[8px] tracking-widest" style={{ backgroundColor: group.color, color: '#fff' }}>
                          {group.dayCount} {t('calendar.days', 'дней')}
                        </Badge>
                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); handleEditGroup(group); }}>
                              <Edit3 className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <h5 className="font-black text-base mb-1 tracking-tight truncate">{group.description}</h5>
                      <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest flex items-center gap-2">
                        {format(parseISO(group.startDate), 'd MMM', { locale: currentLocale })}
                        <ArrowRight className="w-3 h-3" />
                        {format(parseISO(group.endDate), 'd MMM', { locale: currentLocale })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* VIEW EVENT DIALOG */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[3.5rem] p-0 border-none shadow-3xl bg-card/95 backdrop-blur-2xl overflow-hidden">
          {viewingEvent && (
            <div className="flex flex-col h-full">
              <div className="p-12 space-y-8">
                 <div className="flex items-center justify-between">
                    <Badge className="h-10 px-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/10" style={{ backgroundColor: viewingEvent.color, color: '#fff' }}>
                       {viewingEvent.dayCount} {t('calendar.days', 'дней')}
                    </Badge>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase opacity-40 tracking-widest">
                       <CalendarIcon className="w-4 h-4" />
                       {format(parseISO(viewingEvent.startDate), 'd MMM', { locale: currentLocale })}
                       {viewingEvent.dayCount > 1 && (
                         <>
                           <ArrowRight className="w-3 h-3 mx-1" />
                           {format(parseISO(viewingEvent.endDate), 'd MMM', { locale: currentLocale })}
                         </>
                       )}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight text-foreground/90">
                       {viewingEvent.description}
                    </h2>
                    <div className="h-1.5 w-24 rounded-full" style={{ backgroundColor: viewingEvent.color }} />
                 </div>

                 <p className="text-sm font-medium opacity-60 leading-relaxed">
                   {t('calendar.eventDetailText', 'Это официальное событие в школьном календаре. Уроки в эти дни могут быть отменены или перенесены в соответствии с планом мероприятий.')}
                 </p>
              </div>

              {isAdmin && (
                <div className="p-8 bg-muted/20 border-t border-border/20 flex gap-4">
                  <Button variant="ghost" className="flex-1 rounded-2xl h-14 font-black uppercase text-xs hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteGroup(viewingEvent)}>
                    <Trash2 className="w-5 h-5 mr-2" /> {t('common.delete', 'Удалить')}
                  </Button>
                  <Button className="flex-[2] rounded-2xl h-14 font-black uppercase text-xs bg-primary shadow-2xl shadow-primary/40" onClick={() => handleEditGroup(viewingEvent)}>
                    <Edit3 className="w-5 h-5 mr-2" /> {t('common.edit', 'Редактировать')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unified Period Setup Dialog (Edit/Add) */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[3.5rem] p-10 border-none shadow-3xl bg-card/95 backdrop-blur-2xl">
          <DialogHeader className="mb-10 text-center">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-primary">
              {t('calendar.setupPeriod', 'Настройка периода')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40 ml-2">{t('calendar.startDate', 'Начало')}</label>
                <Input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="h-14 rounded-2xl border-border/40 bg-muted/20 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40 ml-2">{t('calendar.endDate', 'Конец')}</label>
                <Input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="h-14 rounded-2xl border-border/40 bg-muted/20 font-bold" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2">{t('calendar.type', 'Название события')}</label>
              <Input 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Напр: Осенние каникулы" 
                className="h-16 rounded-2xl border-border/40 bg-muted/20 font-black text-lg placeholder:font-bold"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2">{t('calendar.chooseColor', 'Выберите цвет')}</label>
              <div className="grid grid-cols-8 gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setEventColor(c.value)}
                    className={cn(
                      "w-full aspect-square rounded-full border-4 border-transparent transition-all hover:scale-110 flex items-center justify-center",
                      eventColor === c.value && "border-white/40 scale-125 shadow-lg shadow-black/20"
                    )}
                    style={{ backgroundColor: c.value }}
                  >
                    {eventColor === c.value && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-12">
             <Button 
              className="w-full rounded-[2rem] h-20 font-black uppercase text-sm tracking-widest bg-primary shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all" 
              onClick={handleBatchSave}
              disabled={batchMutation.isPending}
            >
              <Save className="w-6 h-6 mr-3" /> {t('common.save', 'Сохранить')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
