import { useTranslation } from "react-i18next";
import { Coffee, ShoppingBag, ArrowRight } from "lucide-react";
import { BentoCard } from "@/components/BentoCard";
import { Link } from "react-router-dom";

export default function MealHub() {
  const { t } = useTranslation();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("sidebar.meals")}</h1>
        <p className="text-muted-foreground">Select an option to view menus or purchase snacks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/app/meals/canteen" className="group">
          <BentoCard className="h-full hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div>
              <div className="h-16 w-16 mb-6 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Coffee className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {t("mealHub.canteenTitle")}
              </h2>
              <p className="text-muted-foreground">{t("mealHub.canteenDesc")}</p>
            </div>
            <div className="mt-8 flex justify-end">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </BentoCard>
        </Link>

        <Link to="/app/meals/buffet" className="group">
          <BentoCard className="h-full hover:border-primary/50 transition-colors flex flex-col justify-between">
            <div>
              <div className="h-16 w-16 mb-6 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {t("mealHub.buffetTitle")}
              </h2>
              <p className="text-muted-foreground">{t("mealHub.buffetDesc")}</p>
            </div>
            <div className="mt-8 flex justify-end">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </BentoCard>
        </Link>
      </div>
    </div>
  );
}
