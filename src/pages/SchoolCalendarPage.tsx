import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SchoolCalendar from '@/components/admin/SchoolCalendar';
import { useSchool } from '@/contexts/SchoolContext';

export default function SchoolCalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useSchool();
  const isAdmin = role === 'admin';

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">{t('calendar.pageTitle', 'График работы школы')}</h1>
          <p className="text-sm text-muted-foreground font-medium">{t('calendar.pageDesc', 'Праздники, каникулы и выходные дни')}</p>
        </div>
      </div>

      <SchoolCalendar isAdmin={isAdmin} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="bg-orange-500/5 border border-orange-500/10 p-6 rounded-[2rem] space-y-2">
          <h4 className="font-black uppercase text-xs text-orange-500 tracking-widest">{t('calendar.holidays', 'Государственные праздники')}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">В эти дни школа полностью закрыта, занятия не проводятся.</p>
        </div>
        <div className="bg-green-500/5 border border-green-500/10 p-6 rounded-[2rem] space-y-2">
          <h4 className="font-black uppercase text-xs text-green-500 tracking-widest">{t('calendar.vacations', 'Каникулярный период')}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">Время отдыха для студентов. Администрация школы может работать в дежурном режиме.</p>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-[2rem] space-y-2">
          <h4 className="font-black uppercase text-xs text-blue-500 tracking-widest">{t('calendar.workdays', 'Учебные субботы')}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">Дни, когда проводятся дополнительные занятия или перенесенные уроки.</p>
        </div>
      </div>
    </div>
  );
}
