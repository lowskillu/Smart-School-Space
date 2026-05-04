import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BentoCard } from "@/components/BentoCard";
import { Bell, Clock, Calculator, Save, Plus, Trash2, Settings2, CheckCircle2, ChevronLeft, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Counter } from "@/components/ui/counter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BigBreak {
  name: string;
  duration: number;
  afterPeriod: number;
}

interface BellConfig {
  totalPeriods: number;
  startTime: string;
  lessonDuration: number;
  standardBreakDuration: number;
  bigBreaks: BigBreak[];
}

interface BellSchedule {
  id: string;
  name: string;
  isActive: boolean;
  config: BellConfig;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

interface ComputedPeriod {
  period: number;
  start: string;
  end: string;
  type: "lesson" | "break";
  name?: string;
  duration: number;
}

function computeSchedule(config: BellConfig): ComputedPeriod[] {
  const result: ComputedPeriod[] = [];
  let current = timeToMinutes(config.startTime);

  for (let i = 1; i <= config.totalPeriods; i++) {
    // Add Lesson
    result.push({
      period: i,
      start: minutesToTime(current),
      end: minutesToTime(current + config.lessonDuration),
      type: "lesson",
      duration: config.lessonDuration,
    });
    current += config.lessonDuration;

    // Add Break if not the last lesson
    if (i < config.totalPeriods) {
      const bigBreak = config.bigBreaks.find(b => b.afterPeriod === i);
      const breakDuration = bigBreak ? bigBreak.duration : config.standardBreakDuration;
      const breakName = bigBreak ? bigBreak.name : "";

      result.push({
        period: i,
        start: minutesToTime(current),
        end: minutesToTime(current + breakDuration),
        type: "break",
        name: breakName,
        duration: breakDuration,
      });
      current += breakDuration;
    }
  }
  return result;
}

// 100% strictly 24h Time Picker component with keyboard support
const TimePicker24 = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
  const [h, m] = (value || "08:00").split(":");
  
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (val !== "" && parseInt(val) > 23) val = "23";
    onChange(`${val}:${m}`);
  };

  const handleHourBlur = () => {
    let val = h;
    if (val === "") val = "00";
    val = val.padStart(2, "0");
    onChange(`${val}:${m}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (val !== "" && parseInt(val) > 59) val = "59";
    onChange(`${h}:${val}`);
  };

  const handleMinuteBlur = () => {
    let val = m;
    if (val === "") val = "00";
    val = val.padStart(2, "0");
    onChange(`${h}:${val}`);
  };

  return (
    <div className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-muted/20 px-4 focus-within:ring-2 focus-within:ring-primary/40 transition-all border border-border/40">
      <input
        type="text"
        value={h}
        onChange={handleHourChange}
        onBlur={handleHourBlur}
        className="w-[50px] bg-transparent border-none text-center font-black text-2xl px-0 focus:outline-none focus:ring-0 shadow-none p-0"
        placeholder="00"
      />
      <span className="text-2xl font-black opacity-50 px-1 pb-1">:</span>
      <input
        type="text"
        value={m}
        onChange={handleMinuteChange}
        onBlur={handleMinuteBlur}
        className="w-[50px] bg-transparent border-none text-center font-black text-2xl px-0 focus:outline-none focus:ring-0 shadow-none p-0"
        placeholder="00"
      />
    </div>
  )
}

import { api } from "@/integrations/api/client";

export default function BellSetup() {
  const { t } = useTranslation();
  
  const [schedules, setSchedules] = useState<BellSchedule[]>([]);
  const [view, setView] = useState<"list" | "edit">("list");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [configName, setConfigName] = useState("Новое расписание");
  const [config, setConfig] = useState<BellConfig>({
    totalPeriods: 7,
    startTime: "08:00",
    lessonDuration: 40,
    standardBreakDuration: 5,
    bigBreaks: [
      { name: "Завтрак", duration: 15, afterPeriod: 2 },
      { name: "Обед", duration: 30, afterPeriod: 4 }
    ]
  });
  const [computed, setComputed] = useState<ComputedPeriod[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get<any>("/admin/settings");
      if (data.bell_schedule_config) {
        const parsed = JSON.parse(data.bell_schedule_config);
        if (Array.isArray(parsed)) {
          setSchedules(parsed);
        } else {
          // Migrate legacy object config to array
          const legacySchedule: BellSchedule = {
             id: "legacy_1",
             name: "Основное расписание",
             isActive: true,
             config: parsed
          };
          setSchedules([legacySchedule]);
          saveToBackend([legacySchedule], false);
        }
      }
    } catch (err) {
      console.error("Failed to load bell settings", err);
    }
  };

  const saveToBackend = async (newSchedules: BellSchedule[], showToast = true) => {
    setIsSaving(true);
    try {
      await api.post("/admin/settings", {
        bell_schedule_config: JSON.stringify(newSchedules)
      });
      if (showToast) toast.success(t("common.success") || "Saved successfully");
      setSchedules(newSchedules);
    } catch (err) {
      if (showToast) toast.error(t("common.error") || "Error saving data");
    } finally {
      setIsSaving(false);
    }
  };

  // List View Actions
  const handleCreateNew = () => {
    setEditingId(null);
    setConfigName("Новое расписание");
    setConfig({
      totalPeriods: 7,
      startTime: "08:00",
      endTime: "15:00",
      lessonDuration: 40,
      standardBreakDuration: 5,
      bigBreaks: []
    });
    setComputed([]);
    setView("edit");
  };

  const handleEdit = (schedule: BellSchedule) => {
    setEditingId(schedule.id);
    setConfigName(schedule.name);
    setConfig(schedule.config);
    setComputed(computeSchedule(schedule.config));
    setView("edit");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить это расписание?")) {
      const newArr = schedules.filter(s => s.id !== id);
      await saveToBackend(newArr);
    }
  };

  const handleSetActive = async (id: string) => {
    const newArr = schedules.map(s => ({
      ...s,
      isActive: s.id === id
    }));
    await saveToBackend(newArr);
  };

  // Editor Actions
  const handleCalculate = () => {
    const result = computeSchedule(config);
    setComputed(result);
    toast.success(t("bellSetup.calculated"));
  };

  const handleSaveEditor = async () => {
    // Re-calculate to ensure computed matches config
    handleCalculate();
    
    let newArr = [...schedules];
    if (editingId) {
      const idx = newArr.findIndex(s => s.id === editingId);
      if (idx !== -1) {
        newArr[idx] = {
          ...newArr[idx],
          name: configName,
          config: config
        };
      }
    } else {
      // Create new
      newArr.push({
        id: "schedule_" + Date.now(),
        name: configName,
        isActive: newArr.length === 0, // Auto active if it's the first
        config: config
      });
    }
    await saveToBackend(newArr);
    setView("list");
  };

  const addBigBreak = () => {
    setConfig({
      ...config,
      bigBreaks: [...config.bigBreaks, { name: "Новая перемена", duration: 20, afterPeriod: 1 }]
    });
  };

  const updateBigBreak = (index: number, field: keyof BigBreak, value: any) => {
    const newBreaks = [...config.bigBreaks];
    newBreaks[index] = { ...newBreaks[index], [field]: value };
    setConfig({ ...config, bigBreaks: newBreaks });
  };

  const removeBigBreak = (index: number) => {
    setConfig({
      ...config,
      bigBreaks: config.bigBreaks.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">{t("bellSetup.title")}</h1>
          <p className="text-muted-foreground font-medium">{t("bellSetup.subtitle")}</p>
        </div>
        
        {view === "list" ? (
          <Button onClick={handleCreateNew} className="h-12 rounded-2xl px-6 font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl shadow-primary/20">
            <Plus className="h-4 w-4" /> Добавить расписание
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setView("list")} className="h-12 rounded-2xl px-6 font-black uppercase text-[11px] tracking-widest gap-2">
            <ChevronLeft className="h-4 w-4" /> Назад к списку
          </Button>
        )}
      </div>

      {view === "list" && (
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <BentoCard className="flex flex-col items-center justify-center py-16 opacity-60">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-black text-xl">Нет сохраненных расписаний</h3>
              <p className="text-sm font-medium text-muted-foreground">Создайте свое первое расписание звонков</p>
            </BentoCard>
          ) : (
            schedules.map((schedule) => (
              <BentoCard key={schedule.id} className={cn("transition-all", schedule.isActive && "border-primary/50 ring-1 ring-primary/20")}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg", schedule.isActive ? "bg-primary text-primary-foreground shadow-primary/20" : "bg-muted text-muted-foreground")}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black tracking-tight uppercase">{schedule.name}</h3>
                        {schedule.isActive && <span className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Активно</span>}
                      </div>
                      <p className="text-xs font-bold text-muted-foreground opacity-70">
                        {schedule.config.totalPeriods} уроков • Начало в {schedule.config.startTime}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {!schedule.isActive && (
                      <Button variant="outline" size="sm" onClick={() => handleSetActive(schedule.id)} className="h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" /> Сделать активным
                      </Button>
                    )}
                    <Button variant="secondary" size="icon" onClick={() => handleEdit(schedule)} className="h-10 w-10 rounded-xl">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(schedule.id)} className="h-10 w-10 rounded-xl opacity-80 hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </BentoCard>
            ))
          )}
        </div>
      )}

      {view === "edit" && (
        <>
          <BentoCard title="Настройки шаблона" icon={<Settings2 className="h-5 w-5 text-primary" />}>
            <div className="mb-8">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Название расписания</Label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                className="h-14 mt-1 rounded-2xl bg-muted/20 border-none font-black text-xl px-6 focus:ring-primary/40 transition-all"
                placeholder="Например: Стандартный день"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2 mb-6">
               <div className="space-y-4 flex flex-col">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{t("bellSetup.startTime")}</Label>
                  <TimePicker24 value={config.startTime} onChange={(v) => setConfig({ ...config, startTime: v })} />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-2">
               <div className="space-y-4 flex flex-col items-center">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground self-start ml-2 mb-1">{t("bellSetup.totalPeriods")}</Label>
                  <Counter
                    value={config.totalPeriods}
                    onChange={(v) => setConfig({ ...config, totalPeriods: v })}
                    min={1}
                    max={15}
                    label={t("bellSetup.period").toUpperCase()}
                    className="w-full h-14"
                  />
               </div>

               <div className="space-y-4 flex flex-col items-center">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground self-start ml-2 mb-1">{t("bellSetup.lessonDuration")}</Label>
                  <Counter
                    value={config.lessonDuration}
                    onChange={(v) => setConfig({ ...config, lessonDuration: v })}
                    min={20}
                    max={90}
                    label={t("bellSetup.minutes").toUpperCase()}
                    className="w-full h-14"
                  />
               </div>

               <div className="space-y-4 flex flex-col items-center">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground self-start ml-2 mb-1">Длительность обычных перемен</Label>
                  <Counter
                    value={config.standardBreakDuration}
                    onChange={(v) => setConfig({ ...config, standardBreakDuration: v })}
                    min={0}
                    max={60}
                    label={t("bellSetup.minutes").toUpperCase()}
                    className="w-full h-14"
                  />
               </div>
            </div>

            <div className="mt-10 px-2">
               <div className="flex items-center justify-between mb-6">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Большие перемены</Label>
                  <Button variant="outline" size="sm" onClick={addBigBreak} className="rounded-xl h-9 text-[10px] font-bold uppercase tracking-widest">
                     <Plus className="h-3.5 w-3.5 mr-2" /> Добавить
                  </Button>
               </div>
               
               <div className="space-y-3">
                  {config.bigBreaks.map((bb, idx) => (
                     <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3 items-center bg-muted/10 p-3 rounded-2xl border border-border/40">
                        <Input 
                          value={bb.name} 
                          onChange={(e) => updateBigBreak(idx, "name", e.target.value)}
                          placeholder="Название (напр. Обед)"
                          className="h-12 bg-background border-none rounded-xl font-bold w-full"
                        />
                        <Select value={bb.afterPeriod.toString()} onValueChange={(v) => updateBigBreak(idx, "afterPeriod", parseInt(v))}>
                           <SelectTrigger className="w-full md:w-[160px] h-12 bg-background border-none rounded-xl font-bold text-xs uppercase tracking-tight">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="rounded-2xl">
                              {Array.from({length: Math.max(1, config.totalPeriods - 1)}).map((_, i) => (
                                 <SelectItem key={i+1} value={(i+1).toString()} className="font-bold text-xs">После {i+1} урока</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                        <div className="w-full md:w-[140px]">
                           <Counter
                             value={bb.duration}
                             onChange={(v) => updateBigBreak(idx, "duration", v)}
                             min={5}
                             max={120}
                             label="мин"
                             className="h-12 w-full"
                           />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeBigBreak(idx)} className="h-12 w-full md:w-12 rounded-xl text-destructive hover:bg-destructive/10">
                           <Trash2 className="h-5 w-5" />
                        </Button>
                     </div>
                  ))}
                  {config.bigBreaks.length === 0 && (
                     <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50 py-4">Нет больших перемен</p>
                  )}
               </div>
            </div>

            <div className="mt-10 px-2">
                <Button 
                    className="w-full h-16 rounded-[2rem] gap-3 font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all bg-primary text-primary-foreground" 
                    onClick={handleCalculate}
                >
                    <Calculator className="h-5 w-5" />
                    {t("bellSetup.calculate")}
                </Button>
            </div>
          </BentoCard>

          {computed.length > 0 && (
            <BentoCard title={t("bellSetup.generatedSchedule")} icon={<Clock className="h-5 w-5 text-primary" />}>
              <div className="space-y-3 mt-4">
                {computed.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between p-5 rounded-[2rem] transition-all",
                      item.type === "break" 
                      ? "bg-muted/10 border-dashed border border-border/40 opacity-80" 
                      : "bg-card/40 border border-border/40 shadow-sm hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-5">
                      <div className={cn(
                         "h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-black",
                         item.type === "lesson" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                      )}>
                        {item.type === "lesson" ? item.period : <Clock className="h-5 w-5 opacity-40" />}
                      </div>
                      <div>
                        <p className="text-lg font-black uppercase tracking-tight leading-none mb-1">
                          {item.type === "lesson" ? `${t("bellSetup.period")} ${item.period}` : item.name || t("bellSetup.breakTime")}
                        </p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                           {item.duration} {t("bellSetup.minutes")}
                        </p>
                      </div>
                    </div>
                    <div className="bg-background/50 px-5 py-3 rounded-2xl border border-border/40 shadow-inner">
                        <p className="text-lg font-black tracking-tighter text-primary">{item.start} — {item.end}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                className="mt-8 w-full h-16 rounded-[2rem] gap-3 font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                onClick={handleSaveEditor}
                disabled={isSaving}
              >
                <Save className="h-5 w-5" />
                {isSaving ? "..." : "Сохранить расписание в список"}
              </Button>
            </BentoCard>
          )}
        </>
      )}
    </div>
  );
}
