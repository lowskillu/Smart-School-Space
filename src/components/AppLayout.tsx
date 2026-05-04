import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Bell, LogOut, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { useUnreadCount } from "@/hooks/useApiData";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const [notifOpen, setNotifOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: unreadCount } = useUnreadCount();
  const prevUnreadCount = useRef<number>(0);

  useEffect(() => {
    if (unreadCount !== undefined && unreadCount > prevUnreadCount.current) {
      // Don't show toast if user is already on the communication page
      if (!location.pathname.includes("/app/communication")) {
        toast("New Message", {
          description: "You have a new unread message in Smart School Space.",
          action: {
            label: "View",
            onClick: () => navigate("/app/communication"),
          },
          icon: <MessageSquare className="h-4 w-4" />,
        });
      }
    }
    if (unreadCount !== undefined) {
      prevUnreadCount.current = unreadCount;
    }
  }, [unreadCount, location.pathname, navigate]);

  // Dynamically update document title based on language
  useEffect(() => {
    document.title = t("brand.name", "SmartSchool AI");
  }, [i18n.language, t]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Avatar initials from user name
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const roleLabel: Record<string, string> = {
    admin: "Administrator",
    teacher: "Teacher",
    student: "Student",
    counselor: "Counselor",
    curator: "Curator",
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b px-4 bg-card">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full relative"
                onClick={() => setNotifOpen(true)}
              >
                <Bell className="h-5 w-5" />
                {(unreadCount !== undefined && unreadCount > 0) && (
                  <span className="absolute top-1 right-1 h-4 min-w-[1rem] px-1 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>

              <LanguageSwitcher />
              <ThemeToggle />

              {/* User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold ring-offset-background transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="User menu"
                  >
                    {initials}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none">{user?.name ?? "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="gap-2 cursor-default opacity-70 pointer-events-none">
                      <Shield className="h-4 w-4" />
                      <span>{roleLabel[user?.role ?? "student"] ?? user?.role}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </div>
      </div>
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </SidebarProvider>
  );
}
