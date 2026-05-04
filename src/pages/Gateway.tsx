import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import {
  GraduationCap, ArrowRight, BookOpen, Calendar, Brain,
  Utensils, BarChart3, Shield, MessageSquare, Users,
  Sparkles, Star,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import { useEffect } from "react";

export default function Gateway() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = t("brand.name", "SmartSchool AI");
  }, [i18n.language, t]);

  const features = [
    { icon: BookOpen,     text: t("gateway.tags.grades",       "Grade Book") },
    { icon: Calendar,     text: t("gateway.tags.schedules",    "Schedules") },
    { icon: Brain,        text: t("gateway.tags.collegePrep",  "College Prep") },
    { icon: Utensils,     text: t("gateway.tags.buffet",       "Buffet") },
    { icon: BarChart3,    text: t("gateway.tags.analytics",    "Analytics") },
    { icon: Shield,       text: t("gateway.tags.admin",        "Admin Panel") },
    { icon: MessageSquare,text: t("gateway.tags.integration",  "Messaging") },
    { icon: Users,        text: t("gateway.tags.scheduler",    "Attendance") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">
            SmartSchool <span className="text-primary">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            onClick={() => navigate(isAuthenticated ? "/app" : "/login")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {isAuthenticated ? t("gateway.goToDashboard", "Dashboard") : t("gateway.signIn", "Sign In")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {t("gateway.badge", "Powered by Gemini AI")}
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mb-4">
          {t("gateway.heroTitle", "The Smart School")}{" "}
          <span className="text-primary">{t("gateway.heroTitleHighlight", "Platform")}</span>
        </h1>

        <p className="text-muted-foreground text-lg max-w-xl mb-10 leading-relaxed">
          {t(
            "gateway.heroDesc",
            "All-in-one school management — grades, schedules, attendance, college prep and AI tools for admins, teachers and students."
          )}
        </p>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 justify-center mb-16">
          <button
            onClick={() => navigate(isAuthenticated ? "/app" : "/login")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 hover:shadow-primary/30"
          >
            {isAuthenticated ? t("gateway.goToDashboard", "Go to Dashboard") : t("gateway.getStarted", "Get Started")}
            <ArrowRight className="h-5 w-5" />
          </button>
          <Link
            to="/business"
            className="inline-flex items-center gap-2 rounded-xl border px-8 py-3 text-base font-semibold transition hover:bg-muted"
          >
            {t("gateway.learnMore", "Learn More")}
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl">
          {features.map(({ icon: Icon, text }) => (
            <span
              key={text}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
              {text}
            </span>
          ))}
        </div>
      </main>

      {/* Testimonial strip */}
      <section className="border-t bg-muted/30 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-8 items-center justify-center text-center">
          {[
            { label: t("gateway.stat1Label", "Students"), value: "10 000+" },
            { label: t("gateway.stat2Label", "Schools"),  value: "120+" },
            { label: t("gateway.stat3Label", "Rating"),   value: "4.9 ★" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col">
              <span className="text-2xl font-bold">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-4 text-xs text-muted-foreground border-t">
        {t("landing.copyright", "© 2025 SmartSchool AI. All rights reserved.")}
      </footer>
    </div>
  );
}
