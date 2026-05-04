import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BentoCard } from "@/components/BentoCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSchool } from "@/contexts/SchoolContext";
import { useStudents } from "@/hooks/useApiData";
import { 
  Search, 
  User, 
  History, 
  TrendingUp, 
  Calculator, 
  Target, 
  BrainCircuit, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface GradeSummary {
  summary: Record<string, number>;
  chart: any[];
}

export default function Marks() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { role, grade } = useSchool();
  const { data: allStudents = [] } = useStudents();
  const { user } = useAuth();
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(user?.student_id || null);
  const [openSelector, setOpenSelector] = useState(false);
  const [selectedYear, setSelectedYear] = useState("All");
  
  // Target Calculator State
  const [targetSubject, setTargetSubject] = useState("");
  const [targetGrade, setTargetGrade] = useState("");

  // Sync selectedStudentId with current user if student
  useEffect(() => {
    if (role === 'student' && user?.student_id) {
       setSelectedStudentId(user.student_id);
    }
  }, [role, user]);

  // Data Fetching
  const { data, isLoading } = useQuery<GradeSummary>({
    queryKey: ["grades-summary", selectedYear, selectedStudentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedYear && selectedYear !== "All") params.append("year", selectedYear);
      if (selectedStudentId) params.append("student_id", selectedStudentId);
      
      return api.get<GradeSummary>(`/grades/summary?${params.toString()}`);
    },
    enabled: !!accessToken && (role === 'admin' ? !!selectedStudentId : true)
  });

  // Derived calculations
  const summaryData = data?.summary || {};
  const subjects = Object.keys(summaryData);
  
  const avgGrade = useMemo(() => {
     if (subjects.length === 0) return 0;
     const sum = Object.values(summaryData).reduce((a, b) => a + b, 0);
     return sum / subjects.length;
  }, [summaryData, subjects]);

  const gpa = useMemo(() => {
     if (avgGrade === 0) return 0;
     // Rough conversion: 90-100 = 4.0, 80-89 = 3.0, etc.
     if (avgGrade >= 90) return 4.0;
     if (avgGrade >= 85) return 3.5;
     if (avgGrade >= 80) return 3.0;
     if (avgGrade >= 70) return 2.0;
     if (avgGrade >= 60) return 1.0;
     return 0;
  }, [avgGrade]);

  // Sorting for rating table
  const ratingTable = useMemo(() => {
     return Object.entries(summaryData)
       .map(([subject, score]) => ({ subject, score }))
       .sort((a, b) => a.score - b.score);
  }, [summaryData]);

  // Target Calculator Logic
  const calculateRequiredScore = (currentAvg: number, desired: number) => {
    // Math logic: (desired - currentAvg * 0.7) / 0.3
    const required = Math.round((desired - currentAvg * 0.7) / 0.3);
    return Math.max(0, required);
  };

  const calculatedTargetScore = useMemo(() => {
    if (!targetSubject || !targetGrade) return null;
    const currentAvg = summaryData[targetSubject];
    if (currentAvg === undefined) return null;
    const desired = parseFloat(targetGrade);
    if (isNaN(desired)) return null;
    return calculateRequiredScore(currentAvg, desired);
  }, [targetSubject, targetGrade, summaryData]);

  // Color mapping for recharts
  const chartColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

  useEffect(() => {
    // Notify on load that grades are updated (Logic implementation)
    if (gpa > 0) {
      setTimeout(() => {
         toast.success(t("marks.marks_updated", "Marks Updated"), {
           description: t("marks.gpa_arrived", "Your grade data has arrived. Current GPA: {{gpa}}").replace("{{gpa}}", gpa.toFixed(2)),
           icon: <TrendingUp className="h-4 w-4" />
         });
      }, 500);
    }
  }, [gpa]);

  const handleSimulateUpdate = () => {
     toast(t("marks.simulation", "Simulation"), {
        description: t("marks.simulation_desc", "A new grade was added. GPA increased to 3.8"),
        icon: <History className="h-4 w-4" />
     });
  };

  // Find lowest subject for AI advice
  const weakestSubject = ratingTable.length > 0 ? ratingTable[0] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("marks.title")}</h1>
          <p className="text-muted-foreground">{t("marks.subtitle")}</p>
        </div>
        
        <div className="flex items-center gap-3">
           {role === 'admin' && (
              <Popover open={openSelector} onOpenChange={setOpenSelector}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSelector}
                    className="w-[250px] h-10 justify-between rounded-xl border-primary/20 bg-primary/25 font-bold"
                  >
                    {selectedStudentId
                      ? allStudents.find((s) => s.id === selectedStudentId)?.name
                      : t("marks.preview_student", "Preview Student...")}
                    <User className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0 rounded-xl">
                  <Command>
                    <CommandInput placeholder={t("common.search", "Search students...")} />
                    <CommandList>
                      <CommandEmpty>{t("marks.no_student_found", "No student found.")}</CommandEmpty>
                      <CommandGroup>
                        {allStudents.map((student) => (
                          <CommandItem
                            key={student.id}
                            value={student.name}
                            onSelect={() => {
                              setSelectedStudentId(student.id);
                              setOpenSelector(false);
                              toast.info(t("marks.viewing_grades", "Viewing grades for {{name}}").replace("{{name}}", student.name));
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedStudentId === student.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {student.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
           )}

           <button 
              onClick={handleSimulateUpdate}
              className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 text-muted-foreground h-10"
           >
             <History className="w-3 h-3" /> {t("common.sync", "Sync")}
           </button>
           <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary w-40"
           >
              <option value="All">{t("marks.all_years")}</option>
              <option value="2024">2024-2025</option>
              <option value="2023">2023-2024</option>
              <option value="2022">2022-2023</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* GPA & Avg Grade */}
        <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
           <CardHeader className="pb-2">
             <CardTitle className="text-lg flex items-center gap-2">
               <TrendingUp className="text-primary w-5 h-5" />
               {t("marks.avg_grade")} & GPA
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="flex flex-col gap-1 mt-2">
               <div className="flex items-end gap-2">
                 <span className="text-5xl font-black">{gpa.toFixed(2)}</span>
                 <span className="text-muted-foreground mb-1 font-medium">{t("marks.gpa")}</span>
               </div>
               <div className="text-sm text-muted-foreground mt-4 font-medium flex items-center gap-2">
                 {t("marks.avg_score", "Avg Score")}: <span className="text-foreground font-bold">{avgGrade.toFixed(1)} / 100</span>
               </div>
             </div>
           </CardContent>
        </Card>

        {/* Target Calculator */}
        <Card className="md:col-span-2">
           <CardHeader className="pb-2">
             <CardTitle className="text-lg flex items-center gap-2">
               <Calculator className="w-5 h-5" />
               {t("marks.target_calculator")}
             </CardTitle>
             <CardDescription>{t("marks.target_calc_desc")}</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium">{t("marks.select_subject")}</label>
                 <select 
                   value={targetSubject}
                   onChange={e => setTargetSubject(e.target.value)}
                   className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                 >
                   <option value="" disabled>{t("marks.select_subject")}</option>
                   {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>
               
               <div className="space-y-2">
                 <label className="text-sm font-medium">{t("marks.desired_grade")}</label>
                 <input 
                   type="number" 
                   value={targetGrade}
                   onChange={e => setTargetGrade(e.target.value)}
                   placeholder="95"
                   className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                 />
               </div>
             </div>

             {calculatedTargetScore !== null && (
               <div className="bg-chart-3/10 border border-chart-3/30 p-4 rounded-xl flex items-start gap-3 mt-4">
                 <Target className="w-5 h-5 text-chart-3 mt-0.5" />
                 <div>
                   <h4 className="font-bold text-chart-3">{t("marks.target_calculated", "Target Calculated")}</h4>
                   <p className="text-sm text-chart-3/80 mt-1">
                     {t("marks.required_score", { score: calculatedTargetScore })}
                   </p>
                 </div>
               </div>
             )}
           </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rating Table & AI Advice */}
        <div className="lg:col-span-1 space-y-6">
          {role === 'admin' && !selectedStudentId && (
             <div className="rounded-2xl border-2 border-dashed border-primary/20 p-8 flex flex-col items-center justify-center text-center gap-4 bg-primary/5">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                   <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                   <h3 className="font-bold text-lg">{t("marks.no_student_selected", "No Student Selected")}</h3>
                   <p className="text-sm text-muted-foreground max-w-[200px] mx-auto mt-1">{t("marks.select_student_desc", "Please select a student above to preview their marks.")}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setOpenSelector(true)} className="rounded-xl font-bold">{t("marks.select_now", "Select Now")}</Button>
             </div>
          )}
          
          <BentoCard title={t("marks.ai_advice")} icon={<BrainCircuit className="w-5 h-5 text-primary" />}>
             {isLoading ? (
               <div className="h-24 animate-pulse bg-muted rounded-md" />
             ) : weakestSubject && weakestSubject.score < 80 ? (
               <div className="space-y-4">
                 <div className="flex gap-3 text-sm">
                   <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                   <p className="leading-snug">{t("marks.advice_critical", { subject: weakestSubject.subject })}</p>
                 </div>
                 <button 
                   onClick={() => navigate("/app/my-courses")}
                   className="w-full flex items-center justify-center gap-2 h-9 rounded-md bg-secondary text-secondary-foreground hover:bg-muted text-sm font-medium transition-colors"
                 >
                   {t("marks.find_extra_courses")} <ArrowRight className="w-4 h-4" />
                 </button>
               </div>
             ) : weakestSubject ? (
               <div className="flex gap-3 text-sm">
                 <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                 <p className="leading-snug">{t("marks.advice_good", { subject: weakestSubject.subject })}</p>
               </div>
             ) : (
               <p className="text-sm text-muted-foreground">{t("marks.no_data")}</p>
             )}
          </BentoCard>

           <Card>
             <CardHeader className="pb-3">
               <CardTitle className="text-lg">{t("marks.rating_table")}</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 {ratingTable.map((item) => {
                   let statusColor = "bg-success/20 text-success";
                   let statusLabel = t("marks.excellent");
                   if (item.score < 85) { statusColor = "bg-chart-2/20 text-chart-2"; statusLabel = t("marks.good"); }
                   if (item.score < 75) { statusColor = "bg-warning/20 text-warning"; statusLabel = t("marks.warning"); }
                   if (item.score < 60) { statusColor = "bg-destructive/20 text-destructive"; statusLabel = t("marks.critical"); }

                   return (
                     <div key={item.subject} className="flex items-center justify-between group">
                       <div className="flex flex-col">
                         <span className="font-medium text-sm">{item.subject}</span>
                         <span className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${statusColor} px-1.5 py-0.5 rounded-sm w-max`}>
                           {statusLabel}
                         </span>
                       </div>
                       <div className="text-right">
                         <span className="font-bold">{item.score}</span>
                       </div>
                     </div>
                   );
                 })}
                 {ratingTable.length === 0 && !isLoading && (
                   <p className="text-sm text-muted-foreground">{t("marks.no_data")}</p>
                 )}
               </div>
             </CardContent>
           </Card>
        </div>

        {/* Mark's Analysis Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
               <TrendingUp className="w-5 h-5" />
               {t("marks.analysis")}
             </CardTitle>
             <CardDescription>{t("marks.progression_desc", "Progression over the period")}</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[400px] w-full mt-4">
               {isLoading ? (
                 <div className="w-full h-full animate-pulse bg-muted/50 rounded-xl" />
               ) : (
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={data?.chart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                     <XAxis 
                       dataKey="month" 
                       axisLine={false}
                       tickLine={false}
                       tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                       dy={10}
                     />
                     <YAxis 
                       axisLine={false}
                       tickLine={false}
                       tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                       domain={[0, 100]}
                     />
                     <Tooltip 
                       contentStyle={{ 
                         backgroundColor: "hsl(var(--card))", 
                         borderColor: "hsl(var(--border))",
                         borderRadius: "8px",
                         boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                       }}
                       itemStyle={{ color: "hsl(var(--foreground))", fontSize: "14px", fontWeight: 500 }}
                       labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "8px", fontWeight: 600 }}
                     />
                     <Legend 
                       iconType="circle" 
                       wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                     />
                     {subjects.map((subj, idx) => (
                       <Line 
                         key={subj}
                         type="monotone" 
                         dataKey={subj} 
                         stroke={chartColors[idx % chartColors.length]} 
                         strokeWidth={3}
                         dot={{ r: 4, strokeWidth: 2 }}
                         activeDot={{ r: 6, strokeWidth: 0 }}
                       />
                     ))}
                   </LineChart>
                 </ResponsiveContainer>
               )}
             </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
