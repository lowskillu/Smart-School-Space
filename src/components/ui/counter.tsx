import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CounterProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  className?: string
}

export function Counter({ 
  value, 
  onChange, 
  min = 1, 
  max = 999, 
  label,
  className 
}: CounterProps) {
  const [localValue, setLocalValue] = React.useState(value.toString());

  React.useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleBlur = () => {
    let val = parseInt(localValue);
    if (isNaN(val)) val = min;
    if (val < min) val = min;
    if (val > max) val = max;
    setLocalValue(val.toString());
    onChange(val);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  return (
    <div className={cn(
      "flex items-center justify-between bg-muted/20 p-1 rounded-xl border border-border/40 shadow-inner hover:border-primary/30 transition-all focus-within:border-primary/50",
      className
    )}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-full aspect-square rounded-xl hover:bg-primary/10 hover:text-primary active:scale-90 transition-all shrink-0"
        onClick={() => value > min && onChange(value - 1)}
        type="button"
      >
        <Minus className="h-5 w-5" />
      </Button>
      <div className="flex flex-col items-center justify-center flex-1 px-1 min-w-[50px]">
        <input 
          type="text"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full bg-transparent border-none text-center text-xl font-black tracking-tighter text-foreground focus:outline-none focus:ring-0 shadow-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {label && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground -mt-1 select-none">
            {label}
          </span>
        )}
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-full aspect-square rounded-xl hover:bg-primary/10 hover:text-primary active:scale-90 transition-all shrink-0"
        onClick={() => value < max && onChange(value + 1)}
        type="button"
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  )
}
