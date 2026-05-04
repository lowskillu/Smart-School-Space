import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import {
  GraduationCap, CheckCircle2, Calendar, BarChart3, MessageSquare, Shield, Zap, ArrowRight,
  AlertTriangle, RefreshCw, Layers, Clock, Users, Star,
} from "lucide-react";
import { Link } from "react-router-dom";

const schedulerSlots = [
  { time: "8:00", subjectKey: "mathematics", teacher: "Dr. Smith", room: "101", conflict: false },
  { time: "9:00", subjectKey: "physics", teacher: "Ms. Rivera", room: "Lab 2", conflict: false },
  { time: "10:00", subjectKey: "english", teacher: "Mr. Thompson", room: "204", conflict: true },
  { time: "11:00", subjectKey: "biology", teacher: "Dr. Patel", room: "Lab 1", conflict: false },
  { time: "12:00", subjectKey: "lunch", teacher: "—", room: "—", conflict: false },
  { time: "13:00", subjectKey: "history", teacher: "Ms. Chen", room: "302", conflict: false },
];

const testimonialAuthors = [
  { name: "Sarah Mitchell", role: "Principal, Lincoln Academy", key: "t1", rating: 5 },
  { name: "Dr. James Park", role: "Director, Greenfield Schools", key: "t2", rating: 5 },
  { name: "Maria Gonzalez", role: "VP Academic, St. Mary's", key: "t3", rating: 5 },
];

import { useEffect } from "react";

export default function Landing() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t("brand.name", "SmartSchool AI");
  }, [i18n.language, t]);

  const features = [
    { icon: Calendar, title: t("features.autoScheduler"), desc: t("features.autoSchedulerDesc") },
    { icon: BarChart3, title: t("features.perfAnalytics"), desc: t("features.perfAnalyticsDesc") },
    { icon: MessageSquare, title: t("features.unifiedComm"), desc: t("features.unifiedCommDesc") },
    { icon: Shield, title: t("features.faceIdAttendance"), desc: t("features.faceIdAttendanceDesc") },
    { icon: GraduationCap, title: t("features.collegePrepHub"), desc: t("features.collegePrepHubDesc") },
    { icon: Zap, title: t("features.smartAlerts"), desc: t("features.smartAlertsDesc") },
  ];

  const problems = [
    { icon: AlertTriangle, problem: t("problems.fragmented"), solution: t("problems.fragmentedSolution") },
    { icon: Clock, problem: t("problems.manual"), solution: t("problems.manualSolution") },
    { icon: RefreshCw, problem: t("problems.disconnected"), solution: t("problems.disconnectedSolution") },
    { icon: Layers, problem: t("problems.paper"), solution: t("problems.paperSolution") },
  ];

  const pricingPlans = [
    {
      ...JSON.parse(JSON.stringify({ name: t("pricing.basic.name"), price: t("pricing.basic.price"), period: t("pricing.basic.period"), desc: t("pricing.basic.desc") })),
      features: ["dashboardAnalytics", "attendanceModule", "communicationHub", "adminAccounts5", "emailSupport"].map(k => t(`pricing.features.${k}`)),
      cta: t("landing.startTrial"), highlighted: false,
    },
    {
      name: t("pricing.pro.name"), price: t("pricing.pro.price"), period: t("pricing.pro.period"), desc: t("pricing.pro.desc"),
      features: ["everythingBasic", "collegePrepHub", "aiEssayFeedback", "autoScheduler", "prioritySupport", "apiAccess"].map(k => t(`pricing.features.${k}`)),
      cta: t("landing.startTrial"), highlighted: true,
    },
    {
      name: t("pricing.institutional.name"), price: t("pricing.institutional.price"), period: t("pricing.institutional.period"), desc: t("pricing.institutional.desc"),
      features: ["everythingPro", "unlimitedStudents", "alumniNetwork", "customIntegrations", "dedicatedManager", "slaGuarantee", "onPremise"].map(k => t(`pricing.features.${k}`)),
      cta: t("landing.contactSales"), highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">SmartSchool <span className="text-primary">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.features")}</a>
            <a href="#scheduler" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.scheduler")}</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.pricing")}</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.testimonials")}</a>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link to="/app">
              <Button variant="ghost" size="sm">{t("nav.signIn")}</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">{t("nav.registerSchool")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-4 w-4" /> {t("landing.badge")}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              {t("landing.heroTitle1")}{" "}
              <span className="text-primary">{t("landing.heroTitle2")}</span> {t("landing.heroTitle3")}{" "}
              <span className="text-primary">{t("landing.heroTitle4")}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">{t("landing.heroSubtitle")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="text-base px-8">{t("nav.registerSchool")} <ArrowRight className="ml-2 h-5 w-5" /></Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="text-base px-8">{t("landing.seeHow")}</Button>
              </a>
            </div>
            <div className="flex items-center justify-center gap-6 mt-10 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> {t("landing.freeTrial")}</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> {t("landing.noCard")}</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> {t("landing.setupTime")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("landing.problemTitle")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("landing.problemSubtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {problems.map((p, i) => (
              <Card key={i} className="border bg-card">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                    <p.icon className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="font-semibold text-sm text-destructive mb-2">{t("landing.problem")}</p>
                  <p className="font-medium mb-3">{p.problem}</p>
                  <div className="border-t pt-3">
                    <p className="font-semibold text-sm text-primary mb-1">{t("landing.solution")}</p>
                    <p className="text-sm text-muted-foreground">{p.solution}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("landing.featuresTitle")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("landing.featuresSubtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Card key={i} className="border bg-card hover:shadow-lg transition-shadow group">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Scheduler Visual */}
      <section id="scheduler" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("landing.schedulerTitle")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("landing.schedulerSubtitle")}</p>
          </div>
          <Card className="border bg-card max-w-4xl mx-auto overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{t("landing.mondaySchedule")}</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{t("landing.schedulerLabel")}</span>
              </div>
              <div className="divide-y">
                {schedulerSlots.map((slot, i) => (
                  <div key={i} className={`flex items-center gap-4 px-4 py-3 ${slot.conflict ? "bg-destructive/5" : ""}`}>
                    <span className="text-sm font-mono text-muted-foreground w-14">{slot.time}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t(`scheduler.subjects.${slot.subjectKey}`)}</p>
                      <p className="text-xs text-muted-foreground">{slot.teacher} · {slot.room}</p>
                    </div>
                    {slot.conflict ? (
                      <span className="flex items-center gap-1 text-xs text-destructive font-medium px-2 py-1 rounded-full bg-destructive/10">
                        <AlertTriangle className="h-3 w-3" /> {t("landing.roomConflict")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-primary font-medium">
                        <CheckCircle2 className="h-3 w-3" /> OK
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("landing.pricingTitle")}</h2>
            <p className="text-muted-foreground">{t("landing.pricingSubtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <Card key={i} className={`border relative ${plan.highlighted ? "border-primary shadow-lg scale-105" : "bg-card"}`}>
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {t("landing.mostPopular")}
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register">
                    <Button className="w-full" variant={plan.highlighted ? "default" : "outline"}>{plan.cta}</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("landing.testimonialsTitle")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonialAuthors.map((author, i) => (
              <Card key={i} className="border bg-card">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: author.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">"{t(`testimonials.${author.key}`)}"</p>
                  <div>
                    <p className="text-sm font-semibold">{author.name}</p>
                    <p className="text-xs text-muted-foreground">{author.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">{t("landing.ctaTitle")}</h2>
          <p className="text-muted-foreground mb-8">{t("landing.ctaSubtitle")}</p>
          <Link to="/register">
            <Button size="lg" className="text-base px-8">{t("nav.registerSchool")} <ArrowRight className="ml-2 h-5 w-5" /></Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-bold">SmartSchool <span className="text-primary">AI</span></span>
            </div>
            <p className="text-sm text-muted-foreground">{t("landing.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
