import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { BentoCard } from "@/components/BentoCard";
import { toast } from "sonner";
import { FileText, Plus, Calendar, AlertCircle, Info, Upload, ArrowLeft, Loader2, Save, GraduationCap, MoreHorizontal, Edit, Trash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/integrations/api/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudents, useAssignments, useClassGrades } from "@/hooks/useApiData";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface SubjectInfo {
  id: string;
  name: string;
  days: number[];
}
interface ClassGroup {
  id: string;
  name: string;
  subjects: SubjectInfo[];
}

const WORK_TYPES = [
  { id: "Homework", weight: 1, key: "homework" },
  { id: "FA", weight: 2, key: "fa" },
  { id: "SAU", weight: 3, key: "sau" },
  { id: "Group Project", weight: 4, key: "group_project" },
  { id: "Midterm / Final", weight: 5, key: "midterm_final" }
] as const;

export default function AddAssignment() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState("assign");
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  
  // Assign form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workType, setWorkType] = useState<string>(WORK_TYPES[0].id);
  const [dueDate, setDueDate] = useState<string>("");
  const [maxPoints, setMaxPoints] = useState<number>(100);
  
  const [workload, setWorkload] = useState<Record<string, number>>({});
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  
  // Edit Assignment State
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMaxPoints, setEditMaxPoints] = useState(100);
  const [editDueDate, setEditDueDate] = useState("");
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);

  useEffect(() => {
    async function loadClasses() {
      setIsLoadingClasses(true);
      try {
        const data = await api.get<ClassGroup[]>("/assignments/classes");
        setClasses(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingClasses(false);
      }
    }
    if (accessToken) {
      loadClasses();
    }
  }, [accessToken]);

  const selectedClassObj = useMemo(() => classes.find(c => c.id === selectedClass), [classes, selectedClass]);
  
  const availableDates = useMemo(() => {
    if (!selectedClassObj || !selectedSubject) return [];
    const subj = selectedClassObj.subjects.find(s => s.id === selectedSubject);
    if (!subj || !subj.days || subj.days.length === 0) return [];
    const dates = [];
    let current = new Date();
    while (dates.length < 15) {
        const mappedDay = current.getDay() === 0 ? 6 : current.getDay() - 1; 
        if (subj.days.includes(mappedDay)) {
            dates.push(current.toISOString().split("T")[0]);
        }
        current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [selectedClassObj, selectedSubject]);

  useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(dueDate)) {
      setDueDate(availableDates[0]);
    }
  }, [availableDates, dueDate]);

  // Load workload
  useEffect(() => {
    async function loadWorkload() {
      if (!selectedClass) {
        setWorkload({});
        return;
      }
      try {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay() + 1);
        const end = new Date(start);
        end.setDate(start.getDate() + 4);
        
        const startStr = start.toISOString().split("T")[0];
        const endStr = end.toISOString().split("T")[0];
        
        const data = await api.get<Record<string, number>>(`/assignments/workload/${selectedClass}?start_date=${startStr}&end_date=${endStr}`);
        setWorkload(data);
      } catch (e) {
        console.error(e);
      }
    }
    loadWorkload();
  }, [selectedClass, accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || !title || !workType || !dueDate) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post("/assignments", {
        class_id: selectedClass,
        subject_id: selectedSubject,
        title,
        description,
        type_of_work: workType,
        due_date: dueDate,
        max_points: maxPoints
      });
      toast.success(t("assignments.success_added"));
      setTitle("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    } catch (e) {
      toast.error(t("assignments.error_adding"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedWorkWeight = WORK_TYPES.find(w => w.id === workType)?.weight || 1;

  // Gradebook Data
  const { data: students = [] } = useStudents(selectedClass);
  const { data: assignments = [] } = useAssignments(user?.id, selectedClass);
  const { data: grades = [] } = useClassGrades(selectedClass, selectedSubject);

  const subjectAssignments = useMemo(() => 
    assignments.filter(a => a.subject_id === selectedSubject), 
  [assignments, selectedSubject]);

  const [localGrades, setLocalGrades] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    grades.forEach(g => {
      if (g.assignment_id) {
        map[`${g.student_id}_${g.assignment_id}`] = g.score.toString();
      }
    });
    setLocalGrades(map);
  }, [grades]);

  const handleSaveAllGrades = async () => {
    setIsSavingGrades(true);
    try {
      let count = 0;
      for (const student of students) {
        for (const assignment of subjectAssignments) {
          const key = `${student.id}_${assignment.id}`;
          const valStr = localGrades[key];
          
          const existing = grades.find(g => g.student_id === student.id && g.assignment_id === assignment.id);
          
          if (valStr && valStr.trim() !== "") {
            const numVal = parseFloat(valStr);
            if (!existing || existing.score !== numVal) {
              await api.post("/grades", {
                student_id: student.id,
                subject_id: selectedSubject,
                assignment_id: assignment.id,
                score: numVal,
                semester: "2025-2026",
                comments: assignment.title
              });
              count++;
            }
          } else if (existing && (!valStr || valStr.trim() === "")) {
            // Delete grade if input was cleared
            await api.delete(`/grades/${existing.id}`);
            count++;
          }
        }
      }
      toast.success(t("assignments.grades_saved_count", { count, defaultValue: `Saved ${count} changes!` }));
      queryClient.invalidateQueries({ queryKey: ["classGrades"] });
    } catch (e) {
      toast.error("Error saving grades");
    } finally {
      setIsSavingGrades(false);
    }
  };

  const openEditModal = (assignment: any) => {
    setEditingAssignment(assignment);
    setEditTitle(assignment.title);
    setEditMaxPoints(assignment.max_points || 100);
    setEditDueDate(assignment.due_date || availableDates[0] || "");
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment) return;
    setIsUpdatingAssignment(true);
    try {
      await api.put(`/assignments/${editingAssignment.id}`, {
        title: editTitle,
        max_points: editMaxPoints,
        due_date: editDueDate,
      });
      toast.success(t("assignments.success_updated", "Assignment updated"));
      setEditingAssignment(null);
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    } catch (e) {
      toast.error(t("assignments.error_updating", "Error updating assignment"));
    } finally {
      setIsUpdatingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm(t("assignments.confirm_delete", "Are you sure you want to delete this assignment and ALL its grades?"))) return;
    try {
      await api.delete(`/assignments/${id}`);
      toast.success(t("assignments.success_deleted", "Assignment deleted"));
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    } catch (e) {
      toast.error(t("assignments.error_deleting", "Error deleting assignment"));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("assignments.assignment_manager", "Assignments & Grades")}</h1>
          <p className="text-muted-foreground">{t("assignments.weight_system")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("assignments.choose_class")}</label>
          <select 
            value={selectedClass} 
            onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject(""); }} 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>{t("assignments.choose_class")}</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {selectedClass && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("assignments.choose_subject", "Choose Subject")}</label>
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)} 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="" disabled>{t("assignments.select_subject", "Select Subject")}</option>
              {selectedClassObj?.subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {selectedClass && selectedSubject && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 h-12 rounded-2xl">
            <TabsTrigger value="assign" className="rounded-xl font-bold text-base h-full">{t("assignments.add_assignment")}</TabsTrigger>
            <TabsTrigger value="gradebook" className="rounded-xl font-bold text-base h-full">{t("assignments.gradebook", "Gradebook")}</TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="space-y-6">
            <BentoCard icon={<FileText className="h-5 w-5" />} title={t("assignments.add_assignment")}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("assignments.title")}</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder={t("assignments.title")} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("assignments.description")}</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder={t("assignments.description")} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      {t("assignments.type_of_work")}
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md">Koef: {selectedWorkWeight}</span>
                    </label>
                    <select value={workType} onChange={(e) => setWorkType(e.target.value)} className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm">
                      {WORK_TYPES.map(w => <option key={w.id} value={w.id}>{t(`assignments.work_type.${w.key}`)}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("assignments.max_points", "Max Points")}</label>
                    <input type="number" min="1" max="1000" required value={maxPoints} onChange={e => setMaxPoints(parseInt(e.target.value))} className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("assignments.due_date_lessons", "Due Date (Lesson Days Only)")}</label>
                    <select value={dueDate} onChange={e => setDueDate(e.target.value)} className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm border-primary/50" required>
                      {availableDates.length === 0 ? <option value="" disabled>{t("assignments.no_lessons", "No upcoming lessons")}</option> : null}
                      {availableDates.map(d => {
                        const dateObj = new Date(d);
                        return <option key={d} value={d}>{d} ({dateObj.toLocaleDateString(undefined, {weekday:'short'})})</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Button type="submit" disabled={isSubmitting} className="h-12 px-8 rounded-xl font-bold">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                    {t("assignments.assign")}
                  </Button>
                </div>
              </form>
            </BentoCard>
          </TabsContent>

          <TabsContent value="gradebook" className="space-y-6">
            <BentoCard icon={<GraduationCap className="h-5 w-5" />} title={t("assignments.gradebook_panel", "Gradebook Panel")}>
              <div className="w-full overflow-x-auto rounded-xl border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 font-medium">
                    <tr>
                      <th className="px-4 py-3 min-w-[200px] border-b border-r">{t("assignments.student_name", "Student Name")}</th>
                      {subjectAssignments.map(a => {
                         const dateObj = new Date(a.due_date);
                         const dateStr = !isNaN(dateObj.getTime()) ? `${dateObj.getDate()}/${dateObj.getMonth() + 1}` : "";
                         return (
                           <th key={a.id} className="px-2 py-2 min-w-[120px] max-w-[160px] border-b border-r bg-card align-top group hover:bg-muted/30 transition-colors">
                             <div className="flex items-start justify-between gap-1">
                               <div className="flex flex-col">
                                 <span className="text-[10px] font-bold text-muted-foreground uppercase">{dateStr}</span>
                                 <span className="font-bold text-xs truncate max-w-[120px]" title={a.title}>{a.title}</span>
                               </div>
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <MoreHorizontal className="h-4 w-4" />
                                   </Button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                   <DropdownMenuItem onClick={() => openEditModal(a)} className="cursor-pointer">
                                     <Edit className="h-4 w-4 mr-2 text-primary" /> {t("assignments.edit", "Edit Assignment")}
                                   </DropdownMenuItem>
                                   <DropdownMenuItem onClick={() => handleDeleteAssignment(a.id)} className="cursor-pointer text-destructive focus:text-destructive">
                                     <Trash className="h-4 w-4 mr-2" /> {t("assignments.delete", "Delete")}
                                   </DropdownMenuItem>
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             </div>
                             <div className="text-[10px] text-muted-foreground mt-2 inline-flex items-center gap-1.5 bg-background border px-1.5 py-0.5 rounded shadow-sm">
                               <span className="font-semibold text-primary">W:{a.weight}</span>
                               <span className="opacity-50">|</span>
                               <span>Max:{a.max_points}</span>
                             </div>
                           </th>
                         );
                      })}
                      <th className="px-4 py-3 min-w-[100px] border-b text-center font-black bg-primary/5 text-primary">OVERALL %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      let totalPointsEarned = 0;
                      let totalMaxPointsWeighted = 0;
                      
                      const studentCells = subjectAssignments.map(a => {
                        const key = `${student.id}_${a.id}`;
                        const val = localGrades[key] || "";
                        
                        if (val && !isNaN(parseFloat(val))) {
                           const s = parseFloat(val);
                           totalPointsEarned += (s / a.max_points) * 100 * a.weight;
                           totalMaxPointsWeighted += 100 * a.weight;
                        }

                        return (
                          <td key={a.id} className="px-1 py-1 border-b border-r relative group/cell focus-within:bg-primary/5 transition-colors">
                            <Input 
                              type="number" 
                              min="0" max={a.max_points}
                              className="w-full h-10 text-center bg-transparent border-transparent group-hover/cell:border-primary/20 focus-visible:border-primary font-bold shadow-none text-base"
                              value={val}
                              placeholder="-"
                              onChange={(e) => setLocalGrades(prev => ({ ...prev, [key]: e.target.value }))}
                            />
                            {val !== "" && (val > a.max_points) && (
                              <div className="absolute top-0 right-0 p-1">
                                <AlertCircle className="h-3 w-3 text-destructive" />
                              </div>
                            )}
                          </td>
                        );
                      });

                      const overallPercent = totalMaxPointsWeighted > 0 
                         ? ((totalPointsEarned / totalMaxPointsWeighted) * 100).toFixed(1)
                         : "-";

                      return (
                        <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 border-b border-r font-semibold">{student.name}</td>
                          {studentCells}
                          <td className="px-4 py-3 border-b text-center font-black text-primary bg-primary/5 text-lg">
                            {overallPercent !== "-" ? `${overallPercent}%` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-between items-center bg-muted/20 p-4 rounded-xl border">
                 <div className="text-sm text-muted-foreground">
                   {t("assignments.gradebook_hint", "Empty cells are not counted towards the overall average. Use 0 for missed assignments.")}
                 </div>
                 <Button onClick={handleSaveAllGrades} disabled={isSavingGrades} className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
                   {isSavingGrades ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                   {t("assignments.save_all", "Save All Grades")}
                 </Button>
              </div>
            </BentoCard>
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Assignment Modal */}
      <Dialog open={!!editingAssignment} onOpenChange={(open) => !open && setEditingAssignment(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{t("assignments.edit", "Edit Assignment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("assignments.title")}</label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("assignments.max_points", "Max Points")}</label>
              <Input type="number" min="1" value={editMaxPoints} onChange={e => setEditMaxPoints(parseInt(e.target.value))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("assignments.due_date_lessons", "Due Date")}</label>
              <select value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm border-primary/50" required>
                {availableDates.map(d => {
                  const dateObj = new Date(d);
                  return <option key={d} value={d}>{d} ({dateObj.toLocaleDateString(undefined, {weekday:'short'})})</option>;
                })}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditingAssignment(null)}>{t("common.cancel", "Cancel")}</Button>
            <Button onClick={handleUpdateAssignment} disabled={isUpdatingAssignment} className="rounded-xl">
              {isUpdatingAssignment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("common.save", "Save Changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
