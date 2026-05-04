import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSchool } from "@/contexts/SchoolContext";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Info, FileOutput, ArrowLeft, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { useGradeSummary } from "@/hooks/useApiData";
import { useAuth } from "@/contexts/AuthContext";

export default function GPATranscript() {
  const { t } = useTranslation();
  const { name, grade } = useSchool();
  const { user } = useAuth();
  
  // Use real data from API
  const { data: gradesSummary, isLoading } = useGradeSummary(user?.student_id || undefined);

  const subjects = gradesSummary?.summary ? Object.entries(gradesSummary.summary) : [];
  
  // Rough GPA calculation if data exists
  const subjectsCount = subjects.length;
  const avgScore = subjectsCount > 0 ? subjects.reduce((acc, [_, score]) => acc + score, 0) / subjectsCount : 0;
  
  const gpa = useMemo(() => {
     if (avgScore === 0) return 0;
     if (avgScore >= 90) return 4.0;
     if (avgScore >= 80) return 3.0;
     if (avgScore >= 70) return 2.0;
     return 1.0;
  }, [avgScore]);

  const handleExport = () => {
    window.location.href = `/api/gpa/export-pdf?name=${encodeURIComponent(name)}&grade=${grade}&gpa=${gpa.toFixed(2)}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/app/college-prep">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("gpaTranscript.pageTitle")}</h1>
            <p className="text-muted-foreground hidden sm:block text-sm">Review your academic records before applying.</p>
          </div>
        </div>
        <Button onClick={handleExport} className="gap-2" disabled={subjectsCount === 0}>
          <FileOutput className="h-4 w-4" />
          {t("gpaTranscript.exportBtn")}
        </Button>
      </div>

      {/* Auto Notice */}
      <div className="bg-info/10 text-info p-3 rounded-xl border border-info/20 flex items-start gap-3 text-sm">
        <Info className="h-5 w-5 shrink-0" />
        <p>{t("gpaTranscript.autoNotice")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Main Transcript Table */}
        <BentoCard className="lg:col-span-2 min-h-[500px]" title={t("gpaTranscript.transcriptTab")}>
          <div className="border rounded-xl bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold">{t("gpaTranscript.tableSubject")}</TableHead>
                  <TableHead className="font-semibold text-center">{t("gpaTranscript.tableGrade")} (0-100)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={2} className="text-center py-8">{t("common.loading", "Loading...")}</TableCell></TableRow>
                ) : subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-20 text-muted-foreground italic">
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen className="h-8 w-8 opacity-20" />
                        <p>No grades found in the system yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects.map(([subject, score], i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{subject}</TableCell>
                      <TableCell className="text-center font-bold">{score}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-8 pt-4 border-t flex justify-end">
            <div className="text-right">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Cumulative GPA (Estimated)</p>
              <p className="text-3xl font-bold text-primary">{gpa.toFixed(2)}</p>
            </div>
          </div>
        </BentoCard>

        {/* Right Info Board */}
        <div className="space-y-6">
          <BentoCard title="Profile Details">
            <div className="space-y-4">
              <div className="pb-3 border-b border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("gpaTranscript.studentName")}</p>
                <p className="font-semibold text-lg">{name || "—"}</p>
              </div>
              <div className="pb-3 border-b border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("gpaTranscript.grade")}</p>
                <p className="font-semibold text-lg">{grade || "—"}</p>
              </div>
              <div className="pb-3 border-b border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                <p className="font-semibold">Active Student</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex flex-col items-center text-center space-y-4 py-4">
               <div className="p-4 bg-muted/20 rounded-xl border border-dashed">
                 <p className="text-sm text-muted-foreground italic">Official signature will be applied upon PDF export.</p>
               </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}


