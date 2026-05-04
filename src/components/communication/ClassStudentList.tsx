import { useState } from "react";
import { useClassStudents } from "@/hooks/useApiData";
import { ChevronRight, ChevronDown, User, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ClassStudentListProps {
  classId: string;
  className: string;
  selectedIds: string[];
  onToggle: (u: { id: string; name: string }) => void;
}

export function ClassStudentList({ classId, className, selectedIds, onToggle }: ClassStudentListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: students, isLoading } = useClassStudents(isOpen ? classId : undefined);

  return (
    <div className="flex flex-col border border-primary/5 rounded-xl bg-background/20 overflow-hidden mb-1">
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-primary/5 transition-all group",
          isOpen && "bg-primary/5"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100" />}
        <div className="flex-1 min-w-0">
          <span className="text-xs font-black uppercase tracking-tighter truncate">{className} Students</span>
        </div>
        <span className="text-[10px] font-bold opacity-40 italic">{students?.length || "?"}</span>
      </div>
      
      {isOpen && (
        <div className="p-1 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
          {isLoading ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
            </div>
          ) : students?.length === 0 ? (
            <p className="py-2 text-center text-[10px] italic opacity-40 text-muted-foreground">No students in this class</p>
          ) : (
            students?.map(s => (
              <div 
                key={s.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-[11px]",
                  selectedIds.includes(s.user_id) ? "bg-primary/20 text-primary" : "hover:bg-primary/5"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle({ id: s.user_id, name: s.name });
                }}
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[7px] font-black">{s.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="truncate flex-1 font-bold">{s.name}</span>
                {selectedIds.includes(s.user_id) && <Check className="h-3 w-3" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
