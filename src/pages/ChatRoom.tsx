import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  Send, Paperclip, Image as ImageIcon, Search, 
  MoreVertical, Phone, Video, ChevronLeft, 
  Download, FileText, X, Loader2, Check, CheckCheck,
  Plus, MessageSquare, User, Users as UsersIcon, Settings,
  Pin, PinOff, Pencil, Trash2, Copy
} from "lucide-react";
import { useChats, useChatMessages, useSendMessage, useUploadChatFile, useCreateChat, useUpdateMessage, useDeleteMessage, MessageRow } from "@/hooks/useApiData";
import { useSchool } from "@/contexts/SchoolContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { CreateChatModal } from "@/components/communication/CreateChatModal";
import { CreateGroupChatModal } from "@/components/communication/CreateGroupChatModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; type: string; name: string }[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const { data: chats, isLoading: chatsLoading } = useChats();
  const { data: messages, isLoading: messagesLoading } = useChatMessages(chatId);
  const sendMessageMutation = useSendMessage();
  const updateMessageMutation = useUpdateMessage();
  const deleteMessageMutation = useDeleteMessage();
  const createChatMutation = useCreateChat();
  const uploadMutation = useUploadChatFile();

  const activeChat = chats?.find(c => c.id === chatId);
  const pinnedMessage = messages?.find(m => m.is_pinned);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatId || (!message.trim() && attachments.length === 0)) return;

    const content = message.trim();
    const currentAttachments = [...attachments];
    
    if (editingMessageId) {
      try {
        await updateMessageMutation.mutateAsync({
          chatId,
          messageId: editingMessageId,
          content
        });
        setEditingMessageId(null);
        setMessage("");
        toast.success("Message updated");
      } catch (err) {
        toast.error("Failed to update message");
      }
      return;
    }

    setMessage("");
    setAttachments([]);

    try {
      if (currentAttachments.length > 0) {
        await sendMessageMutation.mutateAsync({
          chatId,
          content: content || undefined,
          file_url: currentAttachments[0].url,
          file_type: currentAttachments[0].type
        });
        
        for (let i = 1; i < currentAttachments.length; i++) {
          await sendMessageMutation.mutateAsync({
            chatId,
            file_url: currentAttachments[i].url,
            file_type: currentAttachments[i].type
          });
        }
      } else if (content) {
        await sendMessageMutation.mutateAsync({
          chatId,
          content
        });
      }
    } catch (err) {
      toast.error("Failed to transmit");
    }
  };

  const startEditing = (msg: MessageRow) => {
    setEditingMessageId(msg.id);
    setMessage(msg.content || "");
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setMessage("");
  };

  const handlePin = async (msg: MessageRow) => {
    try {
      await updateMessageMutation.mutateAsync({
        chatId,
        messageId: msg.id,
        is_pinned: !msg.is_pinned
      });
      toast.success(msg.is_pinned ? "Unpinned" : "Pinned");
    } catch (err) {
      toast.error("Failed to pin message");
    }
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(t("communication.copied"));
  };

  const handleDelete = async (messageId: string, deleteType: "me" | "everyone" = "me") => {
    const confirmMsg = deleteType === "everyone" 
      ? t("common.confirmDelete") + " (" + t("communication.deleteForEveryone") + ")?" 
      : t("common.confirmDelete") + " (" + t("communication.deleteForMe") + ")?";

    if (!confirm(confirmMsg)) return;
    try {
      await deleteMessageMutation.mutateAsync({ chatId: chatId!, messageId, deleteType });
      toast.success(deleteType === "everyone" ? t("communication.deleteForEveryone") : t("communication.deleteForMe"));
    } catch (err) {
      toast.error(t("common.error"));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;

    try {
      const res = await uploadMutation.mutateAsync(file);
      setAttachments(prev => [...prev, {
        url: res.file_url,
        type: file.type.startsWith("image/") ? "image" : "file",
        name: file.name
      }]);
      toast.success("File attached");
      e.target.value = ""; 
    } catch (err) {
      toast.error("Failed to upload file");
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (chatsLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center bg-background/50 backdrop-blur-xl">
        <div className="relative h-24 w-24">
           <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
           <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-primary animate-bounce" />
           </div>
        </div>
        <p className="mt-6 text-muted-foreground font-medium animate-pulse">Initializing Secure Channel...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden bg-background/30 border rounded-3xl shadow-2xl backdrop-blur-sm relative">
      {/* Sidebar - Chat List */}
      <div className={cn(
        "flex flex-col w-full md:w-[350px] border-r bg-card/50 backdrop-blur-md transition-all duration-300",
        chatId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-primary/10 transition-colors -ml-2" onClick={() => navigate("/app/communication")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-2xl font-black tracking-tighter text-primary italic uppercase">
                {t("sidebar.communication")}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl h-10 border-primary/10 bg-primary/5 text-primary font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10" 
                onClick={() => setChatModalOpen(true)}
               >
                 <Plus className="h-3 w-3 mr-1.5" />
                 New Chat
               </Button>
               <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl h-10 border-primary/10 bg-primary/5 text-primary font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10" 
                onClick={() => setGroupModalOpen(true)}
               >
                 <UsersIcon className="h-3 w-3 mr-1.5" />
                 New Group
               </Button>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
               placeholder="Search conversations..." 
               className="pl-10 bg-muted/30 border-none h-11 rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/20 transition-all" 
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-2 pb-6">
            {chats?.map(chat => (
              <div 
                key={chat.id}
                onClick={() => navigate(`/app/communication/chat/${chat.id}`)}
                className={cn(
                  "group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 border border-transparent",
                  chat.id === chatId 
                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 translate-x-1" 
                    : "hover:bg-muted/50 hover:translate-x-1"
                )}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-background/20 group-hover:scale-110 transition-transform">
                    <AvatarFallback className={cn(
                      "text-sm font-bold",
                      chat.id === chatId ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                    )}>
                      {(chat.name || "UN").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-green-500" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-sm truncate tracking-tight">{chat.name}</span>
                    {chat.last_message && (
                      <span className={cn("text-[10px] font-medium opacity-60")}>
                        {format(new Date(chat.last_message.created_at), "HH:mm")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-xs truncate opacity-70 leading-relaxed")}>
                      {chat.last_message?.content || (chat.last_message?.file_url ? "📎 File attachment" : "Start a conversation...")}
                    </p>
                    {chat.unread_count && chat.unread_count > 0 && chat.id !== chatId && (
                      <Badge className="bg-primary-foreground text-primary h-5 min-w-[1.25rem] flex items-center justify-center p-0 text-[10px] font-black rounded-full animate-bounce">
                        {chat.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Window — Lighter Dark Theme Background */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden relative bg-card/40 transition-colors duration-500",
        !chatId && "hidden md:flex items-center justify-center bg-muted/10"
      )}>
        {!chatId ? (
          <div className="text-center p-12 space-y-6 max-w-sm">
            <div className="relative h-24 w-24 mx-auto">
               <div className="absolute inset-0 bg-primary/20 rounded-[2rem] rotate-6 animate-pulse" />
               <div className="absolute inset-0 bg-primary/10 rounded-[2rem] -rotate-6" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <MessageSquare className="h-12 w-12 text-primary" />
               </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase">{t("chat.space_comms", "Space Comms")}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Choose a transmission from the sidebar to engage. Secure end-to-end encrypted protocol active.
              </p>
            </div>
            <Button onClick={() => setChatModalOpen(true)} className="rounded-full px-8 shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
               Start Transmission
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between bg-card/60 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-primary/20 ring-4 ring-primary/5">
                    <AvatarFallback className="bg-primary/10 text-primary font-black">
                      {(activeChat?.name || "UN").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-green-500 shadow-sm" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight uppercase italic">{activeChat?.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("chat.protocol_active", "Protocol Active")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary transition-colors">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Pinned Message Bar */}
            {pinnedMessage && (
              <div className="bg-primary/10 backdrop-blur-md border-b px-6 py-2 flex items-center justify-between group/pinned animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-8 w-1 bg-primary rounded-full" />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                       <Pin className="h-3 w-3 text-primary fill-primary" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-primary">{t("chat.pinned_message", "Pinned Message")}</span>
                    </div>
                    <p className="text-xs font-medium truncate opacity-60">
                      {pinnedMessage.content || (pinnedMessage.file_url ? "Attached File" : "No content")}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full opacity-0 group-hover/pinned:opacity-100 transition-opacity"
                  onClick={() => handlePin(pinnedMessage)}
                >
                   <PinOff className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6 max-w-4xl mx-auto pb-4">
                {messagesLoading ? (
                   <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-tighter">Syncing Datastreams...</span>
                   </div>
                ) : messages?.map((msg, i) => {
                  const isMe = msg.sender_id === user?.id;
                  const prevMsg = i > 0 ? messages[i-1] : null;
                  const showAvatar = !isMe && prevMsg?.sender_id !== msg.sender_id;

                  return (
                    <div key={msg.id} className={cn(
                      "flex gap-4 group transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
                      isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}>
                      {!isMe && (
                        <div className="w-10 flex-shrink-0 pt-1">
                          {showAvatar ? (
                             <Avatar className="h-10 w-10 shadow-md ring-2 ring-primary/5 hover:scale-110 transition-transform">
                               <AvatarFallback className="text-[11px] font-black bg-primary/5 text-primary">
                                  {msg.sender_name.slice(0, 2).toUpperCase()}
                               </AvatarFallback>
                             </Avatar>
                          ) : <div className="w-10" />}
                        </div>
                      )}
                      <div className={cn("flex flex-col space-y-1 relative", isMe ? "items-end" : "items-start")}>
                         {showAvatar && <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1 mb-1">{msg.sender_name}</p>}
                         <div 
                           className={cn(
                             "rounded-2xl relative shadow-sm border transition-all duration-200 hover:shadow-md overflow-hidden cursor-default",
                             isMe 
                              ? "bg-primary text-primary-foreground rounded-tr-none border-primary/20" 
                              : "bg-card/95 backdrop-blur-sm border-primary/5 rounded-tl-none",
                             msg.file_type === "image" ? "p-0" : "px-4 py-3"
                           )}
                         >
                            {/* Improved More Menu Trigger with DropdownMenu — Fixed Reliability */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className={cn(
                                    "absolute top-1 z-30 h-7 w-7 rounded-full bg-background/90 backdrop-blur-md shadow-lg border border-primary/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-primary-foreground",
                                    isMe ? "left-1" : "right-1"
                                  )}
                                >
                                   <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isMe ? "start" : "end"} className="w-40 rounded-xl bg-card/95 backdrop-blur-xl border-primary/10">
                                <DropdownMenuItem 
                                  className="text-[10px] font-black uppercase tracking-widest gap-2 cursor-pointer"
                                  onClick={() => handlePin(msg)}
                                >
                                  <Pin className="h-3.5 w-3.5" />
                                  {msg.is_pinned ? t("communication.unpin") : t("communication.pin")}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-[10px] font-black uppercase tracking-widest gap-2 cursor-pointer"
                                  onClick={() => handleCopy(msg.content || "")}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  {t("communication.copy")}
                                </DropdownMenuItem>
                                {isMe && (
                                  <DropdownMenuItem 
                                    className="text-[10px] font-black uppercase tracking-widest gap-2 cursor-pointer"
                                    onClick={() => startEditing(msg)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {t("common.edit")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-[10px] font-black uppercase tracking-widest gap-2 cursor-pointer"
                                  onClick={() => handleDelete(msg.id, "me")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t("communication.deleteForMe")}
                                </DropdownMenuItem>
                                {isMe && (
                                  <DropdownMenuItem 
                                    className="text-[10px] font-black uppercase tracking-widest gap-2 text-destructive cursor-pointer"
                                    onClick={() => handleDelete(msg.id, "everyone")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {t("communication.deleteForEveryone")}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>

                           {msg.file_url ? (
                              msg.file_type === "image" ? (
                                 <div className="flex flex-col">
                                    <div className="group/img relative">
                                       <img 
                                         src={msg.file_url} 
                                         alt="Transmission attachment" 
                                         className="max-h-[500px] w-full object-cover cursor-pointer transition-all duration-500 hover:brightness-90" 
                                         onClick={() => setPreviewImage(msg.file_url || null)}
                                       />
                                       <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                          <Button variant="secondary" size="icon" className="rounded-full pointer-events-auto h-12 w-12 bg-background/20 backdrop-blur-md border-white/20 hover:bg-background/40" onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(msg.file_url!, '_blank');
                                          }}>
                                             <Download className="h-5 w-5" />
                                          </Button>
                                       </div>
                                    </div>
                                    {msg.content && (
                                      <div className="px-4 py-2.5">
                                        <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                                      </div>
                                    )}
                                 </div>
                              ) : (
                                 <div className={cn(
                                   "flex items-center gap-4 p-1 rounded-xl transition-colors",
                                   isMe ? "hover:bg-white/5" : "hover:bg-muted/50"
                                 )}>
                                    <div className="h-12 w-12 bg-background/20 rounded-xl flex items-center justify-center shadow-inner">
                                       <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-4">
                                       <p className="text-xs font-bold truncate tracking-tight">ENCRYPTED_FILE</p>
                                       <a href={msg.file_url} download className="text-[10px] font-black uppercase tracking-tighter underline opacity-70 hover:opacity-100">{t("chat.download", "Download")}</a>
                                    </div>
                                 </div>
                              )
                           ) : (
                             <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
                           )}
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 mt-2 px-4 pb-2",
                          isMe ? "justify-end" : "justify-start"
                        )}>
                           <span className={cn("text-[9px] font-black opacity-40 uppercase tracking-tighter")}>
                             {format(new Date(msg.created_at), "HH:mm")}
                           </span>
                           {msg.is_edited && <span className="text-[9px] font-black opacity-20 uppercase tracking-tighter italic">{t("communication.edited")}</span>}
                           {isMe && (
                             msg.is_read 
                                ? <CheckCheck className="h-3.5 w-3.5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" /> 
                                : <Check className="h-3.5 w-3.5 text-muted-foreground/60" />
                           )}
                           {msg.is_pinned && <Pin className="h-2.5 w-2.5 text-primary fill-primary" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-6 border-t bg-card/60 backdrop-blur-xl">
              <form onSubmit={handleSend} className="flex flex-col gap-4 max-w-4xl mx-auto">
                {/* Edit Indicator */}
                {editingMessageId && (
                  <div className="bg-primary/10 px-4 py-2 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2">
                      <Pencil className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">{t("chat.editing_message", "Editing Message")}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={cancelEditing}>
                       <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {/* Attachment Queue */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-3 animate-in slide-in-from-bottom-2">
                    {attachments.map((att, i) => (
                      <div key={i} className="relative group/att bg-muted/40 p-2 rounded-xl border border-primary/5 flex items-center gap-3">
                        {att.type === "image" ? (
                          <img src={att.url} className="h-10 w-10 rounded-lg object-cover" alt="" />
                        ) : (
                          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex flex-col pr-6">
                           <span className="text-[10px] font-bold truncate max-w-[100px]">{att.name}</span>
                           <span className="text-[9px] font-black uppercase tracking-tighter opacity-40">{t("chat.ready_transmit", "Ready to transmit")}</span>
                        </div>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="h-5 w-5 rounded-full absolute -top-1 -right-1 opacity-0 group-hover/att:opacity-100 transition-opacity"
                          onClick={() => removeAttachment(i)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-3">
                  <div className="flex-1 bg-background/50 border border-primary/10 rounded-2xl p-2.5 shadow-lg shadow-black/5 focus-within:border-primary/40 transition-all group">
                    <textarea
                      rows={1}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a secure message..."
                      className="w-full bg-transparent border-none focus:ring-0 focus-visible:ring-0 outline-none text-sm font-medium resize-none py-2 px-3 max-h-32 placeholder:text-muted-foreground/50 shadow-none"
                    />
                    <div className="flex items-center justify-between px-2 pt-1.5 border-t border-primary/5">
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" onClick={() => fileInputRef.current?.click()}>
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 pr-2">{t("chat.press_enter", "Press Enter to Transmit")}</span>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="rounded-2xl h-14 w-14 shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all bg-gradient-to-br from-primary to-primary/80"
                    disabled={(!message.trim() && attachments.length === 0) || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending || uploadMutation.isPending ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Send className="h-6 w-6 -rotate-12 translate-x-0.5 -translate-y-0.5" />
                    )}
                  </Button>
                </div>
              </form>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
              />
            </div>
          </>
        )}
      </div>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-none w-screen h-screen p-0 border-none bg-black/60 backdrop-blur-3xl overflow-hidden flex flex-col items-center justify-center sm:rounded-none z-[100]">
           <div className="absolute top-6 left-6 z-50 flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full h-12 w-12 text-white/70 hover:text-white hover:bg-white/10 transition-all"
                onClick={() => setPreviewImage(null)}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <div className="flex flex-col">
                 <span className="text-xs font-black uppercase tracking-[0.3em] text-white/40">{t("chat.secure_view", "Secure View")}</span>
                 <span className="text-[10px] font-bold text-white/20 italic">End-to-End Encrypted Transmission</span>
              </div>
           </div>

           <div className="absolute top-6 right-6 z-50 flex gap-3">
              <Button 
                variant="secondary" 
                size="icon" 
                className="rounded-full h-12 w-12 bg-white/5 hover:bg-white/15 text-white border-white/5 backdrop-blur-md"
                onClick={() => window.open(previewImage!, '_blank')}
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button 
                variant="secondary" 
                size="icon" 
                className="rounded-full h-12 w-12 bg-white/5 hover:bg-white/15 text-white border-white/5 backdrop-blur-md"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-5 w-5" />
              </Button>
           </div>

           <div className="w-full h-full flex items-center justify-center p-4 sm:p-12 relative">
              <img 
                src={previewImage || ''} 
                alt="Full screen preview" 
                className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 select-none pointer-events-none" 
              />
           </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
