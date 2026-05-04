import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, School, CalendarDays, Check, Plus, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEPS = ["onboarding.addSubjects", "onboarding.registerTeachers", "onboarding.createClasses", "onboarding.generateSchedule"];
const STEP_ICONS = [BookOpen, Users, School, CalendarDays];

export default function AdminOnboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    subjects, addSubject, removeSubject,
    teachers, addTeacher, removeTeacher,
    classes, addClass, removeClass,
    generateSchedule, setOnboardingComplete,
  } = useSchool();

  const [step, setStep] = useState(0);
  const [subjectInput, setSubjectInput] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("");
  const [className, setClassName] = useState("");
  const [classCount, setClassCount] = useState("");
  const [scheduleResult, setScheduleResult] = useState<{ conflicts: number } | null>(null);

  const handleAddSubject = () => {
    if (!subjectInput.trim()) return;
    addSubject(subjectInput.trim());
    setSubjectInput("");
  };

  const handleAddTeacher = () => {
    if (!teacherName.trim() || !teacherSubject) return;
    addTeacher(teacherName.trim(), [teacherSubject]);
    setTeacherName("");
    setTeacherSubject("");
  };

  const handleAddClass = () => {
    if (!className.trim() || !classCount) return;
    addClass(className.trim(), parseInt(classCount));
    setClassName("");
    setClassCount("");
  };

  const handleGenerate = () => {
    const result = generateSchedule();
    setScheduleResult(result);
    if (result.conflicts > 0) {
      toast.error(t("onboarding.conflictsFound", { count: result.conflicts }));
    } else {
      toast.success(t("onboarding.scheduleGenerated"));
    }
  };

  const handleFinish = () => {
    setOnboardingComplete(true);
    navigate("/app/schedule");
  };

  const canNext = () => {
    if (step === 0) return subjects.length > 0;
    if (step === 1) return teachers.length > 0;
    if (step === 2) return classes.length > 0;
    return scheduleResult !== null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("onboarding.title")}</h1>
        <p className="text-muted-foreground">{t("onboarding.subtitle")}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = STEP_ICONS[i];
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${isDone ? "bg-primary" : "bg-border"}`} />}
              <button
                onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{t(s)}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{t(STEPS[step])}</CardTitle>
          <CardDescription>{t(`onboarding.step${step}Desc`)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder={t("onboarding.subjectPlaceholder")}
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                />
                <Button onClick={handleAddSubject} size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                    {s.name}
                    <button onClick={() => removeSubject(s.id)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder={t("onboarding.teacherNamePlaceholder")}
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="flex-1"
                />
                <Select value={teacherSubject} onValueChange={setTeacherSubject}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder={t("onboarding.selectSubject")} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddTeacher} size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {teachers.map((t_item) => (
                  <div key={t_item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <span className="font-medium">{t_item.name}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {t_item.subjectIds.map((sid) => subjects.find((s) => s.id === sid)?.name).join(", ")}
                      </span>
                    </div>
                    <button onClick={() => removeTeacher(t_item.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder={t("onboarding.classNamePlaceholder")}
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder={t("onboarding.studentCountPlaceholder")}
                  value={classCount}
                  onChange={(e) => setClassCount(e.target.value)}
                  className="w-full sm:w-32"
                />
                <Button onClick={handleAddClass} size="icon"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {classes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {c.studentCount} {t("onboarding.students")}
                      </span>
                    </div>
                    <button onClick={() => removeClass(c.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">{t("onboarding.readyToGenerate")}</p>
                <div className="flex justify-center gap-4 text-sm mb-4">
                  <span>{subjects.length} {t("onboarding.subjectsCount")}</span>
                  <span>{teachers.length} {t("onboarding.teachersCount")}</span>
                  <span>{classes.length} {t("onboarding.classesCount")}</span>
                </div>
                <Button onClick={handleGenerate} size="lg" className="gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {t("onboarding.generateBtn")}
                </Button>
              </div>
              {scheduleResult && (
                <div className={`rounded-lg border p-4 ${scheduleResult.conflicts > 0 ? "border-destructive bg-destructive/10" : "border-primary bg-primary/10"}`}>
                  {scheduleResult.conflicts > 0 ? (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">{t("onboarding.conflictsFound", { count: scheduleResult.conflicts })}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-primary">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">{t("onboarding.scheduleGenerated")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
          {t("register.back")}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
            {t("register.next")}
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={!scheduleResult}>
            {t("onboarding.finish")}
          </Button>
        )}
      </div>
    </div>
  );
}
