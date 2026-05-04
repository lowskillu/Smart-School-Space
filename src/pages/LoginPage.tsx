import { useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">
            Smart School <span className="text-primary">Space</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center pt-20 px-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl border bg-card shadow-md p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {t("login.title", "Welcome back")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("login.subtitle", "Sign in to your SmartSchool account")}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none" htmlFor="login-email">
                  {t("login.email", "Email")}
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@space.io"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none" htmlFor="login-password">
                  {t("login.password", "Password")}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {loading
                  ? t("login.signingIn", "Signing in…")
                  : t("login.signIn", "Sign in")}
              </button>
            </form>

            {/* Interactive Demo Credentials Card */}
            <div className="rounded-xl border bg-muted/30 p-5 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl" />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    {t('login.demoAccounts', 'Space Demo Core')}
                  </p>
                </div>
                <div className="h-4 w-[1px] bg-border mx-2" />
                <p className="text-[9px] font-bold text-primary/60 uppercase">Quick Access</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-10">
                {[
                  { label: t("roles.admin", "Admin"), email: "admin@space.io", pass: "admin123", icon: "👑" },
                  { label: t("roles.teacher", "Teacher") + " 1", email: "teacher_1@space.io", pass: "teacher123", icon: "👨‍🏫" },
                  { label: t("roles.student", "Student") + " 1", email: "student_1@space.io", pass: "student123", icon: "🎓" },
                ].map((cred) => (
                  <button
                    key={cred.label}
                    type="button"
                    onClick={() => {
                      setEmail(cred.email);
                      setPassword(cred.pass);
                      navigator.clipboard.writeText(cred.email);
                      toast.success(`${cred.label} credentials synced`, {
                        description: `Password: ${cred.pass}`,
                        icon: <LogIn className="h-4 w-4" />
                      });
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/50 hover:border-primary/40 hover:shadow-sm transition-all group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{cred.icon}</span>
                      <div className="text-left">
                        <p className="text-[9px] font-black uppercase text-foreground/80 tracking-wide leading-none mb-1">{cred.label}</p>
                        <p className="text-[10px] text-muted-foreground font-medium leading-none">{cred.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[8px] font-mono text-muted-foreground/60">{cred.pass}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-muted-foreground/10 flex items-center justify-between text-[10px] relative z-10">
                <span className="text-muted-foreground font-medium">Click any card to auto-fill & copy</span>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold border border-primary/20 tracking-tighter">SPACE v4.0</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
