import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, Target, Award, BookOpen, 
  FileText, PlayCircle, CheckCircle2, 
  Clock, Calendar, Plus, Trash2, Loader2,
  ChevronRight, Download, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BentoCard } from "@/components/BentoCard";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useTestResults, 
  useExamRegistrations, 
  useCreateTestResult,
  useCreateExamRegistration,
  useDeleteExamRegistration
} from "@/hooks/useApiData";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const EXAM_CONFIGS: Record<string, any> = {
  SAT: { name: "SAT", target: 1600, color: "text-blue-500", bg: "bg-blue-500/10" },
  AP: { name: "Advanced Placement", target: 5, color: "text-purple-500", bg: "bg-purple-500/10" },
  "A-LEVEL": { name: "A-Level", target: 100, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  IELTS: { name: "IELTS", target: 9.0, color: "text-amber-500", bg: "bg-amber-500/10" },
};

export default function ExamDetail() {
  const { examId = "SAT" } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = EXAM_CONFIGS[examId] || EXAM_CONFIGS.SAT;

  const { data: results = [] } = useTestResults(user?.id);
  const { data: regs = [] } = useExamRegistrations(user?.id);
  const createReg = useCreateExamRegistration();
  const deleteReg = useDeleteExamRegistration();

  const { data: mockTests = [] } = useQuery<any[]>({
    queryKey: ["mock_tests"],
    queryFn: () => api.get("/mock-tests")
  });
  const examMockTests = mockTests.filter(t => t.exam_type === examId);

  const examResults = results.filter(r => r.exam_type === examId);
  const examRegs = regs.filter(r => r.exam_type === examId);

  const latestResult = useMemo(() => {
    if (!examResults.length) return null;
    return [...examResults].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }, [examResults]);

  const progress = latestResult ? (latestResult.score / config.target) * 100 : 0;

  // Mock materials
  const [tasks, setTasks] = useState([
    { id: 1, title: "Algebra: Linear Equations", completed: true },
    { id: 2, title: "Reading: Evidence-Based Claims", completed: false },
    { id: 3, title: "Writing: Standard English Conventions", completed: false },
  ]);

  const toggleTask = (id: number) => {
    setTasks(t => t.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-2">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/app/college-prep/exam")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black">{config.name} Preparation</h1>
          <p className="text-muted-foreground font-medium">Elevate your score with precision practice.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Simulator */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Score Tracker */}
          <BentoCard title="Score Tracker" icon={<Target className="h-5 w-5 text-primary" />}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Latest Score</p>
                         <p className={`text-5xl font-black ${config.color}`}>{latestResult?.score || "—"}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Target Goal</p>
                         <p className="text-3xl font-black">{config.target}</p>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                         <span>{t("exam.mastery_level", "Mastery Level")}</span>
                         <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-3 rounded-full" />
                   </div>
                </div>
                
                <div className="flex flex-col justify-center items-center p-6 bg-muted/30 rounded-[2rem] border border-dashed border-border text-center">
                   <Award className="h-10 w-10 text-primary opacity-30 mb-2" />
                   <h4 className="font-bold">Goal Roadmap</h4>
                   <p className="text-xs text-muted-foreground mt-1">You are {config.target - (latestResult?.score || 0)} points away from your goal.</p>
                </div>
             </div>
          </BentoCard>

          {/* Simulation Center */}
          <div className={`relative overflow-hidden p-8 rounded-[3rem] bg-gradient-to-br from-primary to-indigo-700 text-white shadow-2xl shadow-primary/20`}>
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] -mr-32 -mt-32" />
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 text-center md:text-left">
                   <h2 className="text-3xl font-black tracking-tight">{t("exam.simulation_center", "Simulation Center")}</h2>
                   <p className="text-primary-foreground/80 max-w-md font-medium">Experience the full {config.name} test environment with our pro-grade simulator. Full-length mock tests with instant AI feedback.</p>
                   <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 py-1 px-4 text-xs font-bold">4 Sections</Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 py-1 px-4 text-xs font-bold">180 Minutes</Badge>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 py-1 px-4 text-xs font-bold">AI Review</Badge>
                   </div>
                </div>
                <div className="flex flex-col gap-3">
                  {examMockTests.length === 0 ? (
                    <p className="text-primary-foreground/50 text-sm">No mock tests available yet.</p>
                  ) : (
                    examMockTests.map((t: any) => (
                      <Button key={t.id}
                        onClick={() => navigate(`/app/college-prep/mock-test/${t.id}`)}
                        className="bg-white text-primary hover:bg-white/90 h-14 px-8 rounded-2xl font-black shadow-xl"
                      >
                         <PlayCircle className="mr-3 h-5 w-5" /> Start {t.title}
                      </Button>
                    ))
                  )}
                </div>
             </div>
          </div>

          {/* Materials & Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <BentoCard title="Materials" icon={<BookOpen className="h-5 w-5 text-purple-500" />}>
                <div className="space-y-3 mt-4">
                   {[
                     { title: "Essential Formulas", type: "PDF", size: "1.2 MB" },
                     { title: "Strategy Guide 2026", type: "Video", size: "15 min" },
                     { title: "Vocabulary Workbook", type: "PDF", size: "4.5 MB" },
                   ].map((m, i) => (
                     <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/20 transition-all cursor-pointer group">
                        <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center">
                           <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                           <p className="text-sm font-bold truncate">{m.title}</p>
                           <p className="text-[10px] text-muted-foreground font-black uppercase">{m.type} • {m.size}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100"><Download className="h-4 w-4" /></Button>
                     </div>
                   ))}
                </div>
             </BentoCard>

             <BentoCard title="Tasks" icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}>
                <div className="space-y-3 mt-4">
                   {tasks.map(task => (
                     <div key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-4 p-3 rounded-2xl bg-card border cursor-pointer hover:bg-muted/10 transition-colors">
                        <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-muted-foreground/30'}`}>
                           {task.completed && <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <span className={`text-sm font-bold ${task.completed ? 'text-muted-foreground line-through' : ''}`}>{task.title}</span>
                     </div>
                   ))}
                   <Button variant="outline" className="w-full border-dashed rounded-xl h-10 text-xs uppercase font-black tracking-widest mt-2">
                      <Plus className="h-3 w-3 mr-2" /> Add Task
                   </Button>
                </div>
             </BentoCard>
          </div>
        </div>

        {/* Right Column: Registrations & Past Papers */}
        <div className="space-y-8">
           {/* Upcoming Tests */}
           <BentoCard title="Registrations" icon={<Calendar className="h-5 w-5 text-warning" />}>
              <div className="space-y-4 mt-4">
                 {examRegs.map(reg => (
                   <div key={reg.id} className="p-4 rounded-3xl border bg-muted/20 relative group">
                      <p className="text-xs font-black uppercase text-muted-foreground mb-3">{format(new Date(reg.exam_date), "MMMM dd, yyyy")}</p>
                      <h4 className="font-black text-lg">{reg.subject || examId}</h4>
                      <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-2">
                         <div className="h-2 w-2 rounded-full bg-warning animate-pulse" /> {reg.location || "Central Test Hub"}
                      </p>
                      <Button variant="ghost" size="icon" className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-destructive h-8 w-8" onClick={() => deleteReg.mutate(reg.id)}>
                         <Trash2 className="h-4 w-4" />
                      </Button>
                   </div>
                 ))}
                 
                 <Dialog>
                    <DialogTrigger asChild>
                       <Button variant="outline" className="w-full border-dashed rounded-2xl h-14 font-bold text-primary hover:bg-primary/5">
                          <Plus className="h-5 w-5 mr-2" /> Register for Test
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2.5rem]">
                       <DialogHeader>
                          <DialogTitle className="text-2xl font-black">Register Exam</DialogTitle>
                       </DialogHeader>
                       <div className="space-y-4 py-4">
                          <div className="space-y-1">
                             <Label>Subject (optional)</Label>
                             <Input placeholder="e.g. Mathematics Level 2" />
                          </div>
                          <div className="space-y-1">
                             <Label>{t("exam.exam_date", "Exam Date")}</Label>
                             <Input type="date" />
                          </div>
                          <div className="space-y-1">
                             <Label>{t("common.location", "Location")}</Label>
                             <Input placeholder="Test Center Name" />
                          </div>
                          <Button className="w-full h-12 rounded-2xl font-black" onClick={() => toast.success("Registration success!")}>Confirm Registration</Button>
                       </div>
                    </DialogContent>
                 </Dialog>
              </div>
           </BentoCard>

           {/* Results Archive */}
           <BentoCard title="Results Archive" icon={<Clock className="h-5 w-5 text-blue-500" />}>
              <div className="space-y-3 mt-4">
                 {examResults.length === 0 ? (
                   <p className="text-xs text-muted-foreground italic text-center py-6">No past attempts yet.</p>
                 ) : examResults.map(res => (
                   <div key={res.id} className="flex justify-between items-center p-4 rounded-2xl bg-card border hover:border-primary/30 transition-all cursor-pointer group">
                      <div>
                         <p className="text-[10px] font-black text-muted-foreground uppercase">{format(new Date(res.created_at), "MMM d, yyyy")}</p>
                         <p className="font-bold text-sm">{res.is_mock ? "Mock Simulator" : "Official Result"}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-black text-primary">{res.score}</p>
                         <Eye className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </div>
                   </div>
                 ))}
              </div>
           </BentoCard>
        </div>
      </div>
    </div>
  );
}
