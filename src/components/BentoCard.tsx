import { cn } from "@/lib/utils";

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function BentoCard({ children, className, title, subtitle, icon }: BentoCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border bg-card p-5 animate-fade-in",
      className
    )}>
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-4">
          {icon && <div className="text-primary">{icon}</div>}
          <div>
            {title && <h3 className="font-semibold text-card-foreground">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
