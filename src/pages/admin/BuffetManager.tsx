import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { BuffetAdminCard } from "@/components/buffet/BuffetAdminCard";
import { Button } from "@/components/ui/button";

export default function BuffetManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 space-y-8 animate-in fade-in duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-foreground hover:bg-muted h-12 w-12"
            onClick={() => navigate("/app/admin")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <UtensilsCrossed className="w-8 h-8 text-primary" />
              {t("sidebar.buffetAdmin")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("buffet.managerDesc", "Configure products, prices and nutritional values for the Smart Buffet")}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        <BuffetAdminCard />
      </div>

      <p className="mt-12 text-center text-[10px] text-gray-400 dark:text-gray-800 uppercase tracking-[0.4em] font-black opacity-30">
        Smart School Space • Buffet Admin v3.0
      </p>
    </div>
  );
}
