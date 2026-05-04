import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus } from "lucide-react";

interface DurationInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}

export function DurationInput({ value, onChange, label }: DurationInputProps) {
  const handleMinus = () => {
    const val = parseInt(value) || 0;
    if (val > 5) onChange((val - 5).toString());
  };

  const handlePlus = () => {
    const val = parseInt(value) || 0;
    onChange((val + 5).toString());
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1 bg-background/50 border-2 border-primary/20 rounded-2xl p-1.5 h-14 shadow-inner">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={handleMinus}
          className="h-11 w-11 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all shrink-0 shadow-sm"
        >
          <Minus className="h-6 w-6 stroke-[3]" />
        </Button>
        <Input 
          type="number" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border-none bg-transparent text-center font-black text-lg focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-full"
        />
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={handlePlus}
          className="h-11 w-11 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all shrink-0 shadow-sm"
        >
          <Plus className="h-6 w-6 stroke-[3]" />
        </Button>
      </div>
    </div>
  );
}
