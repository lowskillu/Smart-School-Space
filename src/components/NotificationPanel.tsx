import { X, BookOpen, MessageSquare, Bell, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

const notifications = [
  { type: "grade", icon: BookOpen, titleKey: "notifications.newGrade", desc: "Math: A- (92%)", time: "2h ago" },
  { type: "message", icon: MessageSquare, titleKey: "notifications.newMessage", desc: "Mr. Thompson sent you a message", time: "3h ago" },
  { type: "alert", icon: AlertTriangle, titleKey: "notifications.deadlineAlert", desc: "Science Fair Project due in 3 days", time: "5h ago" },
  { type: "grade", icon: BookOpen, titleKey: "notifications.newGrade", desc: "English: B+ (87%)", time: "1d ago" },
  { type: "message", icon: MessageSquare, titleKey: "notifications.newMessage", desc: "Class 12-A group: 3 new messages", time: "1d ago" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: Props) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-background/60 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-80 bg-card border-l z-50 flex flex-col animate-in slide-in-from-right-full duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{t("notifications.title")}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {notifications.map((n, i) => {
            const Icon = n.icon;
            return (
              <div key={i} className="flex gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t(n.titleKey)}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
