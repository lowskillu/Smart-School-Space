import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Clock, AlertTriangle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSchool } from "@/contexts/SchoolContext";
import { useTranslation } from "react-i18next";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useMeetingByRoom, useStartMeeting, useUpdateMeeting, useCloseMeeting } from "@/hooks/useApiData";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function MeetingRoom() {
  const { meetingId } = useParams(); // This is room_key
  const navigate = useNavigate();
  const { name: schoolName, role, grade } = useSchool();
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: meeting, isLoading, refetch } = useMeetingByRoom(meetingId);
  const startMeetingMutation = useStartMeeting();
  const updateMeetingMutation = useUpdateMeeting();
  const closeMeetingMutation = useCloseMeeting();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const jitsiApiRef = useRef<any>(null);

  const name = schoolName || user?.name || "Participant";
  let titleString = role === "teacher" ? "Teacher" : 
                    role === "counselor" ? "Counselor" : 
                    grade ? `${grade} Grade` : "Student";
  const displayName = `${name} (${titleString})`;
  const roomName = `SmartSchool_${meetingId}`;

  const isHost = meeting?.host_id === user?.id;
  const scheduled = meeting ? (meeting.scheduled_time ? new Date(meeting.scheduled_time) : new Date(meeting.created_at)) : null;

  // Start meeting logic
  useEffect(() => {
    if (!meeting) return;
    
    const now = new Date();
    
    // Allow host to start anytime, others only if it's time or already started
    if (!meeting.started_at && !isStarted) {
      if (isHost || (scheduled && now >= scheduled)) {
        startMeetingMutation.mutate(meeting.id, {
          onSuccess: () => {
            setIsStarted(true);
            refetch();
          }
        });
      }
    } else if (meeting.started_at) {
      setIsStarted(true);
    }
  }, [meeting, user]);

  // Timer logic
  useEffect(() => {
    if (!meeting?.started_at || !meeting?.duration) return;

    const timer = setInterval(() => {
      const startTime = new Date(meeting.started_at!).getTime();
      const endTime = startTime + meeting.duration * 60 * 1000;
      const now = new Date().getTime();
      const diff = Math.floor((endTime - now) / 1000);

      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
        handleAutoClose();
      } else {
        setTimeLeft(diff);
        // Warning at 5 minutes (300 seconds)
        if (diff <= 300 && !showWarning) {
          setShowWarning(true);
          toast.warning("Conference ending in 5 minutes!", {
            description: "Click extend to add 30 more minutes.",
            duration: 10000,
          });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [meeting, showWarning]);

  const handleAutoClose = async () => {
    if (meeting?.host_id === user?.id) {
      await closeMeetingMutation.mutateAsync(meeting.id);
      toast.error("Conference ended due to time limit.");
      navigate("/app/communication");
    } else {
      toast.error("Conference ended by host or time limit.");
      navigate("/app/communication");
    }
  };

  const handleExtend = async () => {
    if (meeting) {
      try {
        await updateMeetingMutation.mutateAsync({
          id: meeting.id,
          duration: meeting.duration + 30
        });
        setShowWarning(false);
        toast.success("Conference extended by 30 minutes");
      } catch (err) {
        toast.error("Failed to extend conference");
      }
    }
  };

  const handleExit = () => {
    navigate("/app/communication");
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center bg-background/50 backdrop-blur-xl rounded-3xl border border-primary/10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 font-black uppercase tracking-widest text-xs opacity-40 italic">Initializing Secure Room...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center bg-background/50 backdrop-blur-xl rounded-3xl border border-primary/10 text-center p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6 animate-bounce" />
        <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Conference Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md">This meeting may have ended, been deleted, or your session has expired.</p>
        <Button onClick={handleExit} className="rounded-xl font-black uppercase tracking-widest text-xs px-8">
          Return to Hub
        </Button>
      </div>
    );
  }

  // Show waiting screen ONLY for participants if meeting hasn't started yet
  // Host ALWAYS bypasses this screen to start the meeting
  if (!meeting.started_at && !isStarted && !isHost) {
    const scheduled = meeting.scheduled_time ? new Date(meeting.scheduled_time) : new Date(meeting.created_at);
    const now = new Date();
    
    if (now < scheduled) {
      return (
        <div className="h-[80vh] flex flex-col items-center justify-center bg-background/50 backdrop-blur-xl rounded-3xl border border-primary/10 text-center p-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <Clock className="h-16 w-16 text-primary relative animate-bounce" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Waiting for Host</h2>
          <p className="text-muted-foreground mb-8 max-w-md">This meeting is scheduled for {scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}. Please wait for the host to start the conference.</p>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-40">
            <Loader2 className="h-3 w-3 animate-spin" />
            Auto-joining when ready
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col h-[85vh] w-full rounded-2xl overflow-hidden border bg-background relative shadow-2xl shadow-black/20 border-primary/5">
      {/* Premium Header */}
      <div className="h-16 bg-card/90 backdrop-blur-md border-b border-primary/5 px-6 flex items-center justify-between shrink-0 z-20 w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleExit} className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <span className="font-black uppercase tracking-tighter text-sm italic">{meeting?.title || "Meeting Room"}</span>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-muted-foreground opacity-60">ID: {meetingId?.slice(0,8)}...</span>
               {timeLeft !== null && (
                 <Badge variant={showWarning ? "destructive" : "outline"} className="h-5 text-[10px] font-black uppercase tracking-widest px-2 gap-1 animate-in fade-in slide-in-from-left-2">
                    <Clock className="h-3 w-3" />
                    {formatTime(timeLeft)}
                 </Badge>
               )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {showWarning && meeting?.host_id === user?.id && (
             <Button 
               size="sm" 
               variant="outline" 
               onClick={handleExtend}
               className="h-9 px-4 rounded-xl border-amber-500/50 text-amber-500 hover:bg-amber-500/10 font-black uppercase tracking-widest text-[10px] gap-2 animate-pulse"
             >
               <Play className="h-3.5 w-3.5" />
               Extend Session (+30m)
             </Button>
           )}
           
           <div className="h-8 w-[1px] bg-primary/10 hidden sm:block" />
           
           <div className="flex items-center gap-3">
              <span className="text-[10px] px-3 py-1 bg-primary/10 text-primary font-black uppercase tracking-widest rounded-lg border border-primary/5">
                {displayName}
              </span>
              <Button variant="destructive" size="sm" onClick={handleExit} className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6 h-9 shadow-lg shadow-destructive/20 hover:scale-105 active:scale-95 transition-all">
                Leave
              </Button>
           </div>
        </div>
      </div>

      <div className="flex-1 w-full relative bg-black">
        <JitsiMeeting
              domain="jitsi.belnet.be"
              roomName={roomName}
              userInfo={{
                  displayName: displayName,
                  email: ""
              }}
              configOverwrite={{
                  prejoinPageEnabled: false,
                  disableInviteFunctions: true,
                  disableDeepLinking: true,
                  backgroundAlpha: 0,
                  startWithAudioMuted: true,
                  startWithVideoMuted: true,
                  enableWelcomePage: false,
                  enableLobby: false,
                  requireDisplayName: true,
                  hideConferenceTimer: false,
              }}
              interfaceConfigOverwrite={{
                  TOOLBAR_BUTTONS: [
                      'microphone', 'camera', 'desktop', 'fullscreen',
                      'fodeviceselection', 'profile', 'chat', 'settings', 'raisehand',
                      'videoquality', 'filmstrip', 'tileview', 'videobackgroundblur', 'mute-everyone',
                      'security'
                  ],
                  HIDE_DEEP_LINKING_LOGO: true,
                  SHOW_JITSI_WATERMARK: false,
                  SHOW_WATERMARK_FOR_GUESTS: false,
                  SHOW_PROMOTIONAL_CLOSE_PAGE: false,
                  DEFAULT_BACKGROUND: "transparent",
              }}
              onApiReady={(externalApi: any) => {
                  jitsiApiRef.current = externalApi;
                  
                  // Set password if it exists
                  if (meeting?.password) {
                      // For moderator to set the password
                      externalApi.addEventListener('participantRoleChanged', (event: any) => {
                          if (event.role === 'moderator') {
                              externalApi.executeCommand('password', meeting.password);
                          }
                      });
                      
                      // For participants to automatically join with password
                      externalApi.on('passwordRequired', () => {
                          externalApi.executeCommand('password', meeting.password);
                      });

                      // Also try to set it immediately (for host)
                      externalApi.executeCommand('password', meeting.password);
                  }

                  externalApi.on('readyToClose', () => {
                      externalApi.dispose();
                      handleExit();
                  });
                  externalApi.on('videoConferenceLeft', () => {
                      setTimeout(() => {
                          externalApi.dispose();
                          handleExit();
                      }, 500);
                  });
              }}
              getIFrameRef={(iframeRef) => {
                  iframeRef.style.height = '100%';
                  iframeRef.style.width = '100%';
                  iframeRef.style.border = 'none';
              }}
              spinner={() => (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="mt-2 text-xs font-black uppercase tracking-widest text-muted-foreground opacity-40 italic">Syncing Transmissions...</span>
                  </div>
              )}
          />
      </div>
    </div>
  );
}
