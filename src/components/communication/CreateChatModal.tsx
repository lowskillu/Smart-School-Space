import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUserSearch, useClasses } from "@/hooks/useApiData";
import { useDebounce } from "@/hooks/useDebounce";

interface CreateChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (userId: string) => void;
}

export function CreateChatModal({ open, onOpenChange, onCreate }: CreateChatModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  
  const debouncedSearch = useDebounce(search, 300);
  
  const { data: classes } = useClasses();
  const { data: users, isLoading } = useUserSearch({
    q: debouncedSearch,
    role: roleFilter === "all" ? undefined : roleFilter,
    class_id: classFilter === "all" ? undefined : classFilter
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("communicationHub.modals.createChat")}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("communicationHub.modals.filters.searchName")}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("communicationHub.modals.filters.allRoles")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("communicationHub.modals.filters.allRoles")}</SelectItem>
                <SelectItem value="teacher">{t("communicationHub.modals.filters.teachers")}</SelectItem>
                <SelectItem value="student">{t("communicationHub.modals.filters.students")}</SelectItem>
                <SelectItem value="counselor">{t("communicationHub.modals.filters.counselors")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("communicationHub.modals.filters.allHouses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("communicationHub.modals.filters.allHouses")}</SelectItem>
                {classes?.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 mt-2 pr-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : users && users.length > 0 ? (
              users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{user.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {user.role} {user.email ? `• ${user.email}` : ""}
                      </span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => onCreate(user.id)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {debouncedSearch || roleFilter !== "all" || classFilter !== "all" 
                  ? "No users found matching your filters."
                  : "Search for users to start a chat."}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
