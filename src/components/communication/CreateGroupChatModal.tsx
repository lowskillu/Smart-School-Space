import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, Loader2, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUserSearch, useClasses } from "@/hooks/useApiData";
import { useDebounce } from "@/hooks/useDebounce";

interface CreateGroupChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, userIds: string[]) => void;
}

export function CreateGroupChatModal({ open, onOpenChange, onCreate }: CreateGroupChatModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  const debouncedSearch = useDebounce(search, 300);
  const { data: classes } = useClasses();
  
  // Enabled if searching OR filters are active
  const isEnabled = !!debouncedSearch || roleFilter !== "all" || classFilter !== "all";
  
  const { data: users, isLoading } = useUserSearch({ 
    q: debouncedSearch,
    role: roleFilter === "all" ? undefined : roleFilter,
    class_id: classFilter === "all" ? undefined : classFilter
  });

  const toggleUser = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (groupName.trim() && selectedIds.length > 0) {
      onCreate(groupName, selectedIds);
      setGroupName("");
      setSelectedIds([]);
      setRoleFilter("all");
      setClassFilter("all");
      setSearch("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase text-primary">
            {t("communicationHub.modals.createGroupChat")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-5 py-4 overflow-y-auto pr-2">
          <div className="space-y-2">
             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Group Identity</label>
             <Input
                placeholder="Name your transmission group..."
                className="h-12 text-lg font-bold border-primary/10 bg-muted/30 rounded-2xl focus-visible:ring-primary/20"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
          </div>

          <div className="space-y-3">
             <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Recruit Members</label>
             <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  className="pl-10 h-11 border-primary/10 bg-muted/20 rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>

             <div className="grid grid-cols-2 gap-3">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-primary/5 bg-muted/10">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="teacher">Teachers</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="counselor">Counselors</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="h-10 rounded-xl border-primary/5 bg-muted/10">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes?.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Scanning database...</span>
              </div>
            ) : isEnabled && users && users.length > 0 ? (
              users.map(user => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <div 
                    key={user.id} 
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? "bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20 translate-x-1" 
                        : "hover:bg-muted/50 border-primary/5"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border-2 border-background/20">
                        <AvatarFallback className={isSelected ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"}>
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm leading-tight">{user.name}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? "opacity-70" : "text-muted-foreground"}`}>
                           {user.role}
                        </span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-primary-foreground animate-in zoom-in" />}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-30 italic">
                <Users className="h-12 w-12 mb-3" />
                <p className="text-sm font-medium">
                  {isEnabled ? "No matching operatives found." : "Adjust filters or search to find members."}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t flex items-center justify-between mt-auto">
          <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recruits</span>
             <span className="text-xl font-black text-primary italic">{selectedIds.length} <span className="text-xs font-medium not-italic text-muted-foreground uppercase tracking-widest">Selected</span></span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-xl font-bold uppercase tracking-widest text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate} 
              disabled={!groupName.trim() || selectedIds.length === 0}
              className="rounded-xl px-8 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
            >
              Create Group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
