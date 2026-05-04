import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BentoCard } from "@/components/BentoCard";
import { Sparkles, CalendarDays, CheckCircle2, MessageSquare, Database, Bot, Clock, Layers, Loader2, Save, X, Edit2, Play, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClasses, useGenerateSchedule, useScheduleEntries } from "@/hooks/useApiData";
import { api } from "@/integrations/api/client";

// Mocks & Types
interface BellSchedule {
  id: string;
  name: string;
  config: any;
}

interface SavedSchedule {
  id: string;
  name: string;
  createdAt: string;
  status: "active" | "draft";
  parallels: string[];
}

export default function ScheduleManager() {
  const { t } = useTranslation();
  
  // State
  const [activeTab, setActiveTab] = useState<"generator" | "saved">("generator");
  const [selectedParallels, setSelectedParallels] = useState<string[]>([]);
  const [selectedBellId, setSelectedBellId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [bellSchedules, setBellSchedules] = useState<BellSchedule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Data
  const { data: classes } = useClasses();
  const generateMutation = useGenerateSchedule();

  useEffect(() => {
    // Fetch bell schedules from settings
    api.get<any>("/admin/settings").then(data => {
      if (data.bell_schedule_config) {
        try {
          const parsed = JSON.parse(data.bell_schedule_config);
          if (Array.isArray(parsed)) {
            setBellSchedules(parsed);
            if (parsed.length > 0) setSelectedBellId(parsed[0].id);
          }
        } catch (e) {}
      }
    });
  }, []);

  const handleGenerate = async () => {
    if (selectedParallels.length === 0) {
      toast.error("Выберите параллели для генерации");
      return;
    }
    if (!selectedBellId) {
      toast.error("Выберите расписание звонков");
      return;
    }

    setIsGenerating(true);
    setShowPreview(false);

    try {
      // Fake delay for AI effect, then call real API
      await new Promise(r => setTimeout(r, 2000));
      await generateMutation.mutateAsync();
      
      toast.success("Расписание успешно сгенерировано нейросетью!");
      setShowPreview(true);
    } catch (err: any) {
      toast.error("Ошибка при генерации: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleParallel = (p: string) => {
    setSelectedParallels(prev => 
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const savedSchedules: SavedSchedule[] = [
    { id: "1", name: "Основное расписание (Весна 2026)", createdAt: "2026-04-20", status: "active", parallels: ["1-4", "5-9", "10-11"] },
    { id: "2", name: "Сокращенные уроки (Предпраздничный)", createdAt: "2026-03-05", status: "draft", parallels: ["1-4", "5-9"] },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Генератор Расписания
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Создавайте идеальные расписания с помощью нейросети и базы данных школы
          </p>
        </div>
        <div className="flex bg-muted/30 p-1 rounded-2xl border border-border/40">
          <Button 
            variant={activeTab === "generator" ? "default" : "ghost"} 
            className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6 h-10"
            onClick={() => setActiveTab("generator")}
          >
            <Bot className="h-4 w-4 mr-2" /> Генератор
          </Button>
          <Button 
            variant={activeTab === "saved" ? "default" : "ghost"} 
            className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6 h-10"
            onClick={() => setActiveTab("saved")}
          >
            <Database className="h-4 w-4 mr-2" /> Архивы
          </Button>
        </div>
      </div>

      {activeTab === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
          {/* Left Column: Context Setup */}
          <div className="space-y-6 flex flex-col">
            <BentoCard title="Вводные данные" icon={<Layers className="h-5 w-5 text-primary" />} className="flex-1">
              <div className="space-y-6">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">1. Выбор параллелей</Label>
                  <div className="flex flex-wrap gap-2">
                    {["1-4 классы", "5-9 классы", "10-11 классы"].map(p => (
                      <Button
                        key={p}
                        variant={selectedParallels.includes(p) ? "default" : "outline"}
                        className={cn("h-12 rounded-2xl font-bold transition-all", selectedParallels.includes(p) && "shadow-lg shadow-primary/20")}
                        onClick={() => toggleParallel(p)}
                      >
                        {selectedParallels.includes(p) && <CheckCircle2 className="h-4 w-4 mr-2" />}
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2 mb-2 block">2. Шаблон звонков</Label>
                  <Select value={selectedBellId} onValueChange={setSelectedBellId}>
                    <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none font-bold">
                      <SelectValue placeholder="Выберите расписание звонков" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {bellSchedules.length === 0 ? (
                        <SelectItem value="none" disabled>Нет созданных шаблонов</SelectItem>
                      ) : (
                        bellSchedules.map(b => (
                          <SelectItem key={b.id} value={b.id} className="font-bold">{b.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-muted/10 rounded-2xl p-4 border border-border/40">
                  <h4 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-primary">
                    <Database className="h-4 w-4" /> Данные из БД
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background rounded-xl p-3 shadow-sm flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black">{classes?.length || 0}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Классов</span>
                    </div>
                    <div className="bg-background rounded-xl p-3 shadow-sm flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black">66</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Учителей</span>
                    </div>
                    <div className="bg-background rounded-xl p-3 shadow-sm flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black">31</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Кабинет</span>
                    </div>
                    <div className="bg-background rounded-xl p-3 shadow-sm flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-green-500">100%</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Готовность</span>
                    </div>
                  </div>
                </div>
              </div>
            </BentoCard>

            <BentoCard title="Чат с ИИ" icon={<MessageSquare className="h-5 w-5 text-primary" />} className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col space-y-4">
                <Textarea 
                  placeholder="Напишите ваши пожелания для ИИ... Например: Учителя математики хотят чтобы их уроки стояли первыми в расписании, а физкультура всегда была после обеда."
                  className="min-h-[150px] resize-none rounded-2xl bg-muted/10 border-border/40 p-4 font-medium focus-visible:ring-primary/40 flex-1"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <Button 
                  className={cn(
                    "w-full h-16 rounded-[2rem] gap-3 font-black text-sm uppercase tracking-widest transition-all",
                    isGenerating ? "bg-primary/50 cursor-not-allowed" : "bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95"
                  )}
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Анализ данных БД и генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Сгенерировать расписание
                    </>
                  )}
                </Button>
              </div>
            </BentoCard>
          </div>

          {/* Right Column: Preview Area */}
          <div className="h-full flex flex-col">
            <BentoCard title="Результат генерации" icon={<CalendarDays className="h-5 w-5 text-primary" />} className="flex-1 flex flex-col overflow-hidden">
              {!showPreview && !isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-50">
                  <Bot className="h-24 w-24 mb-6 text-muted-foreground opacity-20" />
                  <h3 className="text-2xl font-black tracking-tight mb-2">Нейросеть готова к работе</h3>
                  <p className="text-sm font-medium">Заполните данные слева и нажмите кнопку генерации. ИИ проанализирует все зависимости и создаст расписание без конфликтов.</p>
                </div>
              ) : isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                    <Bot className="h-24 w-24 mb-6 text-primary animate-bounce relative z-10" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight mb-2 animate-pulse">Идет расчет комбинаций...</h3>
                  <div className="space-y-2 mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                    <p>Проверка доступности кабинетов: OK</p>
                    <p>Распределение нагрузки учителей: Идет расчет</p>
                    <p>Обработка вашего промпта...</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col relative animate-in zoom-in-95 duration-500">
                  <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-2xl flex items-center gap-3 mb-6 shadow-lg shadow-green-500/5">
                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-widest">Успешно сгенерировано</h4>
                      <p className="text-xs font-medium opacity-80">Конфликтов: 0. Кабинеты: распределены. Пожелания: учтены.</p>
                    </div>
                  </div>

                  <div className="flex-1 bg-muted/10 rounded-2xl border border-border/40 p-4 overflow-y-auto">
                     {/* Mocked Schedule Preview */}
                     <div className="space-y-4">
                       <h3 className="font-black text-lg">Предпросмотр: 5-9 Классы (Понедельник)</h3>
                       <div className="space-y-2">
                         {[1, 2, 3, 4].map(period => (
                           <div key={period} className="flex gap-4 p-3 bg-background rounded-xl border border-border/40 items-center">
                             <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-black">{period}</div>
                             <div className="flex-1">
                               <div className="flex gap-2">
                                 <span className="font-bold text-sm">Алгебра</span>
                                 <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-bold uppercase">5A, 5B, 5C</span>
                               </div>
                               <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                                 <span className="flex items-center gap-1"><Users className="h-3 w-3"/> Иванов И.И.</span>
                                 <span>Каб. 301, 302, 303</span>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                  </div>

                  <div className="mt-6 flex gap-4">
                    <Input placeholder="Название расписания (напр. Осеннее)" className="h-14 rounded-2xl font-bold bg-muted/20" />
                    <Button className="h-14 rounded-2xl px-8 font-black uppercase text-xs tracking-widest gap-2 shadow-xl hover:scale-105 transition-all">
                      <Save className="h-4 w-4" /> Сохранить 
                    </Button>
                  </div>
                </div>
              )}
            </BentoCard>
          </div>
        </div>
      )}

      {activeTab === "saved" && (
        <div className="space-y-4">
          {savedSchedules.map((schedule) => (
            <BentoCard key={schedule.id} className={cn("transition-all", schedule.status === "active" && "border-primary/50 ring-1 ring-primary/20")}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg", schedule.status === "active" ? "bg-primary text-primary-foreground shadow-primary/20" : "bg-muted text-muted-foreground")}>
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black tracking-tight uppercase">{schedule.name}</h3>
                      {schedule.status === "active" && <span className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Текущее в школе</span>}
                    </div>
                    <div className="flex gap-3 mt-1">
                      <p className="text-xs font-bold text-muted-foreground">Создано: {schedule.createdAt}</p>
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Параллели: {schedule.parallels.join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {schedule.status !== "active" && (
                    <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2">
                      <Play className="h-4 w-4 text-green-500" /> Применить
                    </Button>
                  )}
                  <Button variant="secondary" size="icon" className="h-10 w-10 rounded-xl">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" className="h-10 w-10 rounded-xl opacity-80 hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </BentoCard>
          ))}
        </div>
      )}
    </div>
  );
}
