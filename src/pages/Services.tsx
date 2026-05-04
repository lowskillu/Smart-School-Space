import { BentoCard } from "@/components/BentoCard";
import { UtensilsCrossed, Clock, ShoppingCart, Leaf, Flame } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const menuItems = [
  { name: "Grilled Chicken Bowl", price: "$8.50", cal: 520, tags: ["protein"], prep: "10 min", desc: "Marinated chicken with brown rice and veggies" },
  { name: "Veggie Wrap", price: "$6.00", cal: 380, tags: ["vegetarian"], prep: "5 min", desc: "Fresh vegetables with hummus in a whole wheat wrap" },
  { name: "Pasta Primavera", price: "$7.50", cal: 450, tags: ["vegetarian"], prep: "12 min", desc: "Penne with seasonal vegetables in garlic sauce" },
  { name: "Salmon Teriyaki", price: "$10.00", cal: 580, tags: ["protein", "omega-3"], prep: "15 min", desc: "Glazed salmon fillet with steamed jasmine rice" },
  { name: "Caesar Salad", price: "$5.50", cal: 290, tags: ["light"], prep: "5 min", desc: "Romaine lettuce with parmesan and croutons" },
  { name: "BBQ Burger", price: "$9.00", cal: 680, tags: ["protein"], prep: "12 min", desc: "Angus beef patty with BBQ sauce and coleslaw" },
  { name: "Fruit Smoothie Bowl", price: "$6.50", cal: 320, tags: ["vegetarian", "light"], prep: "5 min", desc: "Açaí blend with granola and fresh berries" },
  { name: "Chicken Quesadilla", price: "$7.00", cal: 490, tags: ["protein"], prep: "8 min", desc: "Crispy tortilla with chicken and melted cheese" },
];

export default function Services() {
  const [cart, setCart] = useState<string[]>([]);
  const { t } = useTranslation();

  const addToCart = (name: string) => {
    setCart([...cart, name]);
    toast.success(`${name} ${t("services.addedToOrder")}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("services.title")}</h1>
          <p className="text-muted-foreground">{t("services.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <ShoppingCart className="h-4 w-4" />
          {cart.length} {t("services.items")}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {menuItems.map((item) => (
          <BentoCard key={item.name} className="flex flex-col hover:border-primary/30 transition-colors">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{item.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{item.desc}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs capitalize">
                    {tag === "vegetarian" && <Leaf className="h-3 w-3 mr-1" />}
                    {tag === "protein" && <Flame className="h-3 w-3 mr-1" />}
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                <span>{item.cal} cal</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{item.prep}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{item.price}</span>
              <Button size="sm" onClick={() => addToCart(item.name)} className="rounded-full">{t("services.preOrder")}</Button>
            </div>
          </BentoCard>
        ))}
      </div>
    </div>
  );
}
