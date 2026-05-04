import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BentoCard } from "@/components/BentoCard";
import { 
  Users, CheckCircle2, FileText, Clock, BarChart3, 
  TrendingUp, Bell, Calendar as CalendarIcon, Plus, ChevronRight,
  Shield, Megaphone, Activity, Settings
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip 
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAnnouncements, useStudents } from "@/hooks/useApiData";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const weeklyData = [
  { day: "Mon", attendance: 94, submissions: 87 },
  { day: "Tue", attendance: 96, submissions: 91 },
  { day: "Wed", attendance: 92, submissions: 85 },
  { day: "Thu", attendance: 95, submissions: 90 },
  { day: "Fri", attendance: 88, submissions: 78 },
];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Real data for contextual tiles
  const { data: globalAnnouncements = [], isLoading: loadingAnnouncements } = useAnnouncements();
  const { data: students = [] } = useStudents();

  const summaryStats = [
    { label: t("admin.totalStudents"), value: students?.length.toString() || "0", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: t("admin.avgAttendance"), value: "93.4%", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: t("admin.pendingReports"), value: "7", icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Gate Status", value: "Active", icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("admin.title")}</h1>
          <p className="text-muted-foreground text-sm font-medium">
            {format(new Date(), "EEEE, MMMM do, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button 
             variant="outline" 
             size="icon" 
             className="h-10 w-10 shrink-0 rounded-xl border-primary/20 bg-primary/5 text-primary shadow-sm"
             onClick={() => navigate("/app/admin/users")}
             title={t("adminPanel.schoolSettings", "System Settings")}
           >
             <Settings className="h-5 w-5" />
           </Button>
           <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl hover:bg-accent hover:text-accent-foreground text-primary shadow-sm">
             <CalendarIcon className="h-5 w-5" />
           </Button>
           <Button className="h-10 px-4 gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm font-bold">
             <Plus className="h-4 w-4" />
             <span className="hidden sm:inline">Add Entry</span>
           </Button>
        </div>
      </div>

      {/* 2. School Performance Row (Horizontal scrollable cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t("admin.performanceOverview", "School Performance")}
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar">
          {summaryStats.map((stat, i) => (
            <Card key={i} className="min-w-[240px] flex-shrink-0 shadow-sm hover:shadow-md transition-all border-border/50 hover:border-primary/30 rounded-2xl group cursor-pointer bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{stat.label}</span>
                  <div className={cn(stat.bg, "p-1.5 rounded-lg", stat.color)}>
                    <stat.icon className="h-3.5 w-3.5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                <div className="flex items-center gap-1.5 mt-2">
                   <div className="flex items-center text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <TrendingUp className="h-3 w-3 mr-1" /> +2.4%
                   </div>
                   <span className="text-[10px] text-muted-foreground font-medium">vs last week</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Announcements */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {t("tiles.announcements")}
            </h2>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-primary gap-1 hover:bg-primary/5 rounded-lg" onClick={() => navigate("/app/admin/users")}>
              {t("common.viewAll", "Manage")} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Card className="h-[400px] flex flex-col rounded-2xl shadow-sm border-border/50 overflow-hidden bg-card/50">
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="p-5 space-y-4">
                {loadingAnnouncements ? (
                   <div className="space-y-4 animate-pulse">
                      <div className="h-20 bg-muted rounded-xl" />
                      <div className="h-20 bg-muted rounded-xl" />
                   </div>
                ) : globalAnnouncements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground italic">
                    <Megaphone className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">No global announcements.</p>
                  </div>
                ) : (
                  globalAnnouncements.map((a: any) => {
                    const colorClasses = (() => {
                      switch (a.color) {
                        case "emerald": return "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40";
                        case "amber": return "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40";
                        case "rose": return "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40";
                        case "violet": return "bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40";
                        case "cyan": return "bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40";
                        default: return "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40";
                      }
                    })();
                    const accentColor = (() => {
                      switch (a.color) {
                        case "emerald": return "bg-emerald-500";
                        case "amber": return "bg-amber-500";
                        case "rose": return "bg-rose-500";
                        case "violet": return "bg-violet-500";
                        case "cyan": return "bg-cyan-500";
                        default: return "bg-blue-500";
                      }
                    })();

                    return (
                      <div key={a.id} className={cn("p-4 rounded-xl border shadow-sm transition-all relative overflow-hidden", colorClasses)}>
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-60", accentColor)} />
                        <div className="flex justify-between items-start mb-2 pl-2">
                          <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{a.title}</h4>
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground shrink-0 uppercase tracking-tighter">
                            {format(new Date(a.created_at), "MMM d")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 pl-2">{a.content}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* School Activity / Analytics */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
             <Activity className="h-5 w-5 text-primary" />
             {t("admin.weeklyReport")}
          </h2>
          <Card className="h-[400px] flex flex-col rounded-2xl shadow-sm border-border/50 overflow-hidden bg-card/50">
            <CardHeader className="pb-0 pt-5 px-6">
              <CardDescription className="font-medium">{t("admin.attendance_vs_assignments", "Attendance vs Assignments completion rate")}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-between">
              <div className="h-56 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 500 }} dy={10} />
                    <Tooltip 
                      cursor={{ fill: "hsl(var(--muted)/.2)" }}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    />
                    <Bar dataKey="attendance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Attendance" barSize={24} />
                    <Bar dataKey="submissions" fill="hsl(var(--primary)/.3)" radius={[4, 4, 0, 0]} name="Academic Rate" barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-3 mt-6">
                 <div className="flex items-center gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/10 group cursor-pointer hover:bg-destructive/10 transition-colors">
                    <div className="p-2 rounded-lg bg-destructive/10 text-destructive group-hover:scale-110 transition-transform">
                      <Bell className="h-4 w-4 shrink-0" />
                    </div>
                    <div className="flex-1">
                       <p className="text-xs font-bold text-destructive uppercase tracking-wider">{t("admin.security_alert", "Security Alert")}</p>
                       <p className="text-[11px] text-destructive/80 font-medium line-clamp-1">3 unauthorized attempts at Lab 2 entrance.</p>
                    </div>
                    <span className="text-[10px] font-black text-destructive/40 uppercase tracking-tighter">2m ago</span>
                 </div>
                 <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/10 group cursor-pointer hover:bg-primary/10 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      <Shield className="h-4 w-4 shrink-0" />
                    </div>
                    <div className="flex-1">
                       <p className="text-xs font-bold text-primary uppercase tracking-wider">{t("admin.system_status", "System Status")}</p>
                       <p className="text-[11px] text-primary/80 font-medium line-clamp-1">All services operational. API latency 42ms.</p>
                    </div>
                    <span className="text-[10px] font-black text-primary/40 uppercase tracking-tighter">Live</span>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

