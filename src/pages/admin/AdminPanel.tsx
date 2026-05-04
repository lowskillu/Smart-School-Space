import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Shield, Plus, Minus, Search, Edit, UserPlus, X, 
  Lock, ArrowLeft, Settings, GraduationCap, 
  Calendar, Database, ShieldCheck, Activity,
  Globe, Mail, Hash, Trash2, Check, AlertCircle,
  Building, LayoutGrid, Sliders, Save, Eye, EyeOff, Utensils
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { 
  useUsers, useRoles, useUpdateUser, useCreateUser, useDeleteUser,
  useSettings, useUpdateSettings, useTeacherConstraints, useUpdateTeacherConstraints,
  useSubjects, usePermissions, useUpdateRolePermissions
} from '@/hooks/useApiData';
import SchoolCalendar from '@/components/admin/SchoolCalendar';

// ======== TYPES ========
interface UserRecord {
  id: string;
  name: string;
  email: string | null;
  role: string;
  role_id: string;
  student_id?: string;
  teacher_id?: string;
  class_name?: string;
  status?: string;
  password?: string;
}

// Module permissions structure will be computed dynamically

export default function AdminPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // API Hooks
  const { data: dbUsers = [], isLoading: loadingUsers } = useUsers();
  const { data: dbRoles = [], isLoading: loadingRoles } = useRoles();
  const { data: settings = {} } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const { data: teacherConstraints = [] } = useTeacherConstraints();
  const { data: dbSubjects = [] } = useSubjects();
  const { data: allPermissions = [] } = usePermissions();
  const updateRolePermissionsMutation = useUpdateRolePermissions();

  // State
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'identity');
  const [showPw, setShowPw] = useState(false);
  
  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState<Partial<UserRecord>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadLimit, setLoadLimit] = useState<number>(24);
  
  const selectedRoleObj = useMemo(() => dbRoles.find((r:any) => r.id === userForm.role_id), [dbRoles, userForm.role_id]);
  const isTeacherRole = selectedRoleObj?.code?.toLowerCase() === 'teacher' || selectedRoleObj?.name?.toLowerCase() === 'teacher';
  
  const updateConstraint = useUpdateTeacherConstraints();

  // School Settings State
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (dbRoles.length > 0 && !selectedRole) {
        setSelectedRole(dbRoles[0]);
    } else if (dbRoles.length > 0 && selectedRole) {
        // Keep selected role updated if data changes
        const updated = dbRoles.find((r:any) => r.id === selectedRole.id);
        if (updated) setSelectedRole(updated);
    }
  }, [dbRoles]);

  useEffect(() => {
    if (settings) {
        setLocalSettings(settings);
    }
  }, [settings]);

  const filteredUsers = dbUsers.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSaveUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.role_id) {
        toast.error("Please fill all required fields");
        return;
    }

    setIsSubmitting(true);
    try {
        let targetTeacherId = userForm.teacher_id;

        if (userForm.id) {
            await updateUserMutation.mutateAsync({
                id: userForm.id,
                name: userForm.name,
                role_id: userForm.role_id,
                password: userForm.password, // Include password if provided
            });
            toast.success("User identity updated successfully");
        } else {
            const newUser = await createUserMutation.mutateAsync({
                name: userForm.name,
                email: userForm.email,
                role_id: userForm.role_id,
                password: userForm.password || "Password123!", // Custom or default
            });
            targetTeacherId = (newUser as any).teacher_id;
            toast.success("New user provisioned successfully");
        }
        setIsUserModalOpen(false);

        // If teacher, also save limit
        const roleCode = selectedRoleObj?.code?.toLowerCase() || "";
        const roleName = selectedRoleObj?.name?.toLowerCase() || "";
        const isActuallyTeacher = roleCode === 'teacher' || roleName === 'teacher';

        if (isActuallyTeacher && targetTeacherId) {
           await updateConstraint.mutateAsync({
              teacher_id: targetTeacherId,
              max_hours_per_week: loadLimit
           });
        }
    } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to save user");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) return;
    
    try {
        await deleteUserMutation.mutateAsync(user.id);
        toast.success("User record deleted");
    } catch (error) {
        toast.error("Failed to delete user");
    }
  };

  const handleUpdateSettings = async () => {
    try {
        await updateSettingsMutation.mutateAsync(localSettings);
        toast.success("Global settings updated");
    } catch (err) {
        toast.error("Failed to update settings");
    }
  };

  const handleTogglePermission = async (roleId: string, permCode: string, isChecked: boolean) => {
    const role = dbRoles.find((r:any) => r.id === roleId);
    if (!role) return;

    let newPermissions = [...(role.permissions || [])];
    if (isChecked) {
        if (!newPermissions.includes(permCode)) newPermissions.push(permCode);
    } else {
        newPermissions = newPermissions.filter(p => p !== permCode);
    }

    try {
        await updateRolePermissionsMutation.mutateAsync({ roleId, permissions: newPermissions });
        toast.success(isChecked ? "Permission granted" : "Permission revoked");
    } catch (error) {
        toast.error("Failed to update role authority");
    }
  };

  const dynamicModules = useMemo(() => {
    const tabs = allPermissions.filter(p => p.code.startsWith('tab_'));
    const actions = allPermissions.filter(p => p.code.startsWith('action_'));
    const others = allPermissions.filter(p => !p.code.startsWith('tab_') && !p.code.startsWith('action_'));

    return [
      { id: 'tabs', title: t('adminPanel.moduleAccess', 'Module Access (Tabs)'), permissions: tabs },
      { id: 'actions', title: t('adminPanel.granularControl', 'Granular Control (Actions)'), permissions: actions },
      { id: 'others', title: t('adminPanel.otherRights', 'Other Rights'), permissions: others }
    ].filter(m => m.permissions.length > 0);
  }, [allPermissions, t]);

  return (
    <div className="space-y-6 container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card border rounded-2xl p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="space-y-2 relative z-10">
          <Badge variant="secondary" className="px-3 py-1 font-bold tracking-tight text-primary bg-primary/10 border-primary/20">
            {t('adminPanel.adminHubTitle', 'School Administration')}
          </Badge>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight">{t('adminPanel.adminHubTitle', 'Administration Hub')}</h1>
          <p className="text-muted-foreground font-medium max-w-xl">
            {t('adminPanel.adminHubDesc', 'Manage system users, academic standards, and platform configurations.')}
          </p>
        </div>
        <div className="flex gap-3 relative z-10">
          <div className="bg-muted/50 p-4 rounded-xl border min-w-[120px]">
            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">{t('adminPanel.totalSouls', 'Total Users')}</p>
            <p className="text-2xl font-black">{dbUsers.length}</p>
          </div>
          <div className="bg-muted/50 p-4 rounded-xl border min-w-[120px]">
            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">{t('adminPanel.systemHealth', 'Uptime')}</p>
            <p className="text-2xl font-black text-emerald-500">100%</p>
          </div>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(val) => {
          setActiveTab(val);
          setSearchParams({ tab: val });
        }} 
        className="w-full space-y-6"
      >
        <TabsList className="bg-card border h-auto p-1.5 rounded-2xl flex flex-wrap justify-center sm:justify-start gap-1">
          <TabsTrigger value="identity" className="rounded-xl px-5 py-2.5 font-bold space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4" /> <span>{t('adminPanel.identityManager', 'Users')}</span>
          </TabsTrigger>
          <TabsTrigger value="authority" className="rounded-xl px-5 py-2.5 font-bold space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="w-4 h-4" /> <span>{t('adminPanel.authorityMatrix', 'Role Matrix')}</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-xl px-5 py-2.5 font-bold space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="w-4 h-4" /> <span>{t('adminPanel.schoolSettings', 'Settings')}</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="rounded-xl px-5 py-2.5 font-bold space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="w-4 h-4" /> <span>{t('adminPanel.schoolCalendar', 'Calendar')}</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. USERS LIST */}
        <TabsContent value="identity" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="rounded-3xl border shadow-sm overflow-hidden">
            <CardHeader className="p-6 md:p-8 border-b bg-muted/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold">{t('adminPanel.userLifecycle', 'User Management')}</CardTitle>
                <CardDescription>{t('adminPanel.provisionDesc', 'Create and manage academic roles and credentials.')}</CardDescription>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64 lg:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder={t('adminPanel.findPlaceholder', 'Search users...')} 
                    className="pl-9 h-11 rounded-xl bg-background border-muted"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Button onClick={() => { setUserForm({ status: 'Active' }); setLoadLimit(24); setIsUserModalOpen(true); }} className="rounded-xl font-bold h-11">
                  <Plus className="w-4 h-4 mr-2" /> {t('adminPanel.provisionUser', 'Add User')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/5 hover:bg-muted/5">
                      <TableHead className="px-8 py-4 font-bold text-xs uppercase tracking-wider">{t('adminPanel.identity', 'Name')}</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">{t('adminPanel.role', 'Role')}</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">{t('classesManager.grade', 'Class')}</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">{t('adminPanel.specialization', 'Specialization')}</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider hidden lg:table-cell">{t('adminPanel.weeklyLimit', 'Weekly Limit')}</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider hidden md:table-cell">{t('adminPanel.status', 'Status')}</TableHead>
                      <TableHead className="text-right px-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                      <TableRow key={user.id} className="group border-b last:border-0 hover:bg-muted/5 transition-colors">
                        <TableCell className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary ring-2 ring-background border border-primary/20">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email || '—'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="px-3 py-1 font-semibold uppercase text-[10px] tracking-wide border-primary/20 text-primary bg-primary/5">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                           {user.role?.toLowerCase() === 'student' ? (
                             user.class_name ? (
                               <Badge variant="outline" className="px-2 py-0.5 font-bold text-[10px] bg-background">
                                 {user.class_name}
                               </Badge>
                             ) : (
                               <Badge variant="ghost" className="px-2 py-0.5 font-bold text-[10px] text-amber-600 bg-amber-500/10 border border-amber-500/20">
                                 {t('classesManager.unassigned')}
                               </Badge>
                             )
                           ) : (
                             <span className="text-muted-foreground/20">—</span>
                           )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                           <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {user.role?.toLowerCase() === 'teacher' && dbSubjects
                                .filter((s:any) => s.teacher_ids?.includes(user.teacher_id))
                                .map((s:any) => (
                                   <Badge key={s.id} variant="secondary" className="bg-muted text-[9px] font-bold px-1.5 py-0 rounded-md">
                                      {s.name}
                                   </Badge>
                                ))}
                              {user.role?.toLowerCase() === 'teacher' && dbSubjects.filter((s:any) => s.teacher_ids?.includes(user.teacher_id)).length === 0 && (
                                 <span className="text-[10px] text-muted-foreground/40 italic">None</span>
                              )}
                           </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                           <div className="flex items-center gap-3">
                              {user.role?.toLowerCase() === 'teacher' ? (
                                 <>
                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                                       {teacherConstraints.find(c => c.teacher_id === user.teacher_id)?.max_hours_per_week || 24} ч
                                    </span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                      onClick={() => { 
                                         setUserForm(user); 
                                         setLoadLimit(teacherConstraints.find(c => c.teacher_id === user.teacher_id)?.max_hours_per_week || 24); 
                                         setIsUserModalOpen(true); 
                                      }}
                                    >
                                       <Sliders className="h-3.5 w-3.5" />
                                    </Button>
                                 </>
                              ) : (
                                 <span className="text-muted-foreground/20">—</span>
                              )}
                           </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                            <span className="text-xs font-bold text-muted-foreground uppercase">{t('adminPanel.active', 'Active')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => { 
                               setUserForm(user); 
                               setLoadLimit(teacherConstraints.find(c => c.teacher_id === user.teacher_id)?.max_hours_per_week || 24);
                               setIsUserModalOpen(true); 
                            }}>
                               <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/5" onClick={() => handleDeleteUser(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic">
                           {loadingUsers ? t("common.loading", "Loading...") : t("adminPanel.no_identities", "No identities found.")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ROLE MATRIX */}
        <TabsContent value="authority" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-4 rounded-3xl border shadow-sm">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">{t("adminPanel.base_roles", "Base Roles")}</CardTitle>
                    <Plus className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                </div>
                <CardDescription>Select a blueprint to configure agency.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {dbRoles.map(role => (
                  <button 
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border flex items-center justify-between group ${selectedRole?.id === role.id ? 'bg-primary border-primary text-primary-foreground shadow-md ring-4 ring-primary/10' : 'hover:bg-muted border-transparent'}`}
                  >
                    <div className="flex items-center gap-3">
                        <Shield className={`w-5 h-5 ${selectedRole?.id === role.id ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
                        <span className="font-bold capitalize">{role.name}</span>
                    </div>
                    {selectedRole?.id === role.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-8 rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="p-8 border-b bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black capitalize">{selectedRole?.name || 'Permissions'}</CardTitle>
                    <CardDescription>Granular access control settings for the {selectedRole?.name} role.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {selectedRole ? (
                  <div className="divide-y">
                    {dynamicModules.map(module => (
                      <div key={module.id} className="p-8 space-y-6 group hover:bg-muted/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="w-5 h-5 text-primary" />
                          <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">{module.title}</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {module.permissions.map(perm => {
                            const isGranted = selectedRole.permissions?.includes(perm.code);
                            return (
                                <div 
                                  key={perm.code} 
                                  onClick={() => handleTogglePermission(selectedRole.id, perm.code, !isGranted)}
                                  className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                                    isGranted ? "bg-primary/5 border-primary/20 scale-[1.01]" : "border-border/60 bg-muted/10 hover:bg-background"
                                  )}
                                >
                                    <div className="flex flex-col">
                                      <label className="text-xs font-black uppercase tracking-tight cursor-pointer">
                                          {perm.code.replace('tab_', '').replace('action_', '').replace(/_/g, ' ')}
                                      </label>
                                      <span className="text-[10px] text-muted-foreground font-medium">{perm.description}</span>
                                    </div>
                                    <Checkbox 
                                        checked={isGranted} 
                                        onCheckedChange={(val) => handleTogglePermission(selectedRole.id, perm.code, !!val)}
                                        className="h-5 w-5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-primary"
                                    />
                                </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-80 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                    <ShieldCheck className="h-12 w-12 opacity-10 animate-pulse" />
                    <p className="font-medium">Please select a role to view the authority matrix.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. SETTINGS */}
        <TabsContent value="system" className="animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-3xl border shadow-sm p-8 md:p-10">
               <div className="flex items-center gap-3 mb-8">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Building className="w-6 h-6" /></div>
                  <div>
                    <CardTitle className="text-2xl font-bold">{t("adminPanel.institutional_profile", "Institutional Profile")}</CardTitle>
                    <CardDescription>Identity and contact details for the Space platform metadata.</CardDescription>
                  </div>
               </div>
               
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("adminPanel.institution_name", "Institution Name")}</Label>
                        <Input 
                            value={localSettings.school_name || ''} 
                            onChange={(e) => setLocalSettings(prev => ({...prev, school_name: e.target.value}))} 
                            className="h-12 rounded-xl" 
                            placeholder="e.g. Smart School Space"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("adminPanel.admin_email", "Admin System Email")}</Label>
                        <Input 
                            value={localSettings.admin_email || ''} 
                            onChange={(e) => setLocalSettings(prev => ({...prev, admin_email: e.target.value}))} 
                            className="h-12 rounded-xl" 
                            placeholder="e.g. sys-admin@smart-space.io"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("adminPanel.timezone", "Timezone Engine")}</Label>
                        <Select 
                            value={localSettings.timezone || 'UTC+5'} 
                            onValueChange={(val) => setLocalSettings(prev => ({...prev, timezone: val}))}
                        >
                            <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="UTC+5">Asia/Almaty (UTC+5)</SelectItem><SelectItem value="UTC+3">Europe/Moscow (UTC+3)</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("adminPanel.system_language", "System Language")}</Label>
                        <Select 
                            value={localSettings.default_lang || 'ru'} 
                            onValueChange={(val) => setLocalSettings(prev => ({...prev, default_lang: val}))}
                        >
                            <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ru">Russian (Русский)</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="kk">Kazakh (Қазақ)</SelectItem>
                                <SelectItem value="es">Spanish (Español)</SelectItem>
                                <SelectItem value="zh">Chinese (中文)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <Button onClick={handleUpdateSettings} className="rounded-xl px-10 font-black h-12 shadow-lg shadow-primary/10">
                        <Save className="w-4 h-4 mr-2" /> Save Global Settings
                    </Button>
                  </div>
               </div>
            </Card>

            <Card className="rounded-3xl border shadow-sm p-8 bg-destructive/5 border-destructive/20 h-fit">
              <div className="flex items-center gap-3 mb-6 text-destructive">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-bold text-lg uppercase tracking-tight">{t("adminPanel.system_safety", "System Safety")}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">High-level operations that impact database integrity. Proceed with extreme caution.</p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 font-bold h-11">
                  Rebuild Permission Cache
                </Button>
                <Button variant="destructive" className="w-full rounded-xl font-bold h-11 shadow-lg shadow-destructive/20">
                  Total System Purge
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="animate-in slide-in-from-bottom-2 duration-300">
          <SchoolCalendar isAdmin={true} />
        </TabsContent>
      </Tabs>

      {/* USER MODAL */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] p-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-xl" />
          <DialogHeader className="mb-6 relative z-10">
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-primary" />
              {userForm.id ? t('adminPanel.modifyIdentity', 'Edit User') : t('adminPanel.provisionNew', 'Add User')}
            </DialogTitle>
            <CardDescription>{t('adminPanel.systemProvisioningDesc', 'Assign credentials and roles in Space Core.')}</CardDescription>
          </DialogHeader>
          
          <div className="grid gap-6 relative z-10">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('adminPanel.fullRealName', 'Full Name')}</Label>
                <Input value={userForm.name || ''} onChange={e => setUserForm({...userForm, name: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-muted" />
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('adminPanel.emailVector', 'Email Address')}</Label>
                <Input value={userForm.email || ''} onChange={e => setUserForm({...userForm, email: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-muted" disabled={!!userForm.id} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('adminPanel.roleOverride', 'System Role')}</Label>
                    <Select value={userForm.role_id} onValueChange={(val) => setUserForm({...userForm, role_id: val})}>
                        <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-muted"><SelectValue placeholder={t('adminPanel.selectRank', 'Select role')} /></SelectTrigger>
                        <SelectContent>
                            {dbRoles.map(r => <SelectItem key={r.id} value={r.id} className="capitalize">{r.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('adminPanel.accountState', 'Status')}</Label>
                    <Select defaultValue="active">
                        <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-muted"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">{t("common.active", "Active")}</SelectItem>
                            <SelectItem value="suspended">{t("common.suspended", "Suspended")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {isTeacherRole && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Load Limit (Hours/Week)</Label>
                        <div className="flex items-center gap-4 bg-primary/5 rounded-[1.25rem] p-2 border border-primary/10">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-xl hover:bg-primary/20 hover:text-primary transition-all active:scale-90"
                                onClick={() => setLoadLimit(Math.max(1, loadLimit - 1))}
                                type="button"
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <div className="flex-1 text-center">
                                <span className="text-xl font-black text-primary tracking-tighter">{loadLimit}</span>
                                <span className="text-[10px] font-black uppercase opacity-40 ml-2">hrs</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-xl hover:bg-primary/20 hover:text-primary transition-all active:scale-90"
                                onClick={() => setLoadLimit(loadLimit + 1)}
                                type="button"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {userForm.id ? "New Password (Leave blank to keep current)" : "Initial Password"}
                </Label>
                <div className="relative">
                  <Input 
                    type={showPw ? "text" : "password"}
                    value={userForm.password || ''} 
                    onChange={e => setUserForm({...userForm, password: e.target.value})} 
                    className="h-12 rounded-xl bg-muted/30 border-muted pr-10" 
                    placeholder={userForm.id ? "••••••••" : "Password123!"}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
            </div>

            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div>
                    <p className="font-black text-[10px] uppercase tracking-widest text-primary">{t("adminPanel.security_context", "Security Context")}</p>
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">Role: {dbRoles.find(r => r.id === userForm.role_id)?.name || 'None'}</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          <DialogFooter className="mt-8 gap-3 flex-col sm:flex-row">
             <Button variant="ghost" onClick={() => setIsUserModalOpen(false)} className="rounded-xl px-6 font-bold h-12">
                {t('adminPanel.cancel', 'Cancel')}
             </Button>
             <Button onClick={handleSaveUser} disabled={isSubmitting} className="rounded-xl px-10 font-bold h-12 shadow-lg shadow-primary/20">
                {isSubmitting ? <Activity className="animate-spin h-4 w-4" /> : t('adminPanel.saveChanges', 'Confirm Identity')}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
