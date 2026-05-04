import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  Target, TrendingUp, AlertTriangle, CheckCircle2, BookMarked,
  Users, Zap, Award, FileText, ClipboardCheck, ChevronDown, ChevronRight,
  Lightbulb, ArrowUpRight, RefreshCw, Lock, Sparkles, Loader2, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { cn } from "@/lib/utils";

const WORK_TYPES_MAP: Record<string, { label: string; weight: number; retakeable: boolean; pill: string; icon: any }> = {
  "Homework": { label: "HW", weight: 1, retakeable: true, pill: "bg-sky-500/15 text-sky-600 dark:text-sky-400", icon: BookMarked },
  "FA": { label: "FA", weight: 2, retakeable: true, pill: "bg-violet-500/15 text-violet-600 dark:text-violet-400", icon: CheckCircle2 },
  "Quiz": { label: "QZ", weight: 2, retakeable: false, pill: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400", icon: ClipboardCheck },
  "SAU": { label: "SAU", weight: 3, retakeable: false, pill: "bg-amber-500/15 text-amber-600 dark:text-amber-400", icon: Zap },
  "SOCh": { label: "SOCh", weight: 4, retakeable: false, pill: "bg-orange-500/15 text-orange-600 dark:text-orange-400", icon: Award },
  "Group Project": { label: "GP", weight: 4, retakeable: true, pill: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", icon: Users },
  "Midterm / Final": { label: "MF", weight: 5, retakeable: false, pill: "bg-rose-500/15 text-rose-600 dark:text-rose-400", icon: FileText },
};

interface SubjectGrade {
  subject_id: string;
  subject_name: string;
  assignments: { id: string; title: string; type_of_work: string; max_points: number; weight: number; score: number | null; retakeable?: boolean }[];
}

export default function TargetMarks() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [aiQuestion, setAiQuestion] = useState<Record<string, string>>({});
  const [chatHistory, setChatHistory] = useState<Record<string, {role: 'user' | 'ai', content: string}[]>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});

  const { data: subjectGrades = [], isLoading } = useQuery<SubjectGrade[]>({
    queryKey: ["student_grades_detailed", user?.id],
    queryFn: () => api.get<SubjectGrade[]>("/grades/student/detailed"),
    enabled: !!user?.id,
  });

  const { data: dbTargets = {} } = useQuery<Record<string, number>>({
    queryKey: ["target_grades", user?.id],
    queryFn: () => api.get<Record<string, number>>("/grades/target"),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (dbTargets && Object.keys(dbTargets).length > 0) {
      setTargets(prev => {
        const newTargets = { ...prev };
        let changed = false;
        for (const k in dbTargets) {
          if (newTargets[k] === undefined) {
            newTargets[k] = dbTargets[k];
            changed = true;
          }
        }
        return changed ? newTargets : prev;
      });
    }
  }, [dbTargets]);

  const saveTargetMutation = useMutation({
    mutationFn: (data: { subject_id: string; target_percentage: number }) => api.post("/grades/target", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["target_grades"] })
  });

  const handleTargetChange = (subjectId: string, val: number) => {
    setTargets(p => ({ ...p, [subjectId]: val }));
    saveTargetMutation.mutate({ subject_id: subjectId, target_percentage: val });
  };

  const getLetterGrade = (pct: number) => {
    if (pct === 0 && isNaN(pct)) return "—";
    if (pct >= 90) return "A";
    if (pct >= 80) return "B";
    if (pct >= 70) return "C";
    if (pct >= 60) return "D";
    return "F";
  };

  const analyzeSubject = (sg: SubjectGrade, targetPct: number) => {
    const scored = sg.assignments.filter(a => a.score !== null);
    const all = sg.assignments;

    // Current weighted average
    let earnedW = 0, totalW = 0;
    scored.forEach(a => {
      const w = a.weight || WORK_TYPES_MAP[a.type_of_work]?.weight || 1;
      earnedW += ((a.score! / a.max_points) * 100) * w;
      totalW += 100 * w;
    });
    const currentPct = totalW > 0 ? (earnedW / totalW) * 100 : 0;

    // Find retakeable assignments with poor scores (below target)
    const retakeable = scored
      .filter(a => (a.retakeable !== undefined ? a.retakeable : WORK_TYPES_MAP[a.type_of_work]?.retakeable))
      .map(a => {
        const w = a.weight || WORK_TYPES_MAP[a.type_of_work]?.weight || 1;
        const currentScorePct = (a.score! / a.max_points) * 100;
        const maxGain = (100 - currentScorePct) * w; // Max weighted points you can gain
        return { ...a, currentScorePct, weight: w, maxGain, potentialScore: a.max_points };
      })
      .filter(a => a.currentScorePct < 95) // Only suggest if not near-perfect
      .sort((a, b) => b.maxGain - a.maxGain); // Sort by impact

    // Calculate: which retakes would get us to the target?
    const recommendations: { assignment: typeof retakeable[0]; newScore: number; impact: number }[] = [];
    let simEarned = earnedW;
    let simTotal = totalW;

    for (const a of retakeable) {
      if ((simEarned / simTotal) * 100 >= targetPct) break;

      // Simulate getting 95% on this assignment
      const newScorePct = 95;
      const oldContrib = (a.currentScorePct) * a.weight;
      const newContrib = newScorePct * a.weight;
      const impact = newContrib - oldContrib;

      recommendations.push({
        assignment: a,
        newScore: Math.round((newScorePct / 100) * a.max_points),
        impact: (impact / simTotal) * 100,
      });

      simEarned += impact;
    }

    const projectedPct = simTotal > 0 ? (simEarned / simTotal) * 100 : 0;
    const reachable = projectedPct >= targetPct;

    return { currentPct, projectedPct, reachable, recommendations, retakeableCount: retakeable.length };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{t("marks.target_calculator")}</h1>
            <p className="text-muted-foreground text-sm">{t("marks.target_calc_desc")}</p>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
        <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-bold text-foreground">{t("marks.ai_advice", "AI recommendations")}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> HW, FA, GP — {t("assignments.retakeable", "can retake")}</span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400"><Lock className="h-3 w-3" /> SAU, SOCh, QZ, MF — {t("assignments.nonRetakeable", "cannot retake")}</span>
          </div>
        </div>
      </div>

      {/* Subject list */}
      {subjectGrades.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed p-16 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="font-bold">{t("marks.no_data", "No grade data available")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjectGrades.map(sg => {
            const isOpen = expandedSubject === sg.subject_id;
            const analysis = analyzeSubject(sg, 80); // Calculate current without target first
            const defaultTarget = Math.max(80, Math.round(analysis.currentPct));
            const targetPct = targets[sg.subject_id] !== undefined ? targets[sg.subject_id] : defaultTarget;
            const finalAnalysis = analyzeSubject(sg, targetPct); // Recalculate with actual target
            const scored = sg.assignments.filter(a => a.score !== null).length;

            return (
              <div key={sg.subject_id} className="rounded-2xl border bg-card overflow-hidden transition-all">
                {/* Subject row */}
                <button onClick={() => setExpandedSubject(isOpen ? null : sg.subject_id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/20 transition-colors">
                  {/* Current grade pill */}
                  <div className={cn(
                    "h-14 w-16 rounded-2xl flex flex-col items-center justify-center border font-black text-white shrink-0 shadow-sm",
                    finalAnalysis.currentPct >= 80 ? "bg-emerald-600 border-emerald-500/50" :
                    finalAnalysis.currentPct >= 60 ? "bg-amber-500 border-amber-500/50" :
                    finalAnalysis.currentPct >= 40 ? "bg-orange-500 border-orange-500/50" : "bg-red-600 border-red-500/50"
                  )}>
                    {scored > 0 ? (
                      <>
                        <span className="text-xl">{getLetterGrade(finalAnalysis.currentPct)}</span>
                        <span className="text-[10px] font-bold opacity-80">{finalAnalysis.currentPct.toFixed(0)}%</span>
                      </>
                    ) : "—"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base truncate">{sg.subject_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {scored}/{sg.assignments.length} {t("tiles.assignments", "assignments")} •
                      {analysis.retakeableCount} {t("assignments.retakeable", "retakeable")}
                    </p>
                  </div>

                  <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>

                {/* Expanded: Target calculator */}
                {isOpen && (
                  <div className="border-t p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Target input */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-muted-foreground mb-1 block">{t("marks.desired_grade", "Target grade %")}</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number" min={0} max={100}
                            value={targetPct}
                            onChange={e => setTargets(p => ({ ...p, [sg.subject_id]: Math.min(100, parseInt(e.target.value) || 0) }))}
                            onBlur={e => handleTargetChange(sg.subject_id, Math.min(100, parseInt(e.target.value) || 0))}
                            className="h-10 w-24 rounded-xl font-black text-lg text-center bg-secondary/20 border-transparent focus-visible:border-primary"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          <div className="flex gap-1 ml-2 flex-wrap">
                            {[70, 80, 90, 100].map(v => (
                              <button key={v} onClick={() => handleTargetChange(sg.subject_id, v)}
                                className={cn("px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                                  targetPct === v ? "bg-primary text-primary-foreground" : "bg-secondary/30 hover:bg-secondary/60")}>
                                {v}% ({getLetterGrade(v)})
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Result badge */}
                      <div className={cn(
                        "text-right px-4 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[100px]",
                        finalAnalysis.reachable ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
                      )}>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{t("marks.analysis", "Projected")}</p>
                        <div className="flex items-baseline gap-1">
                          <span className={cn("text-2xl font-black", finalAnalysis.reachable ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                            {getLetterGrade(finalAnalysis.projectedPct)}
                          </span>
                          <span className="text-sm font-bold opacity-70">
                            {finalAnalysis.projectedPct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* AI Chat Advisor */}
                    <div className="rounded-2xl bg-secondary/10 border border-secondary p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-black text-primary">
                          <Sparkles className="h-4 w-4" />
                          {t("marks.askAi", "Спросить AI-советника")}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder={t("marks.askAiPlaceholder", "Например: Что мне пересдать, чтобы получить 90%?")}
                          value={aiQuestion[sg.subject_id] || ''}
                          onChange={(e) => setAiQuestion(p => ({ ...p, [sg.subject_id]: e.target.value }))}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && !loadingAi[sg.subject_id]) {
                              const question = aiQuestion[sg.subject_id] || '';
                              setAiQuestion(p => ({ ...p, [sg.subject_id]: '' }));
                              setChatHistory(p => ({
                                ...p, 
                                [sg.subject_id]: [...(p[sg.subject_id] || []), { role: 'user', content: question || 'Проанализируй мои оценки' }]
                              }));
                              setLoadingAi(p => ({ ...p, [sg.subject_id]: true }));
                              try {
                                const res = await api.post<{advice: string}>("/grades/target/analyze", {
                                  subject_name: sg.subject_name,
                                  target_pct: targetPct,
                                  current_pct: finalAnalysis.currentPct,
                                  assignments: sg.assignments,
                                  question: question
                                });
                                setChatHistory(p => ({
                                  ...p,
                                  [sg.subject_id]: [...(p[sg.subject_id] || []), { role: 'ai', content: res.advice }]
                                }));
                              } catch (err) {
                                console.error(err);
                              } finally {
                                setLoadingAi(p => ({ ...p, [sg.subject_id]: false }));
                              }
                            }
                          }}
                          className="h-9 text-sm bg-background"
                        />
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          disabled={loadingAi[sg.subject_id]}
                          onClick={async () => {
                            const question = aiQuestion[sg.subject_id] || '';
                            setAiQuestion(p => ({ ...p, [sg.subject_id]: '' }));
                            setChatHistory(p => ({
                              ...p, 
                              [sg.subject_id]: [...(p[sg.subject_id] || []), { role: 'user', content: question || 'Проанализируй мои оценки' }]
                            }));
                            setLoadingAi(p => ({ ...p, [sg.subject_id]: true }));
                            try {
                              const res = await api.post<{advice: string}>("/grades/target/analyze", {
                                subject_name: sg.subject_name,
                                target_pct: targetPct,
                                current_pct: finalAnalysis.currentPct,
                                assignments: sg.assignments,
                                question: question
                              });
                              setChatHistory(p => ({
                                ...p,
                                [sg.subject_id]: [...(p[sg.subject_id] || []), { role: 'ai', content: res.advice }]
                              }));
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setLoadingAi(p => ({ ...p, [sg.subject_id]: false }));
                            }
                          }}
                          className="h-9 shrink-0"
                        >
                          {loadingAi[sg.subject_id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pt-2">
                        {(chatHistory[sg.subject_id] || []).map((msg, idx) => (
                           <div key={idx} className={cn("p-3 rounded-xl text-sm leading-relaxed animate-in fade-in slide-in-from-top-2 w-fit max-w-[90%]", 
                             msg.role === 'user' ? "bg-secondary text-secondary-foreground ml-auto rounded-tr-sm" : "bg-primary/10 border border-primary/20 text-foreground mr-auto rounded-tl-sm"
                           )}>
                             {msg.content}
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    {finalAnalysis.recommendations.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-primary" />
                          {t("marks.ai_advice", "AI Recommendations")} — {t("marks.required_score", "retake these to reach target")}:
                        </p>
                        {finalAnalysis.recommendations.map((rec, i) => {
                          const wt = WORK_TYPES_MAP[rec.assignment.type_of_work];
                          const WtIcon = wt?.icon || FileText;
                          return (
                            <div key={rec.assignment.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-all">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                                #{i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded", wt?.pill)}>{wt?.label}</span>
                                  <span className="text-sm font-bold truncate">{rec.assignment.title}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span>{t("marks.current_score", "Current")}: <strong className="text-rose-500">{rec.assignment.score}/{rec.assignment.max_points} ({rec.assignment.currentScorePct.toFixed(0)}%)</strong></span>
                                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                  <span>{t("marks.target_calculator", "Target")}: <strong className="text-emerald-500">{rec.newScore}/{rec.assignment.max_points} (95%)</strong></span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{rec.impact.toFixed(1)}%</p>
                                <p className="text-[10px] text-muted-foreground">{t("marks.analysis", "impact")}</p>
                              </div>
                            </div>
                          );
                        })}

                        {!finalAnalysis.reachable && (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span className="font-medium">{t("marks.advice_critical", `Even retaking all possible assignments, the maximum reachable grade is ${finalAnalysis.projectedPct.toFixed(0)}%. Consider improving non-retakeable scores on future assignments.`).replace("{{subject}}", sg.subject_name)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                        <p className="font-bold">{t("marks.advice_good", "You're already at or above your target!").replace("{{subject}}", sg.subject_name)}</p>
                      </div>
                    )}

                    {/* All assignments table */}
                    <details className="group">
                      <summary className="text-xs font-bold text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground transition-colors">
                        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                        {t("assignments.gradebook", "All assignments")} ({sg.assignments.length})
                      </summary>
                      <div className="mt-2 space-y-1">
                        {sg.assignments.map(a => {
                          const wt = WORK_TYPES_MAP[a.type_of_work];
                          const pct = a.score !== null ? (a.score / a.max_points) * 100 : -1;
                          return (
                            <div key={a.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/20 text-xs">
                              <span className={cn("font-black px-1.5 py-0.5 rounded text-[9px]", wt?.pill)}>{wt?.label || a.type_of_work}</span>
                              <span className="flex-1 truncate font-medium">{a.title}</span>
                              {(a.retakeable !== undefined ? a.retakeable : wt?.retakeable) ? <RefreshCw className="h-3 w-3 text-emerald-500 shrink-0" /> : <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                              {a.score !== null ? (
                                <span className={cn(
                                  "font-bold px-2 py-0.5 rounded-md text-white text-[10px]",
                                  pct >= 80 ? "bg-emerald-600/70" :
                                  pct >= 60 ? "bg-amber-500/70" :
                                  pct >= 40 ? "bg-orange-600/70" : "bg-red-700/70"
                                )}>{a.score}/{a.max_points} = {pct.toFixed(0)}%</span>
                              ) : (
                                <span className="text-muted-foreground/40 font-bold">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
