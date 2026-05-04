import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Loader2, MessageSquare, Award, Calendar as CalendarIcon, Info, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSchool } from "@/contexts/SchoolContext";
import { useGrades, useAssignments, useScheduleEntries } from "@/hooks/useApiData";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function StudentGrades() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { role } = useSchool();
  const navigate = useNavigate();

  const studentId = user?.student_id || user?.id; 
  const currentYear = new Date().getFullYear();
  const [academicYear, setAcademicYear] = useState<string>(`${currentYear - 1}-${currentYear}`);

  const { data: grades = [], isLoading: loadingGrades } = useGrades(studentId);
  const { data: assignments = [], isLoading: loadingAssignments } = useAssignments();
  
  // Use schedule entries to know which subjects the student is taking, even if no grades/assignments exist yet.
  const { data: schedule = [], isLoading: loadingSchedule } = useScheduleEntries({ studentId }); 

  const subjectGroups = useMemo(() => {
    const groups: Record<string, { 
      subjectId: string, 
      subjectName: string, 
      teacherId: string, 
      teacherName: string, 
      grades: any[], 
      totalScore: number, 
      maxScore: number 
    }> = {};

    // 1. Initialize with enrolled subjects from schedule
    schedule.forEach((entry: any) => {
      if (entry.subjects && !groups[entry.subject_id]) {
        groups[entry.subject_id] = {
          subjectId: entry.subject_id,
          subjectName: entry.subjects.name,
          teacherId: entry.teacher_id || "",
          teacherName: entry.teachers?.name || t("common.unknownTeacher", "Unknown Teacher"),
          grades: [],
          totalScore: 0,
          maxScore: 0,
        };
      }
    });

    const [startYearStr, endYearStr] = academicYear.split("-");
    const startYear = parseInt(startYearStr);
    const endYear = parseInt(endYearStr);

    // 2. Filter grades by academic year (e.g. Sept 1 of startYear to Aug 31 of endYear)
    const filteredGrades = grades.filter(g => {
      if (!g.created_at) return true;
      const d = new Date(g.created_at);
      const isAfterStart = d >= new Date(`${startYear}-09-01`);
      const isBeforeEnd = d < new Date(`${endYear}-09-01`);
      return isAfterStart && isBeforeEnd;
    });

    // 3. Process grades
    filteredGrades.forEach(grade => {
      const assignment = assignments.find(a => a.id === grade.assignment_id);
      const subjId = grade.subject_id || assignment?.subject_id || "unknown";
      const subjName = grade.subjects?.name || assignment?.subjects?.name || t("common.unknownSubject", "Unknown Subject");
      
      if (!groups[subjId]) {
        groups[subjId] = {
          subjectId: subjId,
          subjectName: subjName,
          teacherId: assignment?.teacher_id || "",
          teacherName: assignment?.teacher_name || t("common.unknownTeacher", "Unknown Teacher"),
          grades: [],
          totalScore: 0,
          maxScore: 0,
        };
      }

      if (!groups[subjId].teacherId && assignment?.teacher_id) {
        groups[subjId].teacherId = assignment.teacher_id;
        groups[subjId].teacherName = assignment.teacher_name || groups[subjId].teacherName;
      }

      if (grade.score !== undefined && grade.score !== null) {
        groups[subjId].grades.push({
          ...grade,
          assignment
        });
        groups[subjId].totalScore += grade.score;
        groups[subjId].maxScore += assignment?.max_points || 100;
      }
    });

    // Convert object to array and sort alphabetically
    return Object.values(groups).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [grades, assignments, schedule, academicYear, t]);

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (percentage >= 75) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    if (percentage >= 60) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-rose-500 bg-rose-500/10 border-rose-500/20";
  };

  const getOverallGrade = (total: number, max: number) => {
    if (max === 0) return { label: "—", color: "text-muted-foreground bg-secondary", percentage: 0 };
    const percentage = (total / max) * 100;
    
    let label = "F";
    if (percentage >= 90) label = "A";
    else if (percentage >= 80) label = "B";
    else if (percentage >= 70) label = "C";
    else if (percentage >= 60) label = "D";

    return { label, percentage, color: getGradeColor(percentage) };
  };

  if (loadingGrades || loadingAssignments || loadingSchedule) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  // Generate last 3 academic years for the dropdown
  const yearsOptions = [
    `${currentYear - 2}-${currentYear - 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear}-${currentYear + 1}`
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">{t("student.myGrades", "My Grades")}</h1>
          <p className="text-muted-foreground mt-2">{t("student.myGradesDesc", "View your academic performance across all subjects.")}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger className="w-[180px] rounded-xl font-bold bg-secondary/50 border-transparent hover:bg-secondary">
              <SelectValue placeholder={t("student.academicYear", "Academic Year")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {yearsOptions.map(y => (
                <SelectItem key={y} value={y} className="font-medium rounded-lg">
                  {y} {t("student.yearLabel", "Year")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {subjectGroups.length === 0 ? (
        <div className="p-16 rounded-[32px] border-2 border-dashed text-center text-muted-foreground bg-secondary/5">
          <Award className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg">{t("student.noGrades", "No grades available yet")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="space-y-4">
            {subjectGroups.map((subject) => {
              const overall = getOverallGrade(subject.totalScore, subject.maxScore);
              
              return (
                <AccordionItem 
                  key={subject.subjectId} 
                  value={subject.subjectId}
                  className="border rounded-[28px] bg-card overflow-hidden shadow-sm data-[state=open]:shadow-md transition-all data-[state=open]:border-primary/30 px-2"
                >
                  <AccordionTrigger className="hover:no-underline px-4 py-6">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <div className={cn("h-14 w-14 rounded-2xl flex flex-col items-center justify-center border", overall.color)}>
                          <span className="text-xl font-black">{overall.label}</span>
                          {overall.percentage > 0 && <span className="text-[10px] font-bold opacity-80">{overall.percentage.toFixed(0)}%</span>}
                        </div>
                        <div className="flex flex-col items-start">
                          <h3 className="text-xl font-black tracking-tight">{subject.subjectName}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <span className="opacity-70">{subject.grades.length} {t("teacher.grades", "Grades")}</span>
                            <span>•</span>
                            <span className="font-medium truncate max-w-[150px] sm:max-w-xs">{subject.teacherName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="space-y-6">
                      
                      {/* Teacher Contact Row */}
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {subject.teacherName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">{t("crud.teacher", "Teacher")}</p>
                            <p className="font-bold">{subject.teacherName}</p>
                          </div>
                        </div>
                        {subject.teacherId && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className="rounded-xl font-bold shrink-0"
                            onClick={() => navigate(`/app/communication?user_id=${subject.teacherId}`)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">{t("communication.message", "Message")}</span>
                          </Button>
                        )}
                      </div>

                      {/* Grades Grid */}
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">{t("teacher.grades", "Grades")}</h4>
                        {subject.grades.length === 0 ? (
                           <div className="text-center py-6 border border-dashed rounded-2xl text-muted-foreground">
                             {t("student.noGradesYet", "No grades received for this subject yet.")}
                           </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {subject.grades.map((grade) => {
                              const maxPoints = grade.assignment?.max_points || 100;
                              const perc = (grade.score / maxPoints) * 100;
                              const color = getGradeColor(perc);

                              return (
                                <HoverCard key={grade.id} openDelay={200}>
                                  <HoverCardTrigger asChild>
                                    <div className="p-4 rounded-2xl border bg-background hover:border-primary/30 transition-all cursor-help flex items-center justify-between group">
                                      <div className="flex flex-col gap-1 pr-2">
                                        <p className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                          {grade.assignment?.title || t("assignments.grade", "Grade")}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <CalendarIcon className="h-3 w-3" />
                                          {format(new Date(grade.created_at), "MMM d, yyyy")}
                                        </p>
                                      </div>
                                      <div className={cn("h-10 px-3 rounded-xl flex items-center justify-center font-black border shrink-0", color)}>
                                        {grade.score} <span className="text-[10px] opacity-60 ml-0.5">/ {maxPoints}</span>
                                      </div>
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80 rounded-2xl p-4 shadow-xl border-border/50" align="end">
                                    <div className="space-y-3">
                                      <div className="flex items-start justify-between gap-4">
                                        <h4 className="font-black leading-tight text-lg">{grade.assignment?.title || t("assignments.grade", "Grade")}</h4>
                                        {grade.assignment?.type_of_work && (
                                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-secondary rounded-md shrink-0">
                                            {grade.assignment.type_of_work}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {grade.assignment?.description ? (
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          {grade.assignment.description}
                                        </p>
                                      ) : (
                                        <div className="flex items-center text-muted-foreground opacity-60 text-sm italic">
                                          <Info className="h-4 w-4 mr-2" />
                                          {t("common.noDescription", "No description provided")}
                                        </div>
                                      )}

                                      {grade.comments && (
                                        <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm italic">
                                          <span className="font-bold not-italic text-xs block mb-1 uppercase tracking-wider">{t("teacher.comment", "Teacher Comment")}:</span>
                                          "{grade.comments}"
                                        </div>
                                      )}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
}
