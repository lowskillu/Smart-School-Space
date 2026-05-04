import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  FileText, GraduationCap, Award, Search, 
  Download, Eye, Send, Clock, Calendar as CalendarIcon,
  ChevronRight, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudents, useGrades } from "@/hooks/useApiData";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CounselorHub() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: grades, isLoading: gradesLoading } = useGrades();

  const essayQueue = [
    { student: "Alice Chen", topic: "Common App Personal Statement", submitted: "Apr 8", status: "pending", college: "Stanford" },
    { student: "Bob Martinez", topic: "Why MIT?", submitted: "Apr 7", status: "pending", college: "MIT" },
    { student: "Carol Davis", topic: "Community Service Essay", submitted: "Apr 6", status: "reviewed", college: "UC Berkeley" },
  ];

  const summaryStats = [
    { label: "Pending Essays", value: 42, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "University Apps", value: 156, icon: GraduationCap, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Activities Pending", value: 12, icon: Award, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Total Students", value: students?.length || 0, icon: GraduationCap, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      {/* 1. Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("counselor.title")}</h1>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl text-primary shadow-sm">
             <CalendarIcon className="h-5 w-5" />
           </Button>
           <Button className="h-10 px-4 gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm font-bold">
             <Send className="h-4 w-4" />
             <span className="hidden sm:inline">{t("counselor.message_parents", "Message Parents")}</span>
           </Button>
        </div>
      </div>

      {/* 2. Stats Horizontal Row */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
           <GraduationCap className="h-5 w-5 text-primary" />
           College Pipeline
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar">
          {summaryStats.map((stat, i) => (
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
                <p className="text-[10px] text-muted-foreground font-bold mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">
                   View Details <ArrowUpRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Essay Management Box */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("counselor.essayQueue")}
            </h2>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-primary gap-1">
              {t("common.viewAll", "Full List")} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Card className="h-[450px] flex flex-col rounded-2xl shadow-sm border-border/50 overflow-hidden bg-card/50">
             <CardContent className="p-0 flex-1 overflow-y-auto">
               <div className="p-5 space-y-4">
                 {essayQueue.map((essay, i) => (
                    <div key={i} className="group p-4 rounded-xl bg-background border border-border shadow-sm hover:border-primary/20 transition-all cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${essay.status === 'pending' ? 'bg-warning/5 text-warning border-warning/20' : 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'}`}>
                           {essay.status}
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground">{essay.submitted}</span>
                      </div>
                      <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{essay.topic}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{essay.student} • {essay.college}</p>
                      <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="secondary" size="sm" className="h-7 text-[10px] font-bold uppercase rounded-lg">{t("common.review", "Review")}</Button>
                         <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase rounded-lg">{t("counselor.quick_comment", "Quick Comment")}</Button>
                      </div>
                    </div>
                 ))}
               </div>
             </CardContent>
          </Card>
        </div>

        {/* Right: Transcript Generation Box */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Active Transcripts
          </h2>
          <Card className="h-[450px] flex flex-col rounded-2xl shadow-sm border-border/50 overflow-hidden bg-card/50 px-5">
             <div className="space-y-4 py-5">
                {[
                  { name: "John Smith", grade: "12A", gpa: "3.92" },
                  { name: "Alice Brown", grade: "12B", gpa: "4.00" },
                  { name: "Charlie Day", grade: "12A", gpa: "3.75" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-background border border-border group hover:border-primary/30 transition-all">
                     <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary uppercase">{s.name[0]}</div>
                     <div className="flex-1">
                        <p className="font-bold text-sm">{s.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{s.grade}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-lg font-black text-primary leading-none">{s.gpa}</p>
                        <Button variant="ghost" size="icon" className="h-8 w-8 mt-1"><Download className="h-4 w-4" /></Button>
                     </div>
                  </div>
                ))}
             </div>
             <div className="mt-auto pb-5 pt-3 border-t">
                <p className="text-xs text-muted-foreground italic text-center">Batch generation available for selected classes.</p>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
