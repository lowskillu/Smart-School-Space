import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";

interface TimePicker24hProps {
  value: string; // "HH:MM"
  onChange: (val: string) => void;
  label?: string;
}

export function TimePicker24h({ value, onChange, label }: TimePicker24hProps) {
  const [hh, setHh] = useState(value ? value.split(':')[0] : "12");
  const [mm, setMm] = useState(value ? value.split(':')[1] : "00");

  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setHh(h);
      setMm(m);
    }
  }, [value]);

  const handleHhChange = (val: string) => {
    let n = parseInt(val);
    if (isNaN(n)) n = 0;
    if (n > 23) n = 23;
    if (n < 0) n = 0;
    const s = n.toString().padStart(2, '0');
    setHh(s);
    onChange(`${s}:${mm}`);
  };

  const handleMmChange = (val: string) => {
    let n = parseInt(val);
    if (isNaN(n)) n = 0;
    if (n > 59) n = 59;
    if (n < 0) n = 0;
    const s = n.toString().padStart(2, '0');
    setMm(s);
    onChange(`${hh}:${s}`);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {label} (24h)
        </label>
      )}
      <div className="flex items-center gap-2 bg-background/50 border border-primary/10 rounded-xl p-1 h-11 w-fit px-3">
        <Input 
          type="number"
          min={0}
          max={23}
          value={hh}
          onChange={(e) => handleHhChange(e.target.value)}
          className="w-12 border-none bg-transparent text-center font-black text-sm focus-visible:ring-0 p-0 h-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="font-black opacity-40">:</span>
        <Input 
          type="number"
          min={0}
          max={59}
          value={mm}
          onChange={(e) => handleMmChange(e.target.value)}
          className="w-12 border-none bg-transparent text-center font-black text-sm focus-visible:ring-0 p-0 h-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}
