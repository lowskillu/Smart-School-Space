import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Loader2, Edit3, Users, BookOpen, ChevronRight, ChevronDown,
  Save, X, Trash2, AlertTriangle, Gauge, Paperclip, FileText,
  Clock, Zap, CheckCircle2, BookMarked, Upload, Calendar, XCircle,
  Award, ClipboardCheck, Info, Lock, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudents, useBatchUpsertGrades, useGradesByClass, useAssignments } from "@/hooks/useApiData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface TeacherClass { id: string; name: string; subjects: { id: string; name: string; days: number[] }[]; }

const WORK_TYPES = [
  { id: "Homework", weight: 1, label: "HW", icon: BookMarked, retakeable: true, color: "from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-600 dark:text-sky-400", pill: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  { id: "FA", weight: 2, label: "FA", icon: CheckCircle2, retakeable: true, color: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-600 dark:text-violet-400", pill: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  { id: "Quiz", weight: 2, label: "QZ", icon: ClipboardCheck, retakeable: false, color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-600 dark:text-cyan-400", pill: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  { id: "SAU", weight: 3, label: "SAU", icon: Zap, retakeable: false, color: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-600 dark:text-amber-400", pill: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { id: "SOCh", weight: 4, label: "SOCh", icon: Award, retakeable: false, color: "from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-600 dark:text-orange-400", pill: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  { id: "Group Project", weight: 4, label: "GP", icon: Users, retakeable: true, color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400", pill: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { id: "Midterm / Final", weight: 5, label: "MF", icon: FileText, retakeable: false, color: "from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-600 dark:text-rose-400", pill: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
] as const;
const MAX_DAILY_WEIGHT = 10;

const getLetterGrade = (p: number) => {
  if (p >= 97) return "A+";
  if (p >= 93) return "A";
  if (p >= 90) return "A-";
  if (p >= 87) return "B+";
  if (p >= 83) return "B";
  if (p >= 80) return "B-";
  if (p >= 77) return "C+";
  if (p >= 73) return "C";
  if (p >= 70) return "C-";
  if (p >= 67) return "D+";
  if (p >= 63) return "D";
  if (p >= 60) return "D-";
  return "F";
};

export default function TeacherGrades() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: teacherClasses = [], isLoading: loadingClasses } = useQuery<TeacherClass[]>({
    queryKey: ["teacher_classes"], queryFn: () => api.get<TeacherClass[]>("/assignments/classes"),
  });

  const [selClass, setSelClass] = useState<TeacherClass | null>(null);
  const [selSubject, setSelSubject] = useState<{ id: string; name: string } | null>(null);
  const [assignDlg, setAssignDlg] = useState(false);
  const [editingAssign, setEditingAssign] = useState<any>(null);
  const [aTitle, setATitle] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aType, setAType] = useState(WORK_TYPES[0].id);
  const [aMax, setAMax] = useState(100);
  const [aDue, setADue] = useState("");
  const [aAttach, setAAttach] = useState("");
  const [aAttachName, setAAttachName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aSaving, setASaving] = useState(false);
  const [aRetakeable, setARetakeable] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { data: students = [] } = useStudents(selClass?.id);
  const { data: classGrades = [] } = useGradesByClass(selClass?.id, selSubject?.id);
  const { data: assignments = [] } = useAssignments(undefined, selClass?.id);
  const batchGrades = useBatchUpsertGrades();

  const [scores, setScores] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [workload, setWorkload] = useState<Record<string, number>>({});

  const filteredAssignments = useMemo(() => {
    if (!selSubject) return assignments;
    return (assignments as any[]).filter(a => a.subject_id === selSubject.id).sort((a: any, b: any) => a.due_date?.localeCompare(b.due_date));
  }, [assignments, selSubject]);

  useEffect(() => {
    const m: Record<string, string> = {};
    (classGrades as any[]).forEach(g => {
      if (g.assignment_id && g.student_id) m[`${g.student_id}_${g.assignment_id}`] = String(g.score ?? "");
    });
    setScores(m); setDirty(false);
  }, [classGrades]);

  useEffect(() => {
    if (!selClass?.id) return;
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - 14);
    const end = new Date(now); end.setDate(now.getDate() + 60);
    api.get<Record<string, number>>(`/assignments/workload/${selClass.id}?start_date=${start.toISOString().split("T")[0]}&end_date=${end.toISOString().split("T")[0]}`)
      .then(setWorkload).catch(() => {});
  }, [selClass?.id, assignments]);

  const availDates = useMemo(() => {
    if (!selClass || !selSubject) return [];
    const cls = teacherClasses.find(c => c.id === selClass.id);
    const subj = cls?.subjects.find(s => s.id === selSubject.id);
    if (!subj?.days?.length) return [];
    const dates: string[] = []; let d = new Date();
    while (dates.length < 20) {
      const mapped = d.getDay() === 0 ? 6 : d.getDay() - 1;
      if (subj.days.includes(mapped)) dates.push(d.toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [selClass, selSubject, teacherClasses]);

  const studentAvgs = useMemo(() => {
    const avgs: Record<string, { earned: number; total: number }> = {};
    students.forEach(s => { avgs[s.id] = { earned: 0, total: 0 }; });
    filteredAssignments.forEach((a: any) => {
      students.forEach(s => {
        const val = scores[`${s.id}_${a.id}`];
        if (val && !isNaN(parseFloat(val))) {
          avgs[s.id].earned += (parseFloat(val) / a.max_points) * 100 * a.weight;
          avgs[s.id].total += 100 * a.weight;
        }
      });
    });
    return avgs;
  }, [students, filteredAssignments, scores]);


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await api.postMultipart<{ url: string; filename: string }>("/upload", fd);
      setAAttach(data.url); setAAttachName(data.filename);
      toast.success(t("assignments.fileUploaded", "File uploaded!"));
    } catch (err: any) { toast.error(err.message || t("common.error")); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const openNewAssign = () => {
    setEditingAssign(null); setATitle(""); setADesc(""); setAType(WORK_TYPES[0].id);
    setAMax(100); setADue(availDates[0] || ""); setAAttach(""); setAAttachName("");
    setARetakeable(WORK_TYPES[0].retakeable); setAssignDlg(true);
  };
  const openEditAssign = (a: any) => {
    setEditingAssign(a); setATitle(a.title); setADesc(a.description || ""); setAType(a.type_of_work);
    setAMax(a.max_points); setADue(a.due_date); setAAttach(a.attachment_url || ""); setAAttachName("");
    setARetakeable(a.retakeable ?? false); setAssignDlg(true);
  };
  const saveAssign = async () => {
    if (!aTitle || !aDue || !selClass || !selSubject) return;
    setASaving(true);
    try {
      const body = { title: aTitle, description: aDesc, type_of_work: aType, max_points: aMax, due_date: aDue, attachment_url: aAttach || null, retakeable: aRetakeable };
      if (editingAssign) await api.put(`/assignments/${editingAssign.id}`, body);
      else await api.post("/assignments", { ...body, class_id: selClass.id, subject_id: selSubject.id });
      toast.success(editingAssign ? t("assignments.success_updated") : t("assignments.success_added"));
      qc.invalidateQueries({ queryKey: ["assignments"] }); setAssignDlg(false);
    } catch { toast.error(t("common.error")); } finally { setASaving(false); }
  };
  const deleteAssign = async (id: string) => {
    if (!confirm(t("assignments.confirm_delete"))) return;
    try { await api.delete(`/assignments/${id}`); qc.invalidateQueries({ queryKey: ["assignments"] }); qc.invalidateQueries({ queryKey: ["grades_class"] }); } catch { toast.error(t("common.error")); }
  };
  const saveAllGrades = async () => {
    if (!selSubject) return;
    const records = Object.entries(scores).filter(([, v]) => v !== "" && !isNaN(parseFloat(v)))
      .map(([key, val]) => { const [sid, aid] = key.split("_"); return { student_id: sid, subject_id: selSubject.id, assignment_id: aid, score: parseFloat(val), semester: "2025-2026" }; });
    if (!records.length) return;
    try { await batchGrades.mutateAsync(records); toast.success(t("teacher.gradesSaved")); setDirty(false); } catch { toast.error(t("common.error")); }
  };

  const selectedWt = WORK_TYPES.find(w => w.id === aType);
  const dueDateLoad = workload[aDue] || 0;
  const newLoad = dueDateLoad + (selectedWt?.weight || 1);
  const wouldExceed = newLoad > MAX_DAILY_WEIGHT;
  const loadPct = Math.min((newLoad / MAX_DAILY_WEIGHT) * 100, 100);

  if (loadingClasses) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  if (!selClass || !selSubject) {
    const CARD_COLORS = [
      "from-sky-500 to-blue-600", "from-violet-500 to-purple-600", "from-amber-500 to-orange-600",
      "from-emerald-500 to-green-600", "from-rose-500 to-pink-600", "from-cyan-500 to-teal-600",
      "from-fuchsia-500 to-purple-600", "from-lime-500 to-emerald-600"
    ];
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in duration-500">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">{t("teacher.grades")}</h1>
            <p className="text-muted-foreground mt-1">{t("teacher.selectClassSubject")}</p>
          </div>
          <div className="text-sm text-muted-foreground font-bold">{teacherClasses.length} {t("crud.subjects", "classes")}</div>
        </div>
        {teacherClasses.length === 0 ? (
          <div className="p-16 rounded-3xl border-2 border-dashed text-center text-muted-foreground"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" /><p className="font-bold">{t("teacher.noClasses")}</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {teacherClasses.map((cls, ci) => (
              <div key={cls.id} className="group relative overflow-hidden rounded-3xl border bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                {/* Color header strip */}
                <div className={cn("h-2 w-full bg-gradient-to-r", CARD_COLORS[ci % CARD_COLORS.length])} />
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-12 w-12 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center font-black text-lg shadow-lg", CARD_COLORS[ci % CARD_COLORS.length])}>
                      {cls.name.replace(/[^A-Za-zА-Яа-я0-9]/g, '').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-lg leading-tight">{cls.name}</h3>
                      <p className="text-xs text-muted-foreground">{cls.subjects.length} {cls.subjects.length === 1 ? t("crud.subjects", "subject") : t("crud.subjects", "subjects")}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {cls.subjects.map(subj => (
                      <button key={subj.id} onClick={() => { setSelClass(cls); setSelSubject(subj); }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-secondary/30 hover:bg-primary/10 hover:text-primary transition-all text-left group/btn">
                        <div className="flex items-center gap-2.5">
                          <div className="h-2 w-2 rounded-full bg-primary/40 group-hover/btn:bg-primary transition-colors" />
                          <span className="font-bold text-sm">{subj.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-bold">{subj.days.length}x/{t("common.perWeek", "week")}</span>
                          <ChevronRight className="h-4 w-4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-[100vw] mx-auto p-4 sm:p-6 space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelClass(null); setSelSubject(null); }} className="h-10 w-10 rounded-2xl bg-secondary/80 flex items-center justify-center hover:bg-primary/10 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{selSubject.name}</h1>
            <p className="text-muted-foreground text-sm">{selClass.name} • {students.length} {t("sidebar.students", "students")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openNewAssign} className="rounded-xl gap-2 font-bold hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all">
            <Plus className="h-4 w-4" /> {t("teacher.createAssignment")}
          </Button>
          {dirty && (
            <Button size="sm" onClick={saveAllGrades} disabled={batchGrades.isPending} className="rounded-xl gap-2 font-bold bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
              {batchGrades.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("common.save")}
            </Button>
          )}
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed bg-card/50 p-16 text-center space-y-4">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-primary/30" />
          </div>
          <div>
            <h3 className="text-xl font-black">{t("assignments.gradebook")}</h3>
            <p className="text-muted-foreground mt-1 max-w-md mx-auto">{t("assignments.gradebook_hint")}</p>
          </div>
          <Button onClick={openNewAssign} className="rounded-2xl gap-2 font-bold mt-4 h-12 px-6 shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5" /> {t("teacher.createAssignment")}
          </Button>
        </div>
      ) : (
        <>
          {/* Assignment type summary pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {WORK_TYPES.map(wt => {
              const count = filteredAssignments.filter((a: any) => a.type_of_work === wt.id).length;
              if (!count) return null;
              return (
                <div key={wt.id} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold", wt.pill)}>
                  <wt.icon className="h-3.5 w-3.5" />
                  <span>{wt.label}</span>
                  <span className="opacity-60">×{count}</span>
                </div>
              );
            })}
            <div className="ml-auto text-xs text-muted-foreground font-bold">{filteredAssignments.length} {t("tiles.assignments", "assignments")}</div>
          </div>

          {/* ── EduPage-style Gradebook Grid ── */}
          <div className="overflow-x-auto rounded-2xl border border-border/60 shadow-sm">
            <table className="w-full text-[13px] border-collapse" style={{ minWidth: `${200 + filteredAssignments.length * 130 + 90}px` }}>
              <thead>
                <tr className="bg-muted/30">
                  {/* Student column header */}
                  <th className="text-left py-2.5 px-3 font-black text-[10px] uppercase tracking-widest sticky left-0 bg-muted/30 z-20 min-w-[200px] border-r border-b border-border/40">
                    {t("common.student")}
                  </th>
                  {/* Assignment columns */}
                  {filteredAssignments.map((a: any) => {
                    const wt = WORK_TYPES.find(w => w.id === a.type_of_work);
                    return (
                      <th key={a.id} className="border-r border-b border-border/40 min-w-[120px] max-w-[140px] group relative p-0">
                        <div className={cn("h-1 w-full", wt?.id === "Homework" ? "bg-sky-500" : wt?.id === "FA" ? "bg-violet-500" : wt?.id === "SAU" ? "bg-amber-500" : wt?.id === "Group Project" ? "bg-emerald-500" : "bg-rose-500")} />
                        <div className="px-2 py-2 flex flex-col items-center gap-0.5">
                          <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded leading-none", wt?.pill)}>{wt?.label || a.type_of_work}</span>
                          <span className="text-[10px] font-bold truncate max-w-[110px] block leading-tight text-foreground" title={a.title}>{a.title}</span>
                          <span className="text-[9px] text-muted-foreground/70">{a.due_date?.slice(5)} • /{a.max_points}</span>
                        </div>
                        {/* Edit/Delete on hover */}
                        <div className="absolute top-2 right-1 opacity-0 group-hover:opacity-100 flex flex-col gap-0.5 transition-opacity z-10">
                          <button onClick={() => openEditAssign(a)} className="p-0.5 rounded bg-card/90 hover:bg-primary/20 shadow-sm backdrop-blur-sm"><Edit3 className="h-3 w-3" /></button>
                          <button onClick={() => deleteAssign(a.id)} className="p-0.5 rounded bg-card/90 hover:bg-destructive/20 text-destructive shadow-sm backdrop-blur-sm"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-2.5 px-3 text-center font-black text-[10px] uppercase tracking-widest min-w-[80px] bg-muted/30 border-b border-border/40">{t("teacher.average", "AVG")}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const avg = studentAvgs[student.id];
                  const pct = avg?.total > 0 ? (avg.earned / avg.total) * 100 : -1;
                  return (
                    <tr key={student.id} className={cn("transition-colors", idx % 2 === 0 ? "" : "bg-muted/[0.04]")}>
                      {/* Student name — sticky left */}
                      <td className="py-1.5 px-3 sticky left-0 z-10 border-r border-b border-border/30 bg-inherit">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[13px] truncate max-w-[150px] leading-tight">{student.name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Grade cells — EduPage style with colored backgrounds */}
                      {filteredAssignments.map((a: any) => {
                        const key = `${student.id}_${a.id}`;
                        const wt = WORK_TYPES.find(w => w.id === a.type_of_work);
                        const val = scores[key] ?? "";
                        const num = parseFloat(val);
                        const hasValue = val !== "" && !isNaN(num);
                        const over = hasValue && num > a.max_points;
                        const pctScore = hasValue ? (num / a.max_points) * 100 : -1;

                        // EduPage color scheme
                        const cellBg = !hasValue ? "" :
                          over ? "bg-purple-600/80 text-white" :
                          pctScore >= 80 ? "bg-emerald-600/70 text-white" :
                          pctScore >= 60 ? "bg-amber-500/70 text-white" :
                          pctScore >= 40 ? "bg-orange-600/70 text-white" :
                          "bg-red-700/70 text-white";

                        return (
                          <td key={a.id} className="p-0 border-r border-b border-border/30 text-center relative group/cell">
                            {hasValue ? (
                              <HoverCard openDelay={100} closeDelay={100}>
                                <HoverCardTrigger asChild>
                                  <div className={cn("px-1 py-1 mx-0.5 my-0.5 rounded-md cursor-pointer transition-all hover:brightness-110 hover:shadow-sm", cellBg)}
                                    onClick={() => {
                                      const el = document.getElementById(`grade-${key}`);
                                      if (el) { (el as HTMLInputElement).style.display = "block"; (el as HTMLInputElement).focus(); }
                                    }}>
                                    <div className="text-[12px] font-bold leading-tight whitespace-nowrap">
                                      {num} / {a.max_points} = {pctScore.toFixed(0)}%
                                    </div>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent side="top" className="w-52 p-3 text-left text-xs space-y-1.5 shadow-xl rounded-xl z-[100]">
                                  <p className="font-black text-sm truncate">{a.title}</p>
                                  <div className="flex items-center gap-1.5"><span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded", wt?.pill)}>{wt?.label}</span><span className="text-muted-foreground">W:{a.weight || wt?.weight}</span></div>
                                  <hr className="border-border/40" />
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between"><span className="text-muted-foreground">{t("common.total", "Score")}:</span><span className="font-bold">{num} / {a.max_points}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">%:</span><span className="font-bold">{pctScore.toFixed(1)}%</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">{t("assignments.weight_system", "Weight")}:</span><span className="font-bold">×{a.weight || wt?.weight}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">{t("teacher.average", "Contrib.")}:</span><span className="font-bold">{(pctScore * (a.weight || wt?.weight || 1)).toFixed(0)} / {(100 * (a.weight || wt?.weight || 1))}</span></div>
                                  </div>
                                  {(a.retakeable ?? wt?.retakeable) ? (
                                    <p className="text-emerald-500 text-[10px] font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{t("assignments.retakeable", "Can retake")}</p>
                                  ) : (
                                    <p className="text-muted-foreground/60 text-[10px] font-bold flex items-center gap-1"><Lock className="h-3 w-3" />{t("assignments.nonRetakeable", "Cannot retake")}</p>
                                  )}
                                </HoverCardContent>
                              </HoverCard>
                            ) : (
                              <div className="px-1 py-2.5 text-muted-foreground/25 text-sm cursor-pointer hover:bg-muted/20 rounded-md mx-0.5 my-0.5"
                                onClick={() => {
                                  const el = document.getElementById(`grade-${key}`);
                                  if (el) { (el as HTMLInputElement).style.display = "block"; (el as HTMLInputElement).focus(); }
                                }}>
                                —
                              </div>
                            )}
                            <input
                              id={`grade-${key}`}
                              type="number" min="0" max={a.max_points}
                              value={val}
                              style={{ display: "none" }}
                              onBlur={e => { e.target.style.display = "none"; }}
                              onChange={e => { setScores(p => ({ ...p, [key]: e.target.value })); setDirty(true); }}
                              className="absolute inset-0 w-full h-full text-center bg-card border-2 border-primary rounded-md font-bold text-sm outline-none z-20"
                            />
                          </td>
                        );
                      })}

                      {/* Average column — with tooltip */}
                      <td className="py-1.5 px-2 text-center border-b border-border/30 relative">
                        {pct >= 0 ? (
                          <HoverCard openDelay={100} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <span className={cn(
                                "font-black text-[12px] px-2 py-1 rounded-md inline-block cursor-help",
                                pct >= 80 ? "bg-emerald-600/70 text-white" :
                                pct >= 60 ? "bg-amber-500/70 text-white" :
                                pct >= 40 ? "bg-orange-600/70 text-white" :
                                "bg-red-700/70 text-white"
                              )}>{pct.toFixed(0)}% {getLetterGrade(pct)}</span>
                            </HoverCardTrigger>
                            <HoverCardContent side="left" className="w-64 p-3 text-left text-xs space-y-2 shadow-xl rounded-xl z-[100]">
                              <p className="font-black text-sm">{student.name}</p>
                              <p className="text-muted-foreground text-[10px]">{t("marks.analysis", "Grade breakdown")}</p>
                              <hr className="border-border/40" />
                              <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                                {filteredAssignments.map((a: any) => {
                                  const wt = WORK_TYPES.find(w => w.id === a.type_of_work);
                                  const v = scores[`${student.id}_${a.id}`];
                                  const n = v ? parseFloat(v) : NaN;
                                  if (isNaN(n)) return null;
                                  const p = (n / a.max_points) * 100;
                                  const w = a.weight || wt?.weight || 1;
                                  return (
                                    <div key={a.id} className="flex items-center gap-1.5">
                                      <span className={cn("text-[8px] font-black px-1 py-0.5 rounded shrink-0", wt?.pill)}>{wt?.label}</span>
                                      <span className="flex-1 truncate text-[10px]">{a.title}</span>
                                      <span className={cn(
                                        "font-bold text-[10px] px-1.5 py-0.5 rounded text-white shrink-0",
                                        p >= 80 ? "bg-emerald-600/60" : p >= 60 ? "bg-amber-500/60" : p >= 40 ? "bg-orange-600/60" : "bg-red-700/60"
                                      )}>{p.toFixed(0)}%</span>
                                      <span className="text-[9px] text-muted-foreground shrink-0">×{w}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <hr className="border-border/40" />
                              <div className="flex justify-between font-bold">
                                <span>{t("teacher.average", "Average")}:</span>
                                <span className={cn(
                                  pct >= 80 ? "text-emerald-500" : pct >= 60 ? "text-amber-500" : pct >= 40 ? "text-orange-500" : "text-red-500"
                                )}>{pct.toFixed(1)}%</span>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          <span className="text-muted-foreground/20 font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr><td colSpan={filteredAssignments.length + 2} className="p-12 text-center text-muted-foreground">{t("teacher.noStudents")}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer hint */}
          <p className="text-xs text-muted-foreground px-1">{t("assignments.gradebook_hint")}</p>
        </>
      )}

      {/* ── Beautiful Assignment Dialog ── */}
      <Dialog open={assignDlg} onOpenChange={setAssignDlg}>
        <DialogContent className="sm:max-w-[950px] rounded-[32px] p-0 border-none shadow-2xl gap-0 max-h-[95vh] flex flex-col bg-card overflow-hidden">
          <div className="flex flex-col md:flex-row overflow-y-auto overflow-x-hidden h-full">
            {/* Left Column (Main Info) */}
            <div className="flex-1 p-8 md:pr-10 space-y-8 border-b md:border-b-0 md:border-r border-border/40">
              <DialogHeader className="pb-0 text-left">
                <div className="flex items-center gap-5">
                  <div className={cn("h-16 w-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0", selectedWt?.color)}>
                    {selectedWt && <selectedWt.icon className="h-8 w-8" />}
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black tracking-tight">
                      {editingAssign ? t("assignments.edit") : t("teacher.createAssignment")}
                    </DialogTitle>
                    <p className="text-base font-medium text-muted-foreground mt-1">{selSubject.name} • <span className="text-foreground">{selClass.name}</span></p>
                  </div>
                </div>
              </DialogHeader>

              {/* Work Type Cards */}
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("assignments.type_of_work")}</label>
                <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
                  {WORK_TYPES.map(wt => {
                    const sel = aType === wt.id;
                    return (
                      <button key={wt.id} onClick={() => setAType(wt.id)} className={cn(
                        "flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border-2 transition-all text-center group",
                        sel ? `bg-gradient-to-b ${wt.color} border-current shadow-md scale-[1.05]` : "border-transparent bg-secondary/40 hover:bg-secondary hover:shadow-sm opacity-70 hover:opacity-100"
                      )}>
                        <wt.icon className={cn("h-5 w-5 transition-transform", sel ? "" : "group-hover:scale-110")} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{wt.label}</span>
                        <span className="text-[9px] font-medium opacity-70">W:{wt.weight}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title + Description */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("assignments.title")}</label>
                  <Input value={aTitle} onChange={e => setATitle(e.target.value)} className="h-14 rounded-2xl font-bold text-lg px-5 bg-secondary/30 border-transparent focus-visible:border-primary shadow-inner" placeholder={t("teacher.gradeTitlePlaceholder")} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("assignments.description")}</label>
                  <textarea value={aDesc} onChange={e => setADesc(e.target.value)} rows={3} className="flex w-full rounded-2xl bg-secondary/30 border-transparent px-5 py-4 text-base font-medium focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary outline-none resize-none shadow-inner" placeholder={t("common.noDescription", "Optional description...")} />
                </div>
              </div>
            </div>

            {/* Right Column (Settings) */}
            <div className="w-full md:w-[400px] p-8 md:pl-10 space-y-8 bg-muted/10 shrink-0">
              {/* Points + Due Date row */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("assignments.max_points")}</label>
                  <Input type="number" min="1" value={aMax} onChange={e => setAMax(parseInt(e.target.value) || 100)} className="h-14 rounded-2xl font-black text-xl text-center bg-secondary/30 border-transparent focus-visible:border-primary shadow-inner" />
                </div>
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{t("teacher.dueDate")} <span className="normal-case font-medium opacity-60">({t("assignments.lessonDaysOnly", "lesson days only")})</span></label>
                  {/* Custom date picker */}
                  <button type="button" onClick={() => setDatePickerOpen(!datePickerOpen)} className="flex items-center justify-between h-14 w-full rounded-2xl bg-secondary/30 border border-transparent hover:border-primary/30 px-5 text-base font-bold outline-none transition-all shadow-inner">
                    {aDue ? (() => {
                      const obj = new Date(aDue);
                      return <span>{obj.toLocaleDateString(i18n.language || 'ru', { weekday: "short", day: "numeric", month: "short" })}</span>;
                    })() : <span className="text-muted-foreground">{t("extracourses.select_date", "Select date")}</span>}
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", datePickerOpen && "rotate-180")} />
                  </button>
                  {datePickerOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="max-h-[280px] overflow-y-auto p-2 space-y-1">
                        {availDates.map(d => {
                          const obj = new Date(d);
                          const wl = workload[d] || 0;
                          const loadPctLocal = ((wl + (selectedWt?.weight || 1)) / MAX_DAILY_WEIGHT) * 100;
                          const isOverloaded = wl + (selectedWt?.weight || 1) > MAX_DAILY_WEIGHT;
                          const isSel = aDue === d;
                          const isToday = d === new Date().toISOString().split('T')[0];
                          return (
                            <button key={d} onClick={() => { setADue(d); setDatePickerOpen(false); }} className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                              isSel ? "bg-primary/10 ring-1 ring-primary/40 shadow-sm" : "hover:bg-muted/60",
                              isOverloaded && "opacity-50"
                            )}>
                              <div className={cn("h-10 w-10 rounded-[10px] flex items-center justify-center shrink-0 text-sm font-black",
                                isToday ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                                {obj.getDate()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold capitalize">{obj.toLocaleDateString(i18n.language || 'ru', { weekday: "long", month: "short", day: "numeric" })}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all", isOverloaded ? "bg-destructive" : loadPctLocal > 70 ? "bg-amber-500" : "bg-primary")}
                                      style={{ width: `${Math.min(loadPctLocal, 100)}%` }} />
                                  </div>
                                  <span className={cn("text-[10px] font-bold shrink-0", isOverloaded ? "text-destructive" : "text-muted-foreground")}>{wl}/{MAX_DAILY_WEIGHT}</span>
                                </div>
                              </div>
                              {isSel && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* File Attachment */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Paperclip className="h-3 w-3" />{t("assignments.attachment")}</label>
                {aAttach ? (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                    <Paperclip className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-emerald-700 dark:text-emerald-300">{aAttachName || aAttach.split('/').pop()}</p>
                      <p className="text-[11px] font-medium text-emerald-600/70">{t("assignments.fileReady", "Ready to attach")}</p>
                    </div>
                    <button onClick={() => { setAAttach(""); setAAttachName(""); }} className="p-1.5 rounded-xl hover:bg-destructive/15 text-destructive/70 hover:text-destructive transition-colors"><XCircle className="h-5 w-5" /></button>
                  </div>
                ) : (
                  <label className={cn("flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 border-dashed cursor-pointer transition-all bg-background", uploading ? "opacity-60 pointer-events-none" : "hover:border-primary/50 hover:bg-primary/5 hover:shadow-inner")}>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.pptx,.xlsx,.zip,.txt" />
                    {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                    <span className="text-sm font-bold text-muted-foreground">{uploading ? t("common.loading", "Uploading...") : t("assignments.uploadFile", "Click to upload file")}</span>
                  </label>
                )}
              </div>

              {/* Retakeable Toggle */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3" />{t("assignments.retakeable_toggle", "Retake policy")}
                </label>
                <button type="button" onClick={() => setARetakeable(!aRetakeable)} className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left shadow-sm",
                  aRetakeable
                    ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                    : "bg-background border-transparent hover:border-border/50"
                )}>
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-inner",
                    aRetakeable ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-secondary text-muted-foreground")}>
                    {aRetakeable ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-[15px] font-bold", aRetakeable ? "text-emerald-700 dark:text-emerald-300" : "text-foreground")}>
                      {aRetakeable ? t("assignments.retakeable", "Can retake") : t("assignments.nonRetakeable", "Cannot retake")}
                    </p>
                    <p className="text-[11px] font-medium mt-0.5 text-muted-foreground leading-tight">
                      {aRetakeable ? t("assignments.retakeable_desc", "Students can resubmit to improve grade") : t("assignments.nonRetakeable_desc", "Grade is final, no resubmission")}
                    </p>
                  </div>
                  <div className={cn("h-7 w-12 rounded-full relative transition-colors shrink-0 shadow-inner",
                    aRetakeable ? "bg-emerald-500" : "bg-secondary")}>
                    <div className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                      aRetakeable ? "translate-x-6" : "translate-x-1")} />
                  </div>
                </button>
              </div>

              {/* Workload Gauge — Segmented Visual Bar */}
              {aDue && (() => {
                const barColor = wouldExceed ? "bg-destructive" : loadPct > 70 ? "bg-amber-500" : "bg-primary";
                const addColor = wouldExceed ? "bg-destructive/60" : loadPct > 70 ? "bg-amber-500/60" : "bg-primary/50";
                return (
                  <div className={cn("p-6 rounded-3xl border-2 space-y-4 transition-all shadow-sm", wouldExceed ? "bg-destructive/5 border-destructive/30" : "bg-background border-border/40")}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-bold text-foreground"><Gauge className="h-4 w-4" />{t("assignments.workload")}</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className={cn("text-3xl font-black tabular-nums leading-none tracking-tight", wouldExceed ? "text-destructive" : "text-foreground")}>{newLoad}</span>
                        <span className="text-sm text-muted-foreground font-bold">/ {MAX_DAILY_WEIGHT}</span>
                      </div>
                    </div>

                    {/* Segmented bar */}
                    <div className="relative">
                      <div className="flex gap-1 h-5">
                        {Array.from({ length: MAX_DAILY_WEIGHT }, (_, i) => {
                          const filled = i < dueDateLoad;
                          const isNew = i >= dueDateLoad && i < Math.min(newLoad, MAX_DAILY_WEIGHT);
                          return (
                            <div key={i} className={cn(
                              "flex-1 rounded border border-black/5 dark:border-white/5 transition-all duration-300",
                              filled ? barColor : isNew ? cn(addColor, "animate-pulse") : "bg-secondary shadow-inner"
                            )} />
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-2 px-0.5">
                        {[0, 2, 4, 6, 8, 10].map(n => <span key={n} className="text-[10px] text-muted-foreground font-bold tabular-nums">{n}</span>)}
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5"><div className={cn("h-3 w-3 rounded-sm shadow-inner", barColor)} /><span className="text-muted-foreground font-semibold">{t("assignments.existingLoad")}: {dueDateLoad}</span></div>
                        <div className="flex items-center gap-1.5"><div className={cn("h-3 w-3 rounded-sm shadow-inner", addColor)} /><span className="text-muted-foreground font-semibold">+{selectedWt?.weight || 1} ({selectedWt?.label})</span></div>
                      </div>
                    </div>
                    {wouldExceed && (
                      <div className="mt-2 text-[11px] text-destructive font-bold flex items-center justify-center gap-1.5 p-2 bg-destructive/10 rounded-xl">
                        <AlertTriangle className="h-4 w-4" />{t("assignments.overload")}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-background border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
            <Button variant="ghost" onClick={() => setAssignDlg(false)} className="rounded-xl font-bold hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto text-base h-12 px-6">{t("common.cancel")}</Button>
            <Button onClick={saveAssign} disabled={aSaving || !aTitle || !aDue || wouldExceed} className="rounded-2xl font-black gap-2 h-14 px-10 shadow-xl shadow-primary/25 hover:scale-[1.02] transition-transform w-full sm:w-auto text-lg" size="lg">
              {aSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
              {editingAssign ? t("common.save") : t("assignments.assign")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
