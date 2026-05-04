import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trophy, FileText, Clock, MapPin, AlertTriangle, PieChart, Trash2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useExtracurriculars,
  useCreateExtracurricular,
  useDeleteExtracurricular,
  useHonors,
  useCreateHonor,
  useDeleteHonor,
} from "@/hooks/useApiData";

const CAT_COLORS: Record<string, string> = {
  "Sports": "#ef4444",
  "Music": "#10b981",
  "STEM": "#3b82f6",
  "Volunteering": "#f59e0b",
  "Internship": "#8b5cf6",
};

type FormType = "activity" | "honor";

interface NewActForm {
  title: string;
  role: string;
  organization: string;
  hours_per_week: number | "";
  weeks_per_year: number | "";
  category: string;
  description: string;
}

interface NewHonorForm {
  title: string;
  level: string;
  year_received: number | "";
}

export default function Extracurriculars() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const studentId = user?.id; // user_id is the student_id for uni-prep endpoints

  const { data: activities = [], isLoading: loadingActs } = useExtracurriculars(studentId);
  const { data: honors = [], isLoading: loadingHonors } = useHonors(studentId);
  const createActivity = useCreateExtracurricular();
  const deleteActivity = useDeleteExtracurricular();
  const createHonor = useCreateHonor();
  const deleteHonor = useDeleteHonor();

  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<FormType>("activity");

  const [newAct, setNewAct] = useState<NewActForm>({
    title: "", role: "", organization: "",
    hours_per_week: "", weeks_per_year: "",
    category: "STEM", description: "",
  });
  const [newHonor, setNewHonor] = useState<NewHonorForm>({
    title: "", level: "Regional", year_received: "",
  });

  const totalHours = useMemo(
    () => activities.reduce((sum, a) => sum + (a.hours_per_week || 0), 0),
    [activities]
  );
  const isOverLimit = totalHours > 168;
  const isOverRecommended = totalHours > 40;

  const pieChartStyle = useMemo(() => {
    let total = 0;
    const catTotals: Record<string, number> = {};
    activities.forEach((a) => {
      const h = a.hours_per_week * a.weeks_per_year;
      total += h;
      catTotals[a.category] = (catTotals[a.category] || 0) + h;
    });
    if (total === 0) return { background: "transparent" };
    let currentAngle = 0;
    const gradients = Object.entries(catTotals).map(([cat, val]) => {
      const pct = (val / total) * 100;
      const start = currentAngle;
      currentAngle += pct;
      return `${CAT_COLORS[cat] || "#6b7280"} ${start}% ${currentAngle}%`;
    });
    return { background: `conic-gradient(${gradients.join(", ")})` };
  }, [activities]);

  const handleAddAct = () => {
    if (!newAct.title || !newAct.role || !newAct.hours_per_week) {
      toast.error("Please fill out required fields");
      return;
    }
    const hours = Number(newAct.hours_per_week);
    if (totalHours + hours > 168) {
      toast.error(t("extracurriculars.maxHoursWarning"));
      return;
    }
    createActivity.mutate(
      {
        title: newAct.title,
        role: newAct.role,
        organization: newAct.organization,
        hours_per_week: hours,
        weeks_per_year: Number(newAct.weeks_per_year || 0),
        category: newAct.category,
        description: newAct.description,
      },
      {
        onSuccess: () => {
          toast.success(t("extracurriculars.activityAdded") || "Activity saved!");
          setFormOpen(false);
          setNewAct({ title: "", role: "", organization: "", hours_per_week: "", weeks_per_year: "", category: "STEM", description: "" });
        },
        onError: () => toast.error("Failed to save activity"),
      }
    );
  };

  const handleAddHonor = () => {
    if (!newHonor.title || !newHonor.year_received) return;
    createHonor.mutate(
      { title: newHonor.title, level: newHonor.level, year_received: Number(newHonor.year_received) },
      {
        onSuccess: () => {
          toast.success("Honor saved!");
          setFormOpen(false);
          setNewHonor({ title: "", level: "Regional", year_received: "" });
        },
        onError: () => toast.error("Failed to save honor"),
      }
    );
  };

  const simulatePdfGen = () => {
    const promise = new Promise((resolve) => setTimeout(resolve, 2000));
    toast.promise(promise, {
      loading: "Generating PDF...",
      success: "Activity Resume generated successfully!",
      error: "Error generating PDF",
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/app/college-prep">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("extracurriculars.pageTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-1">Track activities exactly how Common App wants them.</p>
          </div>
        </div>
        <Button onClick={simulatePdfGen} variant="default" className="gap-2 bg-primary">
          <FileText className="h-4 w-4" /> {t("extracurriculars.generateResume")}
        </Button>
      </div>

      {(isOverLimit || isOverRecommended) && (
        <div className={`p-4 border rounded-xl flex gap-3 items-start text-sm ${isOverLimit ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20"}`}>
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            {isOverLimit
              ? t("extracurriculars.maxHoursWarning")
              : "You have reported over 40 hours/week. Ensure this accurately reflects your schedule."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form / Activity List */}
        {formOpen ? (
          <BentoCard className="lg:col-span-2 col-span-1 shadow-2xl border-primary/50 bg-card z-10" title="Create New Entry">
            <div className="flex gap-2 mb-6">
              <Button variant={formType === "activity" ? "default" : "outline"} onClick={() => setFormType("activity")}>{t("common.activity", "Activity")}</Button>
              <Button variant={formType === "honor" ? "default" : "outline"} onClick={() => setFormType("honor")}>Honor/Award</Button>
            </div>

            {formType === "activity" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>{t("extracurriculars.activityName")}</Label><Input value={newAct.title} onChange={(e) => setNewAct({ ...newAct, title: e.target.value })} placeholder="e.g. Debate Club" /></div>
                  <div className="space-y-1"><Label>{t("extracurriculars.role")}</Label><Input value={newAct.role} onChange={(e) => setNewAct({ ...newAct, role: e.target.value })} placeholder="e.g. Founder" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>{t("extracurriculars.organization")}</Label><Input value={newAct.organization} onChange={(e) => setNewAct({ ...newAct, organization: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label>{t("extracurriculars.category")}</Label>
                    <Select value={newAct.category} onValueChange={(v) => setNewAct({ ...newAct, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(CAT_COLORS).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-2">{t("extracurriculars.hoursPerWeek")}</Label>
                    <Counter 
                      value={Number(newAct.hours_per_week) || 1} 
                      onChange={v => setNewAct({ ...newAct, hours_per_week: v })} 
                      min={1} 
                      max={168}
                      label="hr/wk"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-2">{t("extracurriculars.weeksPerYear")}</Label>
                    <Counter 
                      value={Number(newAct.weeks_per_year) || 1} 
                      onChange={v => setNewAct({ ...newAct, weeks_per_year: v })} 
                      min={1} 
                      max={52}
                      label="wk/yr"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label>{t("extracurriculars.description")}</Label>
                    <span className={`text-xs ${newAct.description.length > 150 ? "text-destructive" : "text-muted-foreground"}`}>{150 - newAct.description.length} {t("extracurriculars.charsLeft")}</span>
                  </div>
                  <Textarea value={newAct.description} onChange={(e) => setNewAct({ ...newAct, description: e.target.value })} className="resize-none" rows={3} />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddAct} className="flex-1" disabled={createActivity.isPending}>
                    {createActivity.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Activity
                  </Button>
                  <Button onClick={() => setFormOpen(false)} variant="secondary">{t("common.cancel", "Cancel")}</Button>
                </div>
              </div>
            )}

            {formType === "honor" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-1">
                  <Label>{t("extracurriculars.honorName")}</Label>
                  <Input value={newHonor.title} onChange={(e) => setNewHonor({ ...newHonor, title: e.target.value })} placeholder="e.g. National Merit Scholar" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>{t("extracurriculars.honorLevel")}</Label>
                    <Select value={newHonor.level} onValueChange={(v) => setNewHonor({ ...newHonor, level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="School">{t("common.school", "School")}</SelectItem>
                        <SelectItem value="Regional">Regional / State</SelectItem>
                        <SelectItem value="National">{t("common.national", "National")}</SelectItem>
                        <SelectItem value="International">{t("common.international", "International")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("extracurriculars.year")}</Label>
                    <Input type="number" min="2010" value={newHonor.year_received} onChange={(e) => setNewHonor({ ...newHonor, year_received: Number(e.target.value) })} placeholder="2025" />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddHonor} className="flex-1" disabled={createHonor.isPending}>
                    {createHonor.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Honor
                  </Button>
                  <Button onClick={() => setFormOpen(false)} variant="secondary">{t("common.cancel", "Cancel")}</Button>
                </div>
              </div>
            )}
          </BentoCard>
        ) : (
          <BentoCard className="lg:col-span-2 col-span-1" title={t("extracurriculars.activities")}>
            <div className="flex justify-between items-center mb-6 p-4 bg-muted/20 border rounded-2xl">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("extracurriculars.progress")}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold text-foreground">{activities.length}</span>
                  <span className="text-muted-foreground">/ 10</span>
                </div>
              </div>
              <Button onClick={() => setFormOpen(true)} className="rounded-full shadow-lg gap-2">
                <Plus className="h-4 w-4" /> {t("extracurriculars.addActivityBtn")}
              </Button>
            </div>

            <div className="space-y-4">
              {loadingActs ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <PieChart className="h-12 w-12 mb-3 opacity-20" />
                  <p>{t("extracurriculars.noData")}</p>
                </div>
              ) : (
                activities.map((act, i) => (
                  <div key={act.id} className="group flex gap-4 p-4 border rounded-2xl bg-card hover:bg-muted/10 hover:border-primary/30 transition-all items-start relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: CAT_COLORS[act.category] || "#6b7280" }} />
                    <div className="flex-1 pl-2">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-lg leading-tight flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-sm">{i + 1}.</span>
                            {act.title}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-primary mt-1">
                            <span className="font-semibold">{act.role}</span>
                            {act.organization && <><span className="text-muted-foreground">&bull;</span><span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{act.organization}</span></>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" style={{ borderColor: CAT_COLORS[act.category], color: CAT_COLORS[act.category] }}>
                            {act.category}
                          </Badge>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                            onClick={() => deleteActivity.mutate(act.id, { onError: () => toast.error("Failed to delete") })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground bg-muted/30 p-2 rounded-lg w-max mb-3 border">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {act.hours_per_week} hr/wk</span>
                        <span className="flex items-center gap-1">{act.weeks_per_year} wk/yr</span>
                      </div>
                      {act.description && <p className="text-sm leading-relaxed text-foreground/80 dark:text-foreground/70">{act.description}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </BentoCard>
        )}

        {/* Right Info Section */}
        <div className="space-y-6">
          <BentoCard title={t("extracurriculars.profileBalance")}>
            <div className="flex flex-col items-center justify-center py-4">
              {activities.length === 0 ? (
                <PieChart className="h-24 w-24 text-muted/30" />
              ) : (
                <div className="w-48 h-48 rounded-full border-4 shadow-sm relative flex items-center justify-center transition-all duration-1000" style={pieChartStyle}>
                  <div className="w-32 h-32 bg-card rounded-full flex flex-col items-center justify-center shadow-inner z-10">
                    <span className="text-2xl font-bold">{totalHours}</span>
                    <span className="text-xs text-muted-foreground uppercase text-center leading-tight mt-1">Total<br />Hours/Wk</span>
                  </div>
                </div>
              )}
              <div className="w-full mt-6 flex flex-wrap gap-2 justify-center">
                {Object.entries(CAT_COLORS).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-1.5 text-xs font-medium">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                    {cat}
                  </div>
                ))}
              </div>
            </div>
          </BentoCard>

          <BentoCard title={t("extracurriculars.honors")} icon={<Trophy className="h-5 w-5 text-amber-500" />}>
            <div className="space-y-3 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-dashed border-amber-500/30 text-amber-600 hover:bg-amber-500/5"
                onClick={() => { setFormType("honor"); setFormOpen(true); }}
              >
                <Plus className="h-3.5 w-3.5" /> Add Honor
              </Button>
              {loadingHonors ? (
                [1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
              ) : honors.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No honors added.</p>
              ) : (
                honors.map((h) => (
                  <div key={h.id} className="group flex gap-3 p-3 bg-muted/20 border border-amber-500/10 rounded-xl items-start">
                    <div className="bg-amber-500/10 p-2 rounded-full text-amber-500 shrink-0">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight text-foreground">{h.title}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-1 font-medium">
                        <span>{h.level}</span><span>&bull;</span><span>{h.year_received}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                      onClick={() => deleteHonor.mutate(h.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
