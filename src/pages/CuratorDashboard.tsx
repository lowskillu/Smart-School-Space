import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BentoCard } from "@/components/BentoCard";
import { 
  Search, MapPin, Clock, Users, Loader2, 
  TrendingUp, CheckCircle2, AlertTriangle, ChevronRight, UserMinus,
  Activity, Calendar as CalendarIcon, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useStudents, useClasses } from "@/hooks/useApiData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CuratorDashboard() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const { data: students, isLoading } = useStudents();
  const { data: classes } = useClasses();

  const filteredStudents = query.trim()
    ? (students || []).filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          classes?.find((c) => c.id === s.class_id)?.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const stats = [
    { label: t("curator.students_lobby", "Students in Lobby"), value: 12, icon: MapPin, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: t("curator.active_absences", "Active Absences"), value: 48, icon: UserMinus, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: t("curator.gate_logs", "Gate Logs Today"), value: "324", icon: Clock, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: t("curator.campus_load", "Campus Load"), value: "82%", icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      {/* 1. Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("curator.title")}</h1>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl text-primary shadow-sm">
             <CalendarIcon className="h-5 w-5" />
           </Button>
           <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground shadow-sm">
             <Filter className="h-5 w-5" />
           </Button>
        </div>
      </div>

      {/* 2. Stats Horizontal Row */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
           <Activity className="h-5 w-5 text-primary" />
           {t("curator.campus_snapshot", "Campus Snapshot")}
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar">
          {stats.map((stat, i) => (
            <Card key={i} className="min-w-[240px] flex-shrink-0 shadow-sm hover:shadow-md transition-all border-border/50 hover:border-primary/30 rounded-2xl group cursor-pointer bg-card/50">
               <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{stat.label}</span>
                  <div className={stat.bg + " p-1.5 rounded-lg " + stat.color}>
                    <stat.icon className="h-3.5 w-3.5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Student Tracking */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            {t("curator.student_locator", "Live Student Locator")}
          </h2>
          <Card className="h-[450px] flex flex-col rounded-2xl shadow-sm border-border/50 overflow-hidden bg-card/50">
             <CardHeader className="p-5 pb-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                  <Input
                    placeholder={t("curator.searchPlaceholder")}
                    className="pl-10 h-12 rounded-xl bg-muted/20 border-border/30"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
             </CardHeader>
             <CardContent className="p-0 flex-1 overflow-y-auto">
               <div className="p-5 space-y-3">
                 {isLoading ? (
                    <div className="flex justify-center py-10 opacity-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
                 ) : query.trim() === "" ? (
                    <div className="text-center py-20 text-muted-foreground italic">
                      <MapPin className="h-10 w-10 mx-auto mb-2 opacity-10" />
                      <p className="text-sm">{t("curator.search_hint", "Search for a student to see their live location.")}</p>
                    </div>
                 ) : (
                   filteredStudents.map((s) => (
                    <div key={s.id} className="group flex items-center gap-4 p-4 rounded-xl border bg-background hover:border-primary/20 transition-all cursor-pointer">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary uppercase">
                        {s.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">CAMPUS C • LOBBY</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-30" />
                    </div>
                   ))
                 )}
               </div>
             </CardContent>
          </Card>
        </div>

        {/* Right: Absence Monitor */}
        <div className="space-y-4">
           <h2 className="text-xl font-semibold flex items-center gap-2">
             <AlertTriangle className="h-5 w-5 text-primary" />
             {t("curator.incident_monitor", "Incident Monitor")}
           </h2>
           <Card className="h-[450px] flex flex-col rounded-2xl shadow-sm border-border/50 overflow-hidden bg-card/50">
             <CardContent className="p-5 space-y-4">
               {[
                 { student: "Ivan Ivanov", class: "11B", time: "08:15", incident: "Unexplained Absence", urgent: true },
                 { student: "Maria Semenova", class: "10A", time: "09:42", incident: "Gate violation attempt", urgent: false },
               ].map((inc, i) => (
                 <div key={i} className={`p-4 rounded-2xl border transition-all ${inc.urgent ? 'border-destructive/20 bg-destructive/5' : 'bg-background hover:bg-muted/10'}`}>
                    <div className="flex justify-between items-start mb-2">
                       <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${inc.urgent ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>{inc.time}</span>
                       <Badge variant="ghost" className="text-xs font-bold p-0">{inc.class}</Badge>
                    </div>
                    <p className="text-sm font-bold">{inc.student}</p>
                    <p className="text-xs text-muted-foreground mt-1">{inc.incident}</p>
                    <Button variant="ghost" size="sm" className="w-full mt-4 h-9 text-[10px] uppercase font-black tracking-widest border border-primary/20 hover:bg-primary/5 hover:text-primary">{t("curator.resolve_status", "Resolve Status")}</Button>
                 </div>
               ))}
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
