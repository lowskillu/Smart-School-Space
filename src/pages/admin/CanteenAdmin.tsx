import React from 'react';
import CanteenManager from '@/components/admin/CanteenManager';
import { Apple } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CanteenAdmin() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
          <Apple className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{t('sidebar.canteenAdmin', 'Canteen Management')}</h1>
          <p className="text-muted-foreground text-sm font-medium">Control the school menu, nutrition data, and meal scheduling.</p>
        </div>
      </div>
      
      <CanteenManager />
    </div>
  );
}
