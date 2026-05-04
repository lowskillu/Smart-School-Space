import { useState } from "react";
import { useClassStudents } from "@/hooks/useApiData";
import { ChevronRight, ChevronDown, Users, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ClassGroupRowProps {
  classObj: { id: string; name: string };
  isSelected: boolean;
  onToggleClass: () => void;
  selectedStudentIds: string[];
  onToggleStudent: (u: { id: string; name: string }) => void;
}

export function ClassGroupRow({ classObj, isSelected, onToggleClass, selectedStudentIds, onToggleStudent }: ClassGroupRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: students, isLoading } = useClassStudents(isOpen ? classObj.id : undefined);

  return (
    <div className="flex flex-col mb-1 overflow-hidden">
      <div className="flex items-center gap-1 group">
        <div 
          className={cn(
            "flex-1 flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border border-transparent",
            isSelected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-primary/5 border-primary/5 bg-background/40"
          )}
          onClick={onToggleClass}
        >
          <Users className="h-4 w-4" />
          <span className="truncate flex-1 font-black text-xs uppercase tracking-tighter">{classObj.name}</span>
          {isSelected && <Check className="h-3.5 w-3.5" />}
        </div>
        
        <button 
          className={cn(
            "h-10 w-10 flex items-center justify-center rounded-xl border border-primary/5 hover:bg-primary/10 transition-all",
            isOpen && "bg-primary/10 text-primary border-primary/20"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100" />}
        </button>
      </div>
      
      {isOpen && (
        <div className="pl-4 pr-1 py-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {isLoading ? (
            <div className="py-2 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
            </div>
          ) : students?.length === 0 ? (
            <p className="py-1 text-center text-[9px] italic opacity-40">No students found</p>
          ) : (
            <div className="grid grid-cols-1 gap-0.5">
              {students?.map(s => (
                <div 
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-[11px] border border-transparent",
                    selectedStudentIds.includes(s.id) ? "bg-primary/10 text-primary border-primary/10" : "hover:bg-primary/5"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStudent({ id: s.id, name: s.name });
                  }}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[7px] font-black">{s.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate flex-1 font-bold">{s.name}</span>
                  {selectedStudentIds.includes(s.id) && <Check className="h-3 w-3" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
