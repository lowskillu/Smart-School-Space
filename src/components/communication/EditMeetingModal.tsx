import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, User as UserIcon, X, Calendar, Video, Loader2, Settings2, GraduationCap, ChevronRight, ChevronDown, Type } from "lucide-react";
import { useUserSearch, useClasses, MeetingRow, useTeachers } from "@/hooks/useApiData";
import { useDebounce } from "@/hooks/useDebounce";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DurationInput } from "./DurationInput";
import { ClassGroupRow } from "./ClassGroupRow";
import { RoleGroupRow } from "./RoleGroupRow";
import { TimePicker24h } from "./TimePicker24h";
import { toast } from "sonner";

interface EditMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: MeetingRow | null;
  onUpdate: (data: { id: string; title?: string; scheduled_time?: string; duration?: number; participant_ids: string[]; class_ids: string[] }) => void;
}

export function EditMeetingModal({ open, onOpenChange, meeting, onUpdate }: EditMeetingModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("12:00");
  const [duration, setDuration] = useState("60");
  const [search, setSearch] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<{ id: string; name: string }[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<{ id: string; name: string }[]>([]);
  const [expandedGrades, setExpandedGrades] = useState<Record<number, boolean>>({});
  
  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title);
      if (meeting.scheduled_time) {
        const d = new Date(meeting.scheduled_time);
        setDateStr(meeting.scheduled_time.split('T')[0]);
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        setTimeStr(`${h}:${m}`);
      }
      setDuration(meeting.duration?.toString() || "60");
      setSelectedParticipants((meeting as any).participants || []);
      setSelectedClasses((meeting as any).classes || []);
    }
  }, [meeting]);

  const debouncedSearch = useDebounce(search, 300);
  const { data: users, isLoading: usersLoading } = useUserSearch({ q: debouncedSearch });
  const { data: classes } = useClasses();

  const groupedClasses = classes?.reduce((acc, c) => {
    const grade = c.grade_level || 0;
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(c);
    return acc;
  }, {} as Record<number, any[]>) || {};

  const sortedGrades = Object.keys(groupedClasses).map(Number).sort((a, b) => a - b);

  const handleUpdate = () => {
    if (meeting && title.trim()) {
      let finalTime = undefined;
      if (dateStr && timeStr) {
        const localDate = new Date(`${dateStr}T${timeStr}:00`);
        if (!isNaN(localDate.getTime())) {
          finalTime = localDate.toISOString();
        }
      }

      onUpdate({
        id: meeting.id,
        title,
        scheduled_time: finalTime,
        duration: parseInt(duration) || 60,
        participant_ids: selectedParticipants.map(p => p.id),
        class_ids: selectedClasses.map(c => c.id)
      });
      onOpenChange(false);
    }
  };

  const toggleParticipant = (u: { id: string; name: string }) => {
    if (selectedParticipants.find(p => p.id === u.id)) {
      setSelectedParticipants(prev => prev.filter(p => p.id !== u.id));
    } else {
      setSelectedParticipants(prev => [...prev, u]);
    }
  };

  const toggleClass = (c: { id: string; name: string }) => {
    if (selectedClasses.find(cl => cl.id === c.id)) {
      setSelectedClasses(prev => prev.filter(cl => cl.id !== c.id));
    } else {
      setSelectedClasses(prev => [...prev, c]);
    }
  };

  const toggleGrade = (grade: number) => {
    setExpandedGrades(prev => ({ ...prev, [grade]: !prev[grade] }));
  };

  const handleToggleRole = (usersToToggle: { id: string; name: string }[]) => {
    const allSelected = usersToToggle.every(u => selectedParticipants.find(p => p.id === u.id));
    
    if (allSelected) {
      // Remove all
      const idsToRemove = new Set(usersToToggle.map(u => u.id));
      setSelectedParticipants(prev => prev.filter(p => !idsToRemove.has(p.id)));
    } else {
      // Add missing
      setSelectedParticipants(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = usersToToggle.filter(u => !existingIds.has(u.id));
        return [...prev, ...newItems];
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] bg-card/95 backdrop-blur-2xl border-primary/10 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tighter italic">
            <Settings2 className="h-6 w-6 text-primary" />
            {t("communicationHub.modals.editMeeting")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-0 overflow-hidden">
          {/* Top Config Row */}
          <div className="flex flex-row items-end gap-6 p-6 pt-2 bg-primary/5 border-b border-primary/5">
            <div className="flex-[2] space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1">
                <Type className="h-3 w-3" />
                {t("communicationHub.modals.meetingForm.titleLabel")}
              </label>
              <Input
                placeholder={t("communicationHub.modals.meetingForm.titlePlaceholder")}
                className="bg-background/80 border-primary/10 h-11 rounded-xl font-bold"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="flex-1 space-y-2 min-w-[170px]">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("communicationHub.modals.meetingForm.dateLabel")}
              </label>
              <Input
                type="date"
                className="bg-background/80 border-primary/10 h-11 rounded-xl font-bold"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <TimePicker24h 
                label={t("communicationHub.modals.meetingForm.timeLabel")}
                value={timeStr}
                onChange={setTimeStr}
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-primary/5 border-b border-primary/5">
             <DurationInput 
               label={t("communicationHub.modals.meetingForm.durationLabel")} 
               value={duration} 
               onChange={setDuration} 
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 h-[450px]">
             {/* Left Column */}
             <div className="md:col-span-2 border-r border-primary/5 p-4 flex flex-col gap-4 bg-background/20">
                <div className="flex-1 flex flex-col min-h-0">
                   <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 italic mb-2">
                      {t("communicationHub.modals.meetingForm.selectedCount", { count: selectedParticipants.length + selectedClasses.length })}
                   </label>
                   <ScrollArea className="flex-1 -mx-1 px-1">
                      <div className="flex flex-wrap gap-2">
                        {selectedClasses.map(c => (
                          <Badge key={c.id} className="gap-1 px-2 py-1 bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-tighter rounded-lg">
                            {c.name}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => toggleClass(c)} />
                          </Badge>
                        ))}
                        {selectedParticipants.map(p => (
                          <Badge key={p.id} variant="outline" className="gap-1 px-2 py-1 bg-background/50 font-black text-[9px] uppercase tracking-tighter border-primary/20 rounded-lg">
                            {p.name}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => toggleParticipant(p)} />
                          </Badge>
                        ))}
                      </div>
                   </ScrollArea>
                </div>
             </div>

             {/* Right Column */}
             <div className="md:col-span-3 p-4 flex flex-col gap-4 overflow-hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("communicationHub.modals.filters.searchName")}
                    className="pl-10 bg-background/50 border-primary/10 h-10 rounded-xl"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <ScrollArea className="flex-1 -mx-2 px-2">
                   <div className="space-y-6">
                      {search && (
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Search Results</label>
                          <div className="grid grid-cols-1 gap-1">
                            {usersLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto" /> : users?.map(u => (
                              <div 
                                key={u.id}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all",
                                  selectedParticipants.find(p => p.id === u.id) ? "bg-primary/20 text-primary" : "hover:bg-primary/5"
                                )}
                                onClick={() => toggleParticipant({ id: u.id, name: u.name })}
                              >
                                <Avatar className="h-7 w-7 ring-2 ring-background">
                                  <AvatarFallback className="text-[9px] font-black">{u.name.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <span className="truncate flex-1 font-bold text-xs">{u.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Staff & Roles Section */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">Staff & Roles</label>
                        <div className="space-y-1">
                           <RoleGroupRow 
                              roleName="teacher" 
                              label={t("communicationHub.modals.meetingForm.roleGroups.teachers")} 
                              onToggleRole={handleToggleRole} 
                              selectedUserIds={selectedParticipants.map(p => p.id)} 
                              onToggleUser={toggleParticipant} 
                           />
                           <RoleGroupRow 
                              roleName="counselor" 
                              label={t("communicationHub.modals.meetingForm.roleGroups.counselors")} 
                              onToggleRole={handleToggleRole} 
                              selectedUserIds={selectedParticipants.map(p => p.id)} 
                              onToggleUser={toggleParticipant} 
                           />
                           <RoleGroupRow 
                              roleName="curator" 
                              label={t("communicationHub.modals.meetingForm.roleGroups.curators")} 
                              onToggleRole={handleToggleRole} 
                              selectedUserIds={selectedParticipants.map(p => p.id)} 
                              onToggleUser={toggleParticipant} 
                           />
                           <RoleGroupRow 
                              roleName="admin" 
                              label={t("communicationHub.modals.meetingForm.roleGroups.admins")} 
                              onToggleRole={handleToggleRole} 
                              selectedUserIds={selectedParticipants.map(p => p.id)} 
                              onToggleUser={toggleParticipant} 
                           />
                        </div>
                      </div>

                      {/* Classes Section */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">
                           {t("communicationHub.modals.meetingForm.classesAndStudents")}
                        </label>
                        <div className="space-y-2">
                           {sortedGrades.map(grade => (
                              <div key={grade} className="border border-primary/5 rounded-2xl overflow-hidden bg-background/20">
                                 <button 
                                   onClick={() => toggleGrade(grade)}
                                   className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
                                 >
                                    <div className="flex items-center gap-2">
                                       <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                          {grade}
                                       </div>
                                       <span className="text-[11px] font-black uppercase tracking-widest">
                                          {grade === 0 ? "Other Groups" : `${grade} Grade`}
                                       </span>
                                    </div>
                                    {expandedGrades[grade] ? <ChevronDown className="h-4 w-4 opacity-40" /> : <ChevronRight className="h-4 w-4 opacity-40" />}
                                 </button>
                                 
                                 {expandedGrades[grade] && (
                                   <div className="p-2 pt-0 space-y-1 animate-in slide-in-from-top-1">
                                      {groupedClasses[grade].map(c => (
                                        <ClassGroupRow 
                                          key={c.id}
                                          classObj={c}
                                          isSelected={!!selectedClasses.find(cl => cl.id === c.id)}
                                          onToggleClass={() => toggleClass({ id: c.id, name: c.name })}
                                          selectedStudentIds={selectedParticipants.map(p => p.id)}
                                          onToggleStudent={toggleParticipant}
                                        />
                                      ))}
                                   </div>
                                 )}
                              </div>
                           ))}
                        </div>
                      </div>
                   </div>
                </ScrollArea>
             </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-primary/5 border-t border-primary/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100">
            {t("common.cancel")}
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={!title.trim()}
            className="bg-primary text-primary-foreground font-black uppercase tracking-tighter px-8 h-12 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            {t("communicationHub.modals.meetingForm.actionUpdate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
