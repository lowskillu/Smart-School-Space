import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Plus, Trash2, Save, X, Edit2, Loader2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useFoodItems, useCreateFoodItem, useUpdateFoodItem, useDeleteFoodItem } from "@/hooks/useApiData";
import { toast } from "sonner";

export interface BuffetProduct {
  id: string;
  name: string;
  category: string;
  price: string;
  image_url?: string;
  calories: string;
  proteins: string;
  fats: string;
  carbs: string;
}

interface BuffetAdminCardProps {
  className?: string;
}

export const BuffetAdminCard: React.FC<BuffetAdminCardProps> = ({ className }) => {
  const { t } = useTranslation();
  const { 
    data: products = [], 
    isLoading: loadingItems,
    isError,
    error 
  } = useFoodItems("buffet");
  
  const createItem = useCreateFoodItem();
  const updateItem = useUpdateFoodItem();
  const deleteItem = useDeleteFoodItem();

  const [formData, setFormData] = useState<Partial<BuffetProduct>>({
    name: "",
    category: "",
    price: "",
    calories: "",
    proteins: "",
    fats: "",
    carbs: "",
    image_url: "",
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      price: "",
      calories: "",
      proteins: "",
      fats: "",
      carbs: "",
      image_url: "",
    });
    setPreviewImage(null);
    setIsEditMode(false);
    setCurrentProductId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAction = async () => {
    try {
      const payload = {
        ...formData,
        type: "buffet" as const,
        image_url: previewImage || formData.image_url,
        calories: formData.calories ? parseInt(String(formData.calories)) : 0,
        proteins: formData.proteins ? parseFloat(String(formData.proteins)) : 0,
        fats: formData.fats ? parseFloat(String(formData.fats)) : 0,
        carbs: formData.carbs ? parseFloat(String(formData.carbs)) : 0,
      };

      if (isEditMode && currentProductId) {
        await updateItem.mutateAsync({ id: currentProductId, ...payload } as any);
        toast.success(t("buffet.successUpdate", "Product updated"));
      } else {
        await createItem.mutateAsync(payload as any);
        toast.success(t("buffet.successAdd", "Product added"));
      }
      resetForm();
    } catch (error) {
      console.error("Buffet action error:", error);
      toast.error("Operation failed");
    }
  };

  const startEdit = (product: any) => {
    setIsEditMode(true);
    setCurrentProductId(product.id);
    setFormData({
      name: product.name,
      category: product.category || "",
      price: product.price,
      calories: String(product.calories || ""),
      proteins: String(product.proteins || ""),
      fats: String(product.fats || ""),
      carbs: String(product.carbs || ""),
      image_url: product.image_url || "",
    });
    setPreviewImage(product.image_url || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t("common.confirmDelete", "Are you sure?"))) {
      try {
        await deleteItem.mutateAsync(id);
        toast.success(t("buffet.successDelete", "Product deleted"));
      } catch (error) {
        toast.error("Delete failed");
      }
    }
  };

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-6xl mx-auto p-4", className)}>
      {/* Left Column: Inventory List */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between bg-card border border-border p-6 rounded-[24px] shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <Package className="w-6 h-6" />
             </div>
             <div>
                <h3 className="text-foreground font-bold text-lg tracking-tight">{t("buffet.inventory")}</h3>
                <p className="text-xs text-muted-foreground">{t("common.total", "Total")}: {products.length}</p>
             </div>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-black text-[10px] tracking-widest uppercase">
            {products.length} {t("buffet.products", "Products")}
          </Badge>
        </div>

        <div className="bg-card border border-border rounded-[24px] overflow-hidden min-h-[400px] shadow-sm dark:shadow-none">
          {loadingItems ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-30">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm font-medium tracking-widest uppercase text-foreground">Loading Inventory...</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center p-8">
                <X className="w-12 h-12 text-red-500 opacity-50" />
                <p className="text-red-500/80 text-sm font-bold uppercase tracking-widest">
                  {t("common.error")}
                </p>
                <p className="text-gray-500 text-xs mt-2">{(error as any)?.message}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-4 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                  {t("common.retry")}
                </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 opacity-20 text-center p-12 text-gray-900 dark:text-white">
                <Package className="w-16 h-16 mb-4" />
                <p className="max-w-xs text-sm font-medium leading-relaxed">{t("buffet.noProducts")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px bg-border max-h-[700px] overflow-y-auto custom-scrollbar">
              {products.map((product: any) => (
                <div key={product.id} className="group bg-card p-4 flex items-center justify-between hover:bg-muted/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gray-50 dark:bg-[#111111] border border-gray-100 dark:border-[#1A1A1A] overflow-hidden flex-shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary/30">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-foreground font-bold text-sm group-hover:text-primary transition-colors">{product.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase text-primary/60 tracking-wider">{product.category || "General"}</span>
                        <span className="h-1 w-1 rounded-full bg-gray-200 dark:bg-[#1A1A1A]" />
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-500">{product.price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(product)}
                      className="h-9 w-9 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(product.id)}
                      className="h-9 w-9 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Add/Edit Card */}
      <div className="lg:col-span-5 relative">
        <div className={cn(
          "sticky top-8 bg-card border border-border rounded-[24px] p-8 shadow-xl transition-all duration-500",
          isEditMode ? "ring-2 ring-amber-500/20" : "ring-0"
        )}>
          {/* Header Area */}
          <div className="flex flex-col items-center mb-10">
            <h2 className="text-foreground text-xl font-black tracking-[0.3em] uppercase opacity-90 mb-1">
              {isEditMode ? t("buffet.editProduct") : t("buffet.title")}
            </h2>
            <div className={cn("h-1 w-12 rounded-full", isEditMode ? "bg-amber-500" : "bg-primary")} />
          </div>

          <div className="space-y-6">
            {/* Image Upload Area */}
            <div className="relative group">
              <div className="w-full h-44 border-2 border-dashed border-gray-100 dark:border-[#1A1A1A] group-hover:border-[#3B82F6]/30 rounded-[20px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 bg-gray-50 dark:bg-[#050505] overflow-hidden">
                {previewImage ? (
                  <div className="w-full h-full relative">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Plus className="w-8 h-8 text-white scale-110" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 opacity-30 group-hover:opacity-100 transition-all">
                    <div className="p-4 bg-muted rounded-2xl shadow-inner text-foreground">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-foreground text-[10px] font-black uppercase tracking-[0.2em]">{t("buffet.addProduct")}</span>
                  </div>
                )}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setPreviewImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              {previewImage && (
                <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 rounded-full p-2 shadow-2xl transition-all hover:rotate-90 active:scale-90 z-10"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("buffet.productName")}
                className="w-full bg-muted/30 border-none text-foreground h-14 px-6 text-base font-bold focus-visible:ring-2 focus-visible:ring-primary/30 rounded-[16px] placeholder:text-muted-foreground/40 shadow-inner"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder={t("buffet.category")}
                  className="bg-muted/30 border-none text-foreground h-12 px-5 rounded-[14px] focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/30 font-medium"
                />
                <Input
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder={t("buffet.price")}
                  className="bg-muted/30 border-none text-foreground h-12 px-5 rounded-[14px] focus-visible:ring-2 focus-visible:ring-emerald-500/20 placeholder:text-muted-foreground/30 font-mono font-black"
                />
              </div>
            </div>

            {/* Nutrients Grid */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-[#050505] p-4 rounded-[20px] border border-gray-100 dark:border-[#121212]">
              {[
                { label: t("buffet.calories"), key: "calories", color: "text-[#3B82F6]/60" },
                { label: t("buffet.proteins"), key: "proteins", color: "text-emerald-500/60" },
                { label: t("buffet.fats"), key: "fats", color: "text-amber-500/60" },
                { label: t("buffet.carbs"), key: "carbs", color: "text-purple-500/60" },
              ].map((nut) => (
                <div key={nut.key} className="relative group/nut">
                  <span className={cn("absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest pointer-events-none transition-opacity group-focus-within/nut:opacity-30", nut.color)}>
                    {nut.label}
                  </span>
                  <Input
                    name={nut.key}
                    value={(formData as any)[nut.key]}
                    onChange={handleChange}
                    className="bg-card border-none text-foreground h-10 pl-14 text-sm focus-visible:ring-1 focus-visible:ring-primary/20 rounded-[10px] font-black"
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col gap-3">
              <Button
                onClick={handleAction}
                disabled={createItem.isPending || updateItem.isPending}
                className={cn(
                  "w-full h-14 rounded-[16px] font-black text-base uppercase tracking-[0.2em] transition-all duration-300",
                  isEditMode 
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                    : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                )}
              >
                {createItem.isPending || updateItem.isPending ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isEditMode ? (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    {t("buffet.save")}
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    {t("buffet.add")}
                  </>
                )}
              </Button>

              {isEditMode && (
                <Button
                  variant="ghost"
                  onClick={resetForm}
                  className="w-full h-12 text-muted-foreground hover:text-gray-900 dark:hover:text-white rounded-[14px] uppercase text-xs font-black tracking-widest"
                >
                  {t("buffet.cancel")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
