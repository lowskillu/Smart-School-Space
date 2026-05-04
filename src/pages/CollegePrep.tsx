import { useTranslation } from "react-i18next";
import { useSchool } from "@/contexts/SchoolContext";
import { BentoCard } from "@/components/BentoCard";
import { Link } from "react-router-dom";
import {
  FileText, GraduationCap, PenTool, BookOpen,
  Award, ChevronRight, Trophy, Star, Target
} from "lucide-react";

export default function CollegePrep() {
  const { t } = useTranslation();
  const { role, grade } = useSchool();

  if (role === "student" && grade < 8) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <GraduationCap className="h-12 w-12 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-2xl font-bold">{t("uniPrep.hubTitle")}</h2>
        <p className="text-muted-foreground max-w-sm">{t("uniPrep.noAccess")}</p>
      </div>
    );
  }

  const modules = [
    {
      title: t("uniPrep.gpaTranscript"),
      desc: t("uniPrep.gpaDesc"),
      icon: FileText,
      url: "/app/college-prep/gpa",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: t("uniPrep.recommendationTitle"),
      desc: t("uniPrep.recommendationDesc"),
      icon: Star,
      url: "/app/college-prep/recommendations",
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: t("uniPrep.essaysTitle"),
      desc: t("uniPrep.essaysDesc"),
      icon: PenTool,
      url: "/app/college-prep/essays",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    {
      title: t("uniPrep.examPrepTitle"),
      desc: t("uniPrep.examPrepDesc"),
      icon: Target,
      url: "/app/college-prep/exams",
      color: "text-rose-500",
      bg: "bg-rose-500/10"
    },
    {
      title: t("uniPrep.collegeListTitle"),
      desc: t("uniPrep.collegeListDesc"),
      icon: BookOpen,
      url: "/app/college-prep/colleges",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10"
    },
    {
      title: t("uniPrep.ecaTitle"),
      desc: t("uniPrep.ecaDesc"),
      icon: Award,
      url: "/app/college-prep/extracurriculars",
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card p-6 rounded-3xl border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">{t("uniPrep.hubTitle")}</h1>
          <p className="text-muted-foreground">Select a module to prepare for your university admissions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod, idx) => (
          <Link key={idx} to={mod.url} className="group">
            <BentoCard className="h-full hover:border-primary/50 transition-colors flex flex-col justify-between">
              <div>
                <div className={`h-14 w-14 mb-5 rounded-2xl ${mod.bg} flex items-center justify-center ${mod.color}`}>
                  <mod.icon className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {mod.title}
                </h2>
                <p className="text-sm text-muted-foreground">{mod.desc}</p>
              </div>
              <div className="mt-6 flex justify-end">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </BentoCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
