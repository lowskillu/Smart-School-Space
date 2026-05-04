import { BentoCard } from "@/components/BentoCard";
import { Trophy, ExternalLink, Linkedin, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAlumni } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";

export default function Alumni() {
  const { t } = useTranslation();
  const { data: alumni = [], isLoading } = useAlumni();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("alumni.title")}</h1>
        <p className="text-muted-foreground">{t("alumni.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)
        ) : alumni.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground border border-dashed rounded-2xl bg-muted/5">
            <Trophy className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>{t("alumni.no_data", "No alumni records found yet.")}</p>
          </div>
        ) : (
          alumni.map((person) => (
            <BentoCard key={person.id} className="group hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {person.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{person.name}</h3>
                  <p className="text-sm text-muted-foreground">Class of {person.graduation_year}</p>
                </div>
                <Trophy className="h-5 w-5 text-primary shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {person.college_name}
                  </span>
                  <span className="text-muted-foreground">{person.major}</span>
                </div>
                {/* We can use major or achievement if we had it in model */}
                <p className="text-sm text-muted-foreground italic truncate">Success Story & Achievements</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 mb-3">
                <p className="text-xs text-muted-foreground mb-1">{t("alumni.featuredEssay")}</p>
                <p className="text-sm font-medium italic">"{person.essay_title || "Untitled Essay"}"</p>
              </div>

              <div className="flex gap-2">
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  {t("alumni.readEssay")}
                </button>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="h-3 w-3" />
                  {t("alumni.profile")}
                </button>
              </div>
            </BentoCard>
          ))
        )}
      </div>
    </div>
  );
}
