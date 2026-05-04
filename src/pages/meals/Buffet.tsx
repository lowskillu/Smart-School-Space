import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Minus, ShoppingCart, CreditCard, ReceiptText, Trash2, Loader2, ShoppingBag, ArrowLeft, Package, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useFoodItems, useCreateOrder, type FoodItemRow } from "@/hooks/useApiData";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function Buffet() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { 
    data: foodItems = [], 
    isLoading, 
    isError, 
    error 
  } = useFoodItems("buffet");
  
  const createOrder = useCreateOrder();
  const [cart, setCart] = useState<{ item: FoodItemRow; qty: number }[]>([]);

  const parsePrice = (price: string | number): number => {
    if (typeof price === "number") return price;
    const numericPart = price.replace(/[^\d.]/g, "");
    return parseFloat(numericPart) || 0;
  };

  const addToCart = (item: FoodItemRow) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) => (i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.item.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === id);
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        return prev.filter((i) => i.item.id !== id);
      }
      return prev.map((i) => (i.item.id === id ? { ...i, qty: newQty } : i));
    });
  };

  const getItemQty = (id: string) => {
    return cart.find((i) => i.item.id === id)?.qty || 0;
  };

  const totalNumeric = cart.reduce((acc, curr) => acc + parsePrice(curr.item.price) * curr.qty, 0);

  const handleCheckout = (status: "paid" | "pending_parental_approval") => {
    if (!user) { toast.error(t("auth.loginRequired", "Please log in")); return; }
    if (cart.length === 0) { toast.error(t("mealHub.cartEmpty", "Cart is empty")); return; }

    createOrder.mutate(
      {
        items: cart.map((c) => ({ food_item_id: c.item.id, quantity: c.qty })),
        status,
      },
      {
        onSuccess: () => {
          toast.success(status === "paid" ? t("mealHub.orderSuccess", "Order placed!") : t("mealHub.orderPending", "Sent for approval!"));
          setCart([]);
        },
        onError: () => toast.error(t("common.error", "Operation failed")),
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        
        {/* Products Grid */}
        <div className="space-y-8">
          <div className="flex items-center gap-5">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-900 dark:text-white" 
              onClick={() => navigate("/app/meals")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">
                {t("mealHub.buffetTitle")}
              </h1>
              <p className="text-muted-foreground text-sm font-medium">{t("mealHub.buffetDesc")}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 bg-gray-100 dark:bg-white/5 rounded-3xl animate-pulse border border-gray-200 dark:border-white/5" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 bg-red-500/5 border border-red-500/10 rounded-3xl text-center px-10">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-50" />
              <h3 className="text-red-500 font-bold uppercase tracking-widest">{t("common.error")}</h3>
              <p className="text-gray-500 text-sm mt-2">{(error as any)?.message || "Failed to load buffet inventory"}</p>
              <Button variant="outline" className="mt-6 border-red-500/20 hover:bg-red-500/10" onClick={() => window.location.reload()}>
                {t("common.retry")}
              </Button>
            </div>
          ) : foodItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center text-gray-900 dark:text-white">
              <Package className="w-20 h-20 mb-6" />
              <p className="max-w-xs text-lg font-bold uppercase tracking-tighter">{t("buffet.noProducts")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {foodItems.map((item) => (
                <div 
                  key={item.id} 
                  className="group bg-white dark:bg-[#0A0A0A] border border-gray-100 dark:border-[#1A1A1A] rounded-[28px] overflow-hidden flex flex-col hover:border-[#3B82F6]/30 transition-all duration-500 shadow-xl dark:shadow-2xl dark:hover:shadow-[#3B82F6]/5"
                >
                  <div className="h-44 w-full overflow-hidden relative">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-[#050505] text-muted-foreground">
                        <ShoppingBag className="h-12 w-12 opacity-10" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                       <Badge className="bg-black/60 dark:bg-black/60 backdrop-blur-md border-white/10 text-[10px] font-black tracking-widest px-3 py-1 text-white">
                          {item.category || "General"}
                       </Badge>
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-4">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight group-hover:text-[#3B82F6] transition-colors">{item.name}</h3>
                      {item.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{item.description}</p>}
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500 mt-3 font-mono">{item.price}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {item.calories && (
                        <span className="bg-[#3B82F6]/10 text-[#3B82F6] text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          {item.calories} {t("buffet.calories")}
                        </span>
                      )}
                      {item.proteins && (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          {item.proteins}g {t("buffet.proteins")}
                        </span>
                      )}
                    </div>

                    {getItemQty(item.id) > 0 ? (
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 rounded-2xl p-1.5 border border-gray-100 dark:border-white/5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white"
                          onClick={() => updateQty(item.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-black text-gray-900 dark:text-white text-lg w-12 text-center">{getItemQty(item.id)}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-xl hover:bg-[#3B82F6] hover:text-white text-[#3B82F6]"
                          onClick={() => updateQty(item.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => addToCart(item)} 
                        className="w-full h-12 gap-2 bg-gray-50 dark:bg-white/5 hover:bg-[#3B82F6] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:border-transparent rounded-2xl font-bold uppercase text-xs tracking-widest transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        {t("mealHub.addToCart")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className="relative">
          <div className="sticky top-8 bg-white dark:bg-black border border-gray-100 dark:border-[#1A1A1A] rounded-[32px] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.5)] flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-gray-900 dark:text-white text-xl font-black uppercase tracking-widest flex items-center gap-3">
                <ShoppingCart className="h-6 w-6 text-[#3B82F6]" />
                {t("mealHub.cartTitle")}
              </h2>
              {cart.length > 0 && (
                <Badge className="bg-[#3B82F6] text-white font-black rounded-full px-2">
                  {cart.length}
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-auto space-y-4 pr-2 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-20 text-gray-900 dark:text-white">
                  <ShoppingBag className="h-16 w-16 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Cart is empty</p>
                </div>
              ) : (
                cart.map((cartItem) => (
                  <div key={cartItem.item.id} className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-[#3B82F6]/20 transition-all">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{cartItem.item.name}</span>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mt-1">
                        {cartItem.item.price} × {cartItem.qty}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-500">
                        {parsePrice(cartItem.item.price) * cartItem.qty}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg" 
                        onClick={() => removeFromCart(cartItem.item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">{t("common.total")}:</span>
                <span className="text-3xl font-black text-gray-900 dark:text-white font-mono">{totalNumeric}</span>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => handleCheckout("paid")}
                  disabled={cart.length === 0 || createOrder.isPending}
                  className="w-full h-14 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-[#3B82F6]/20 transition-all"
                >
                  {createOrder.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5 mr-3" />}
                  {t("mealHub.payNow")}
                </Button>
                
                <Button
                  onClick={() => handleCheckout("pending_parental_approval")}
                  disabled={cart.length === 0 || createOrder.isPending}
                  variant="outline"
                  className="w-full h-14 border-gray-200 dark:border-white/10 bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all"
                >
                  <ReceiptText className="h-4 w-4 mr-2 opacity-50" />
                  {t("mealHub.parentsCheck")}
                </Button>
              </div>
            </div>
            
            {/* Aesthetic Glow */}
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#3B82F6]/5 rounded-full blur-[100px] -z-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
