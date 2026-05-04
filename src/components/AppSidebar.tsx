import React, { useMemo } from 'react';
import {
  LayoutDashboard, Users, GraduationCap, Trophy, MessageSquare, LayoutGrid,
  UtensilsCrossed, BookOpen, CalendarDays, UserPlus, Compass, Bell,
  FileText, Search, Shield, FolderOpen, Database, DoorOpen, Utensils, Target
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";
import { useSchool, type UserRole } from "@/contexts/SchoolContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  titleKey: string;
  url: string;
  icon: React.ElementType;
  permission?: string;
}

const navByRole: Record<UserRole, { main: NavItem[]; extra?: { label: string; items: NavItem[] } }> = {
  admin: {
    main: [
      { titleKey: "sidebar.dashboard", url: "/app", icon: LayoutDashboard, permission: "tab_dashboard" },
      { titleKey: "sidebar.courses", url: "/app/my-courses", icon: BookOpen },
      { titleKey: "sidebar.marks", url: "/app/teacher/grades", icon: FileText, permission: "tab_marks" },
      { titleKey: "sidebar.communication", url: "/app/communication", icon: MessageSquare, permission: "tab_communication" },
      { titleKey: "sidebar.attendance", url: "/app/attendance", icon: Users, permission: "tab_attendance" },
      { titleKey: "sidebar.services", url: "/app/meals", icon: UtensilsCrossed, permission: "tab_services" },
      { titleKey: "sidebar.alumni", url: "/app/alumni", icon: Trophy, permission: "tab_alumni" },
      { titleKey: "sidebar.schoolCalendar", url: "/app/calendar", icon: CalendarDays },
    ],
    extra: {
      label: "sidebar.administration",
      items: [
        {titleKey: "sidebar.adminPanel", url: "/app/admin", icon: LayoutDashboard, permission: "tab_admin_panel"},
        {titleKey: "sidebar.userAdmin", url: "/app/admin/users", icon: Shield, permission: "tab_user_management"},
        {titleKey: "sidebar.classesAdmin", url: "/app/admin/classes", icon: LayoutGrid, permission: "tab_classes_admin"},
        {titleKey: "sidebar.subjectsAdmin", url: "/app/admin/subjects", icon: BookOpen, permission: "tab_subjects_admin"},
        {titleKey: "sidebar.roomsAdmin", url: "/app/admin/rooms", icon: DoorOpen, permission: "tab_rooms_admin"},
        {titleKey: "sidebar.staffingAdmin", url: "/app/admin/staffing", icon: UserPlus, permission: "tab_staffing_admin"},
        {titleKey: "sidebar.scheduleManager", url: "/app/admin/schedule", icon: CalendarDays, permission: "tab_schedule"},
        {titleKey: "sidebar.buffetAdmin", url: "/app/admin/buffet", icon: UtensilsCrossed, permission: "tab_services"},
        {titleKey: "sidebar.canteenAdmin", url: "/app/admin/canteen", icon: Utensils, permission: "tab_services"},
        {titleKey: "sidebar.bellSetup", url: "/app/bell-setup", icon: Bell, permission: "tab_bell_setup"},
      ],
    },
  },
  teacher: {
    main: [
      { titleKey: "sidebar.dashboard", url: "/app", icon: LayoutDashboard, permission: "tab_dashboard" },
      { titleKey: "sidebar.courses", url: "/app/my-courses", icon: BookOpen },
      { titleKey: "sidebar.marks", url: "/app/teacher/grades", icon: FileText, permission: "tab_marks" },
      { titleKey: "sidebar.attendance", url: "/app/attendance", icon: Users, permission: "tab_attendance" },
      { titleKey: "sidebar.communication", url: "/app/communication", icon: MessageSquare, permission: "tab_communication" },
      { titleKey: "sidebar.services", url: "/app/meals", icon: UtensilsCrossed, permission: "tab_services" },
      { titleKey: "sidebar.alumni", url: "/app/alumni", icon: Trophy, permission: "tab_alumni" },
      { titleKey: "sidebar.schoolCalendar", url: "/app/calendar", icon: CalendarDays },
    ],
  },
  student: {
    main: [
      { titleKey: "sidebar.dashboard", url: "/app", icon: LayoutDashboard, permission: "tab_dashboard" },
      { titleKey: "sidebar.marks", url: "/app/student/grades", icon: FileText, permission: "tab_marks" },
      { titleKey: "marks.target_calculator", url: "/app/student/target-marks", icon: Target, permission: "tab_marks" },
      { titleKey: "sidebar.courses", url: "/app/my-courses", icon: BookOpen },
      { titleKey: "sidebar.attendance", url: "/app/attendance", icon: Users, permission: "tab_attendance" },
      { titleKey: "sidebar.communication", url: "/app/communication", icon: MessageSquare, permission: "tab_communication" },
      { titleKey: "sidebar.services", url: "/app/meals", icon: UtensilsCrossed, permission: "tab_services" },
      { titleKey: "sidebar.schoolCalendar", url: "/app/calendar", icon: CalendarDays },
      { titleKey: "sidebar.universityPrepare", url: "/app/college-prep", icon: GraduationCap, permission: "tab_admissions" },
    ],
  },
  counselor: {
    main: [
      { titleKey: "sidebar.dashboard", url: "/app", icon: LayoutDashboard, permission: "tab_dashboard" },
      { titleKey: "sidebar.counselorHub", url: "/app/counselor", icon: Compass, permission: "tab_counselor_hub" },
      { titleKey: "sidebar.essayQueue", url: "/app/counselor", icon: FileText, permission: "tab_essay_queue" },
      { titleKey: "sidebar.communication", url: "/app/communication", icon: MessageSquare, permission: "tab_communication" },
      { titleKey: "sidebar.services", url: "/app/meals", icon: UtensilsCrossed, permission: "tab_services" },
      { titleKey: "sidebar.alumni", url: "/app/alumni", icon: Trophy, permission: "tab_alumni" },
      { titleKey: "sidebar.schoolCalendar", url: "/app/calendar", icon: CalendarDays },
      { titleKey: "sidebar.universityPrepare", url: "/app/college-prep", icon: GraduationCap, permission: "tab_admissions" },
    ],
  },
  curator: {
    main: [
      { titleKey: "sidebar.dashboard", url: "/app", icon: LayoutDashboard, permission: "tab_dashboard" },
      { titleKey: "sidebar.curatorSearch", url: "/app/curator", icon: Search, permission: "tab_curator_search" },
      { titleKey: "sidebar.schedule", url: "/app/schedule", icon: CalendarDays, permission: "tab_schedule" },
      { titleKey: "sidebar.attendance", url: "/app/attendance", icon: Users, permission: "tab_attendance" },
      { titleKey: "sidebar.communication", url: "/app/communication", icon: MessageSquare, permission: "tab_communication" },
      { titleKey: "sidebar.services", url: "/app/meals", icon: UtensilsCrossed, permission: "tab_services" },
      { titleKey: "sidebar.alumni", url: "/app/alumni", icon: Trophy, permission: "tab_alumni" },
      { titleKey: "sidebar.schoolCalendar", url: "/app/calendar", icon: CalendarDays },
    ],
  },
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, grade, permissions } = useSchool();
  const { t } = useTranslation();

  const getNavItems = () => {
    const roleNav = navByRole[role];
    if (!roleNav) return [];
    
    const filteredMain = roleNav.main.filter(item => {
      if (!item.permission) return true;
      return permissions.includes(item.permission);
    });

    if (role === "student" && grade && grade < 8) {
      return filteredMain.filter(i => i.titleKey !== "sidebar.universityPrepare" && i.titleKey !== "sidebar.admissionsHub");
    }
    return filteredMain;
  };

  const navItems = getNavItems();
  
  const extraNav = useMemo(() => {
    const rawExtra = navByRole[role]?.extra;
    if (!rawExtra) return null;

    const filteredItems = rawExtra.items.filter(item => {
      if (!item.permission) return true;
      return permissions.includes(item.permission);
    });

    if (filteredItems.length === 0) return null;

    return { ...rawExtra, items: filteredItems };
  }, [role, permissions]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight">
              Smart School <span className="text-primary">Space</span>
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.titleKey + item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/app"}
                      className="hover:bg-accent/50"
                      activeClassName="bg-accent text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{t(item.titleKey)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {extraNav && (
          <SidebarGroup>
            <SidebarGroupLabel>{t(extraNav.label)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {extraNav.items.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-accent/50"
                        activeClassName="bg-accent text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{t(item.titleKey)}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
