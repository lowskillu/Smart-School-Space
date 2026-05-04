import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Coffee, Loader2, ArrowLeft, Clock, Utensils } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { Badge } from "@/components/ui/badge";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useCanteenMenu } from "@/hooks/useApiData";
import { ru, enUS, kk, zhCN, es } from 'date-fns/locale';

const locales: Record<string, any> = { ru, en: enUS, kk, zh: zhCN, es };

// Menu is empty until admin adds items

function groupByMeal(items: any[]) {
  const groups: Record<string, any[]> = {};
  items.forEach((item) => {
    const key = item.meal_type || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

export default function Canteen() {
  const { t, i18n } = useTranslation();
  const currentLocale = locales[i18n.language] || locales.ru;
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());

  const handlePrev = () => setDate(subDays(date, 1));
  const handleNext = () => setDate(addDays(date, 1));

  const dateStr = format(date, "yyyy-MM-dd");
  const { data: menuEntries = [], isLoading } = useCanteenMenu(dateStr, dateStr);
  
  // Also fetch global schedule
  const { data: globalTimes = [] } = useQuery({
    queryKey: ["canteen_times"],
    queryFn: () => api.get<any[]>("/meals/canteen/times"),
  });

  const grouped = groupByMeal(menuEntries);
  
  // Ensure all standard meal types are represented even if empty
  const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/app/meals")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("mealHub.canteenTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("mealHub.canteenDesc")}</p>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
        <Button variant="ghost" size="icon" onClick={handlePrev}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-lg font-black uppercase tracking-widest text-primary/80">
          {format(date, "EEEE, d MMMM", { locale: currentLocale })}
        </div>
        <Button variant="ghost" size="icon" onClick={handleNext}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-6">
        {MEAL_TYPES.map((mealType) => {
          const items = grouped[mealType] || [];
          const globalTime = globalTimes.find((t: any) => t.meal_type === mealType);
          const startTime = items[0]?.start_time || globalTime?.start_time || "—";
          const endTime = items[0]?.end_time || globalTime?.end_time || "—";
          
          if (items.length === 0 && isLoading) return null;

          return (
            <BentoCard key={mealType} className="overflow-hidden border-none shadow-xl bg-card/40 backdrop-blur-md">
              <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Coffee className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-widest text-sm">{t(`canteenAdmin.${mealType}`)}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground tabular-nums">
                        {startTime} - {endTime}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full font-black uppercase text-[10px] px-3 py-1 bg-primary/5 text-primary border-primary/20 animate-pulse">
                  {t(`canteenAdmin.${mealType}`)}
                </Badge>
              </div>

              <div className="p-6">
                {items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((item) => (
                      <div key={item.id} className="group bg-muted/30 p-5 rounded-2xl border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{item.name}</h4>
                          {item.weight && (
                            <span className="text-[10px] font-black uppercase opacity-40 bg-muted px-2 py-1 rounded-md">{item.weight}g</span>
                          )}
                        </div>
                        
                        {(item.calories || item.proteins || item.fats || item.carbs) && (
                          <div className="grid grid-cols-4 gap-2">
                            <div className="flex flex-col items-center p-2 rounded-xl bg-orange-500/5 border border-orange-500/10">
                              <span className="text-orange-500 font-black text-xs">{item.calories || '0'}</span>
                              <span className="text-[8px] font-black uppercase opacity-40">{t('mealHub.calories')}</span>
                            </div>
                            <div className="flex flex-col items-center p-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                              <span className="text-blue-500 font-black text-xs">{item.proteins || '0'}</span>
                              <span className="text-[8px] font-black uppercase opacity-40">{t('mealHub.proteins', { value: '' }).replace(': ', '')}</span>
                            </div>
                            <div className="flex flex-col items-center p-2 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                              <span className="text-yellow-500 font-black text-xs">{item.fats || '0'}</span>
                              <span className="text-[8px] font-black uppercase opacity-40">{t('mealHub.fats', { value: '' }).replace(': ', '')}</span>
                            </div>
                            <div className="flex flex-col items-center p-2 rounded-xl bg-green-500/5 border border-green-500/10">
                              <span className="text-green-500 font-black text-xs">{item.carbs || '0'}</span>
                              <span className="text-[8px] font-black uppercase opacity-40">{t('mealHub.carbs', { value: '' }).replace(': ', '')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center opacity-30">
                    <Utensils className="w-12 h-12 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">{t('canteenAdmin.menuNotConfigured')}</p>
                  </div>
                )}
              </div>
            </BentoCard>
          );
        })}
      </div>
      )}
    </div>
  );
}
