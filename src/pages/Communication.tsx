import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { MessageSquare, Users, Video, Plus, Loader2, ArrowRight, User, Calendar } from "lucide-react";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useChats, useCreateChat, useMeetings, useCreateMeeting, useUpdateMeeting, useCloseMeeting } from "@/hooks/useApiData";
import { CreateChatModal } from "@/components/communication/CreateChatModal";
import { CreateGroupChatModal } from "@/components/communication/CreateGroupChatModal";
import { CreateMeetingModal } from "@/components/communication/CreateMeetingModal";
import { EditMeetingModal } from "@/components/communication/EditMeetingModal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Settings2, Trash2 } from "lucide-react";

export default function Communication() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editMeetingModalOpen, setEditMeetingModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const { data: chats, isLoading: chatsLoading } = useChats();
  const { data: meetings, isLoading: meetingsLoading } = useMeetings();
  const createChatMutation = useCreateChat();
  const createMeetingMutation = useCreateMeeting();
  const updateMeetingMutation = useUpdateMeeting();
  const closeMeetingMutation = useCloseMeeting();

  const handleCreateChat = async (userId: string) => {
    try {
      const res = await createChatMutation.mutateAsync({
        is_group: false,
        participant_ids: [userId]
      });
      setChatModalOpen(false);
      navigate(`/app/communication/chat/${res.id}`);
    } catch (err) {
      toast.error("Failed to create chat");
    }
  };

  const handleCreateGroup = async (name: string, userIds: string[]) => {
    try {
      const res = await createChatMutation.mutateAsync({
        is_group: true,
        name,
        participant_ids: userIds
      });
      setGroupModalOpen(false);
      navigate(`/app/communication/chat/${res.id}`);
    } catch (err) {
      toast.error("Failed to create group");
    }
  };

  const handleCreateMeeting = async (data: { title: string; scheduled_time?: string; participant_ids: string[]; class_ids: string[] }) => {
    try {
      await createMeetingMutation.mutateAsync(data);
      setMeetingModalOpen(false);
      toast.success(t("common.success"));
      // We don't navigate anymore, just show it in the list
    } catch (err) {
      toast.error(t("common.error"));
    }
  };

  const handleUpdateMeeting = async (data: any) => {
    try {
      await updateMeetingMutation.mutateAsync(data);
      toast.success(t("common.success"));
    } catch (err) {
      toast.error(t("common.error"));
    }
  };

  const handleCloseMeeting = async (id: string) => {
    if (confirm("Are you sure you want to close this meeting?")) {
      try {
        await closeMeetingMutation.mutateAsync(id);
        toast.success(t("common.success"));
      } catch (err) {
        toast.error(t("common.error"));
      }
    }
  };

  const privateChats = chats?.filter(c => !c.is_group) || [];
  const groupChats = chats?.filter(c => c.is_group) || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent italic uppercase">
            {t("sidebar.communication")}
          </h1>
          <p className="text-muted-foreground font-medium">{t("communication.subtitle")}</p>
        </div>
        <Button size="lg" onClick={() => navigate("/app/communication/chat")} className="rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-all">
          <MessageSquare className="mr-2 h-5 w-5" />
          Open Chat Center
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Private Chats */}
        <BentoCard 
          className="flex flex-col h-[450px] shadow-2xl border-primary/5 hover:border-primary/20 transition-all group"
          title={t("communicationHub.tabs.privateChats")} 
          icon={<MessageSquare className="h-5 w-5 text-primary" />}
        >
          <div className="flex-1 overflow-auto p-2">
            {chatsLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              </div>
            ) : privateChats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <div className="h-20 w-20 mb-4 rounded-3xl bg-primary/10 flex items-center justify-center text-primary rotate-3">
                  <MessageSquare className="h-10 w-10" />
                </div>
                <p className="font-bold text-lg">{t("communicationHub.emptyStates.chatsTitle")}</p>
                <p className="text-sm mt-1 max-w-[200px]">
                  {t("communicationHub.emptyStates.chatsDesc")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {privateChats.slice(0, 5).map(chat => (
                  <div 
                    key={chat.id}
                    onClick={() => navigate(`/app/communication/chat/${chat.id}`)}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-primary/5 cursor-pointer border border-transparent hover:border-primary/10 transition-all"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-background">
                      <AvatarFallback className="bg-primary/5 text-primary text-xs">
                        {chat.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{chat.name}</p>
                      <p className="text-xs text-muted-foreground truncate opacity-70">
                        {chat.last_message?.content || "Tap to chat"}
                      </p>
                    </div>
                    {chat.unread_count && (
                      <Badge className="bg-primary text-[10px] h-4 min-w-[1rem] px-1">{chat.unread_count}</Badge>
                    )}
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-30 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 mt-auto">
            <Button onClick={() => setChatModalOpen(true)} className="w-full rounded-xl bg-primary/5 text-primary hover:bg-primary/10 border-none" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              {t("communicationHub.emptyStates.startChat")}
            </Button>
          </div>
        </BentoCard>

        {/* Group Chats */}
        <BentoCard 
          className="flex flex-col h-[450px] shadow-2xl border-primary/5 hover:border-primary/20 transition-all group"
          title={t("communicationHub.tabs.groupChats")} 
          icon={<Users className="h-5 w-5 text-primary" />}
        >
          <div className="flex-1 overflow-auto p-2">
             {chatsLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              </div>
            ) : groupChats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <div className="h-20 w-20 mb-4 rounded-3xl bg-primary/10 flex items-center justify-center text-primary -rotate-3">
                  <Users className="h-10 w-10" />
                </div>
                <p className="font-bold text-lg">{t("communicationHub.emptyStates.chatsTitle")}</p>
                <p className="text-sm mt-1 max-w-[200px]">
                  {t("communicationHub.emptyStates.chatsDesc")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {groupChats.slice(0, 5).map(chat => (
                  <div 
                    key={chat.id}
                    onClick={() => navigate(`/app/communication/chat/${chat.id}`)}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-primary/5 cursor-pointer border border-transparent hover:border-primary/10 transition-all"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold ring-2 ring-background">
                      {chat.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{chat.name}</p>
                      <p className="text-xs text-muted-foreground truncate opacity-70">
                         {chat.last_message?.content || "Shared group chat"}
                      </p>
                    </div>
                    {chat.unread_count && (
                      <Badge className="bg-primary text-[10px] h-4 min-w-[1rem] px-1">{chat.unread_count}</Badge>
                    )}
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-30 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 mt-auto">
            <Button onClick={() => setGroupModalOpen(true)} className="w-full rounded-xl bg-primary/5 text-primary hover:bg-primary/10 border-none" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              {t("communicationHub.modals.createGroupChat")}
            </Button>
          </div>
        </BentoCard>

        {/* Meetings (Wide Card) */}
        <BentoCard 
          className="md:col-span-2 flex flex-col min-h-[400px] shadow-2xl border-primary/5 hover:border-primary/20"
          title={t("communicationHub.tabs.meetings")} 
          icon={<Video className="h-5 w-5 text-primary" />}
        >
          <div className="flex-1 overflow-auto p-4">
            {meetingsLoading ? (
              <div className="h-full flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              </div>
            ) : !meetings || meetings.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 italic py-12">
                 <div className="h-20 w-20 mb-4 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                   <Video className="h-10 w-10" />
                 </div>
                 <p className="font-bold text-xl">{t("communicationHub.emptyStates.meetingsTitle")}</p>
                 <p className="text-sm mt-2 max-w-[300px]">
                   {t("communicationHub.emptyStates.meetingsDesc")}
                 </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {meetings.map(m => (
                  <div 
                    key={m.id}
                    className="bg-card/30 backdrop-blur-xl border border-primary/10 rounded-[32px] p-6 hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col gap-6 shadow-xl shadow-black/5 dark:shadow-none"
                  >
                    {/* Background Accent */}
                    <div className="absolute -top-12 -right-12 h-32 w-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

                    <div className="relative flex items-start justify-between">
                      <div className="space-y-1.5 flex-1 pr-12">
                        <h3 className="font-black uppercase tracking-tighter text-xl leading-none truncate drop-shadow-sm">{m.title}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 italic flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {m.host_name}
                          </p>
                          {m.scheduled_time && (
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(m.scheduled_time).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                         {m.host_id === user?.id && (
                           <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedMeeting(m);
                                 setEditMeetingModalOpen(true);
                               }}
                             >
                               <Settings2 className="h-4 w-4" />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleCloseMeeting(m.id);
                               }}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </div>
                         )}
                         <div className={cn(
                           "h-3 w-3 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]",
                           (() => {
                             const now = new Date();
                             const start = m.scheduled_time ? new Date(m.scheduled_time) : new Date(m.created_at);
                             const end = new Date(start.getTime() + (m.duration || 60) * 60 * 1000);
                             return now >= start && now <= end ? "bg-emerald-500 animate-pulse" : "bg-muted opacity-40";
                           })()
                         )} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/5">
                      <div className="flex flex-col">
                         <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">{t("common.status")}</span>
                         {(() => {
                           const now = new Date();
                           const start = m.scheduled_time ? new Date(m.scheduled_time) : new Date(m.created_at);
                           const end = new Date(start.getTime() + (m.duration || 60) * 60 * 1000);
                           const diffMs = start.getTime() - now.getTime();
                           const isSoon = diffMs > 0 && diffMs <= 15 * 60 * 1000;
                           
                           if (now >= start && now <= end) {
                             return <span className="text-xs font-bold text-emerald-500 uppercase tracking-tighter animate-pulse">{t("communicationHub.modals.meetingForm.status.live")}</span>;
                           } else if (isSoon) {
                             return <span className="text-xs font-bold text-amber-500 uppercase tracking-tighter">{t("communicationHub.modals.meetingForm.status.startsSoon")}</span>;
                           } else if (now < start) {
                             return <span className="text-xs font-bold text-blue-500 uppercase tracking-tighter">{t("communicationHub.modals.meetingForm.status.scheduled")}</span>;
                           } else {
                             return <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">{t("communicationHub.modals.meetingForm.status.ended")}</span>;
                           }
                         })()}
                      </div>
                      
                      <div className="flex flex-col items-end">
                         <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">{t("communicationHub.modals.meetingForm.durationLabel")}</span>
                         <span className="text-xs font-bold uppercase tracking-tighter">{m.duration} {t("common.min")}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => navigate(`/app/meetings/${m.room_key}`)}
                      className="w-full rounded-2xl font-black uppercase tracking-widest text-xs h-12 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all gap-2"
                    >
                      <Video className="h-4 w-4" />
                      {t("communicationHub.modals.meetingForm.actionJoin")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 mt-auto">
            <Button onClick={() => setMeetingModalOpen(true)} className="w-full rounded-xl bg-primary/5 text-primary hover:bg-primary/10 border-none" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              {t("communicationHub.emptyStates.scheduleMeeting")}
            </Button>
          </div>
        </BentoCard>
      </div>

      <CreateChatModal 
        open={chatModalOpen} 
        onOpenChange={setChatModalOpen} 
        onCreate={handleCreateChat} 
      />
      
      <CreateGroupChatModal 
        open={groupModalOpen} 
        onOpenChange={setGroupModalOpen} 
        onCreate={handleCreateGroup} 
      />

      <CreateMeetingModal 
        open={meetingModalOpen} 
        onOpenChange={setMeetingModalOpen} 
        onCreate={handleCreateMeeting} 
      />

      <EditMeetingModal
        open={editMeetingModalOpen}
        onOpenChange={setEditMeetingModalOpen}
        meeting={selectedMeeting}
        onUpdate={handleUpdateMeeting}
      />
    </div>
  );
}
