import { Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseClassRowProps {
  grade: number;
  classes: { id: string; name: string }[];
  selectedClasses: { id: string; name: string }[];
  onToggle: (c: { id: string; name: string }) => void;
}

export function CourseClassRow({ grade, classes, selectedClasses, onToggle }: CourseClassRowProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-[1px] flex-1 bg-border/40 dark:bg-white/10" />
        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-tighter">
          {grade === 0 ? "General" : `Grade ${grade}`}
        </span>
        <div className="h-[1px] flex-1 bg-border/40 dark:bg-white/10" />
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {classes.map(c => {
          const isSelected = !!selectedClasses.find(sc => sc.id === c.id);
          return (
            <div 
              key={c.id}
              onClick={() => onToggle(c)}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all border group",
                isSelected 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "bg-muted/50 dark:bg-white/5 border-border dark:border-white/10 hover:border-primary/40 hover:bg-muted dark:hover:bg-white/10"
              )}
            >
              <Users className={cn("h-3.5 w-3.5", isSelected ? "text-primary-foreground" : "text-primary/60")} />
              <span className={cn(
                "text-[10px] font-bold uppercase truncate",
                isSelected ? "text-primary-foreground" : "text-foreground dark:text-white/80"
              )}>{c.name}</span>
              {isSelected && <Check className="h-3 w-3 ml-auto text-primary-foreground" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
