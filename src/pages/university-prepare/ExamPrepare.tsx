import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, BookOpen, Calendar, Target, FileText,
  ArrowUpRight, Loader2, Plus, Trash2,
  TrendingUp, Award, Clock, ArrowRight, Activity, ChevronRight, Megaphone
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTestResults,
  useExamRegistrations,
  useDeleteExamRegistration,
} from "@/hooks/useApiData";
import { format } from "date-fns";

const EXAM_TYPES = [
  { 
    id: "SAT", 
    name: "SAT", 
    color: "from-blue-500 to-indigo-600", 
    neon: "shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    target: 1600,
    icon: Target
  },
  { 
    id: "AP", 
    name: "Advanced Placement", 
    color: "from-purple-500 to-pink-600", 
    neon: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
    target: 5,
    icon: Award
  },
  { 
    id: "A-LEVEL", 
    name: "A-Level", 
    color: "from-emerald-500 to-teal-600", 
    neon: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
    target: 100, // Normalized
    icon: BookOpen
  },
  { 
    id: "IELTS", 
    name: "IELTS", 
    color: "from-amber-500 to-orange-600", 
    neon: "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
    target: 9.0,
    icon: Megaphone
  },
];

export default function ExamPrepare() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.student_id;

  // API hooks
  const { data: testResults = [], isLoading: loadingResults } = useTestResults(studentId);
  const { data: examRegs = [], isLoading: loadingRegs } = useExamRegistrations(studentId);
  const deleteReg = useDeleteExamRegistration();

  // Next upcoming exam
  const nextExam = useMemo(() => {
    if (!examRegs.length) return null;
    return [...examRegs].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())[0];
  }, [examRegs]);

  // Calculate progress for each exam type
  const examStats = useMemo(() => {
    return EXAM_TYPES.map(type => {
      const results = testResults.filter(r => r.exam_type === type.id);
      const latest = results.length > 0 ? results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].score : 0;
      const progress = type.target > 0 ? (latest / type.target) * 100 : 0;
      return { ...type, latest, progress };
    });
  }, [testResults]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 flex flex-col h-full relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/app/college-prep">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{t("examPrepare.pageTitle")}</h1>
            <p className="text-muted-foreground font-medium">Your personalized path to academic excellence.</p>
          </div>
        </div>

        {nextExam && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-sm animate-in fade-in zoom-in duration-500">
             <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Clock className="h-5 w-5" />
             </div>
             <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-primary/70">Next Milestone</p>
                <p className="text-sm font-bold">{nextExam.exam_type} {nextExam.subject && `(${nextExam.subject})`} — {format(new Date(nextExam.exam_date), "MMM d, yyyy")}</p>
             </div>
          </div>
        )}
      </div>

      {/* Exam Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {examStats.map((exam) => (
          <div 
            key={exam.id} 
            onClick={() => navigate(`/app/college-prep/exam/${exam.id}`)}
            className={`group relative overflow-hidden p-6 rounded-[2.5rem] bg-card border-border/50 border hover:border-primary/50 transition-all cursor-pointer ${exam.neon} hover:scale-[1.02] active:scale-95`}
          >
            {/* Gradient Background Effect */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${exam.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity`} />
            
            <div className="relative space-y-6">
              <div className="flex justify-between items-start">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${exam.color} flex items-center justify-center text-white shadow-lg`}>
                  <exam.icon className="h-7 w-7" />
                </div>
                <Badge variant="outline" className="font-black text-[10px] tracking-widest px-2.5 py-0.5 rounded-full border-primary/30">
                  {exam.latest > 0 ? "IN PROGRESS" : "NOT STARTED"}
                </Badge>
              </div>

              <div>
                <h3 className="text-2xl font-black tracking-tight">{exam.id}</h3>
                <p className="text-xs text-muted-foreground font-bold uppercase mt-1 opacity-70">{exam.name}</p>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-[10px] font-black tracking-widest uppercase">
                    <span className="text-muted-foreground">Progression</span>
                    <span>{Math.round(exam.progress)}%</span>
                 </div>
                 <Progress value={exam.progress} className="h-1.5" />
              </div>

              <Button className="w-full rounded-2xl h-12 font-bold group-hover:bg-primary transition-colors">
                Continue Prep <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* DASHBOARD: Growth & Activity */}
         <BentoCard 
          className="lg:col-span-2" 
          title="Growth Analytics" 
          subtitle="Mock test score trend over the last 6 months"
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
         >
           <div className="h-72 flex flex-col items-center justify-center text-center p-10 bg-muted/50 rounded-3xl mt-4 border border-dashed border-border/50">
              <Activity className="h-12 w-12 text-primary opacity-20 mb-4" />
              <h4 className="text-lg font-bold">No Data Points Yet</h4>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">Start your first mock test to begin tracking your academic growth trajectory.</p>
              <Button variant="outline" className="mt-6 rounded-xl" onClick={() => navigate("/app/college-prep/mock-test/SAT/new")}>Start First Mock</Button>
           </div>
         </BentoCard>

         {/* Upcoming Registrations */}
         <div className="space-y-6">
            <BentoCard title={t("examPrepare.registeredExams")} icon={<Calendar className="h-5 w-5 text-warning" />}>
               <div className="space-y-4 mt-4">
                  {loadingRegs ? (
                    [1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                  ) : examRegs.length === 0 ? (
                    <div className="text-center py-10 opacity-30 italic text-sm">No registrations found.</div>
                  ) : (
                    examRegs.map(reg => (
                      <div key={reg.id} className="group p-4 rounded-2xl border border-border/50 bg-muted/20 flex gap-4 items-center">
                         <div className="h-10 w-10 rounded-xl bg-background flex flex-col items-center justify-center font-black text-sm shadow-sm">
                            {new Date(reg.exam_date).getDate()}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{reg.exam_type} {reg.subject && `— ${reg.subject}`}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{reg.location || "Online"}</p>
                         </div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteReg.mutate(reg.id)}>
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    ))
                  )}
                  <Button variant="outline" className="w-full border-dashed rounded-xl h-12" onClick={() => toast.info("Registration form moved to Individual Detail pages.")}>
                     <Plus className="h-4 w-4 mr-2" /> Add Registration
                  </Button>
               </div>
            </BentoCard>

            <BentoCard title="Past Results" icon={<Award className="h-5 w-5 text-emerald-500" />}>
               <div className="space-y-3 mt-4">
                  {loadingResults ? (
                    <Skeleton className="h-32 w-full rounded-2xl" />
                  ) : testResults.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground italic">No past tests records.</div>
                  ) : (
                    testResults.slice(0, 3).map(res => (
                      <div key={res.id} className="flex justify-between items-center p-3 rounded-xl bg-card border">
                         <div>
                            <p className="text-xs font-bold">{res.exam_type}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{res.subject || "General"}</p>
                         </div>
                         <span className="text-lg font-black text-primary">{res.score}</span>
                      </div>
                    ))
                  )}
                  <Button variant="ghost" className="w-full text-xs font-bold text-muted-foreground uppercase tracking-widest">View Full History <ChevronRight className="h-3 w-3 ml-1" /></Button>
               </div>
            </BentoCard>
         </div>
      </div>
    </div>
  );
}
