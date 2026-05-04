import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Flag, Calculator, 
  Settings, Clock, Pause, Play, LogOut,
  MoreVertical, Type, Eraser, Check, 
  Fullscreen, Minimize2, Info, SendHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_SAT_READING, Question } from "@/data/mockTests";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function MockSimulator() {
  const { examId, testId } = useParams();
  const navigate = useNavigate();
  const test = MOCK_SAT_READING; // Default for now
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(test.durationMinutes * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentQuestion = test.questions[currentIdx];

  // Timer logic
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) next.delete(currentQuestion.id);
      else next.add(currentQuestion.id);
      return next;
    });
  };

  const handleSubmit = () => {
    // Navigate to review page with state
    navigate(`/app/college-prep/mock-test/review`, { 
      state: { 
        testId: test.id, 
        examId, 
        answers, 
        timeSpent: test.durationMinutes * 60 - timeLeft 
      } 
    });
    toast.success("Test submitted successfully!");
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-slate-100 flex flex-col z-50 overflow-hidden font-sans select-none selection:bg-primary/30 selection:text-white">
      {/* Dynamic Background Noise/Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
      </div>

      {/* 1. ULTRA-PREMIUM HEADER */}
      <header className="h-20 border-b border-white/[0.08] flex items-center justify-between px-8 bg-slate-950/40 backdrop-blur-xl relative z-50">
         <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
                  <div className="h-5 w-5 bg-white rounded-full animate-pulse" />
               </div>
               <div>
                  <div className="text-sm font-black tracking-widest text-primary leading-none">SMART SPACE</div>
                  <div className="text-[10px] font-bold opacity-40 uppercase tracking-tighter mt-1">Mock Simulator v2.0</div>
               </div>
            </div>
            <div className="h-8 w-px bg-white/[0.08]" />
            <div className="flex flex-col">
               <span className="text-xs font-black text-white/40 uppercase tracking-widest">Active Session</span>
               <span className="text-sm font-bold truncate max-w-[200px]">{test.title}</span>
            </div>
         </div>

         {/* Timer Control Center */}
         <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 p-1 bg-white/[0.03] rounded-2xl border border-white/[0.05] shadow-2xl">
            <div className={`flex items-center gap-4 px-6 py-2.5 rounded-xl transition-all ${isPaused ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
               <Clock className={`h-5 w-5 ${isPaused ? 'text-amber-500' : 'text-primary'}`} />
               <span className="font-mono text-2xl font-black tracking-tighter tabular-nums w-20">{formatTime(timeLeft)}</span>
            </div>
            <Button 
               variant="ghost" 
               size="icon" 
               className="h-12 w-12 rounded-xl group hover:bg-white/10" 
               onClick={() => setIsPaused(!isPaused)}
            >
               {isPaused ? <Play className="h-6 w-6 text-amber-500 fill-amber-500/20" /> : <Pause className="h-6 w-6 text-primary fill-primary/20" />}
            </Button>
         </div>

         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl">
               <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-white/10" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
               </Button>
               <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-white/10">
                  <Calculator className="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-white/10">
                  <Settings className="h-4 w-4" />
               </Button>
            </div>
            <Button variant="outline" className="h-11 px-6 rounded-xl font-black text-xs uppercase tracking-widest border-white/10 bg-white/5 hover:bg-destructive hover:border-destructive transition-all" onClick={() => setShowExitDialog(true)}>
               Terminate
            </Button>
         </div>
      </header>

      {/* 2. PROGRESS BAR (Sleek Linear) */}
      <div className="h-1 bg-slate-900 w-full relative z-50">
         <div 
            className="h-full bg-gradient-to-r from-primary via-indigo-400 to-primary shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-700 ease-out" 
            style={{ width: `${((currentIdx + 1) / test.questions.length) * 100}%` }}
         />
      </div>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 flex overflow-hidden relative z-10">
         {/* Left Side: Question Tracker & Meta */}
         <div className="w-[80px] border-r border-white/5 bg-slate-950/20 flex flex-col items-center py-8 gap-4 overflow-y-auto custom-scrollbar">
            {test.questions.map((q, i) => {
               const isCurrent = i === currentIdx;
               const isAnswered = !!answers[q.id];
               const isFlagged = flagged.has(q.id);
               return (
                  <button 
                     key={i}
                     onClick={() => setCurrentIdx(i)}
                     className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all relative border-2 ${isCurrent ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(59,130,246,0.4)]' : isAnswered ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-white/[0.03] text-white/30 border-transparent hover:border-white/10 hover:text-white/60'}`}
                  >
                     {i + 1}
                     {isFlagged && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 border-2 border-[#020617]" />}
                  </button>
               );
            })}
         </div>

         {/* Center Content: Split Pane */}
         <div className="flex-1 flex overflow-hidden">
            {/* Passage Side */}
            <div className="flex-1 border-r border-white/5 flex flex-col bg-slate-950/40 relative">
               <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <Badge variant="outline" className="bg-white/5 border-white/10 text-xs font-black px-4 py-1 tracking-widest text-white/50 uppercase">Module 1: Reading & Writing</Badge>
                  <div className="flex items-center gap-4 text-xs font-bold text-white/20">
                     <span>Words: 154</span>
                     <div className="h-1 w-1 bg-white/10 rounded-full" />
                     <span>Difficulty: Hard</span>
                  </div>
               </div>
               <ScrollArea className="flex-1">
                  <div className="p-16 max-w-2xl mx-auto">
                     {currentQuestion.passage && (
                        <div className="relative mb-12">
                           <div className="absolute -left-8 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                           <div className="text-xl leading-relaxed text-slate-300 font-serif hyphens-auto selection:bg-primary/30">
                              {currentQuestion.passage}
                           </div>
                        </div>
                     )}
                     <div className="text-2xl font-black leading-tight text-white selection:bg-primary/30">
                        {currentQuestion.content}
                     </div>
                  </div>
               </ScrollArea>
            </div>

            {/* Answers Side */}
            <div className="w-[540px] bg-slate-950/10 flex flex-col items-center">
               <div className="w-full max-w-md my-auto px-8 space-y-4">
                  <div className="flex items-center gap-3 mb-8">
                     <div className="h-px bg-white/5 flex-1" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Select Response</span>
                     <div className="h-px bg-white/5 flex-1" />
                  </div>
                  
                  {currentQuestion.options?.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isSelected = answers[currentQuestion.id] === opt;
                    return (
                      <button 
                        key={i}
                        onClick={() => handleAnswer(opt)}
                        className={`w-full group flex items-start gap-6 p-6 rounded-[2rem] border-2 text-left transition-all duration-300 relative overflow-hidden ${isSelected ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'border-white/[0.03] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'}`}
                      >
                         {/* Selection Ripple Effect */}
                         {isSelected && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}
                         
                         <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg transition-all ${isSelected ? 'bg-primary text-white scale-110' : 'bg-white/5 text-white/30 group-hover:text-white'}`}>
                            {letter}
                         </div>
                         <div className="pt-2">
                           <span className={`text-[15px] font-bold leading-tight block transition-all ${isSelected ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>{opt}</span>
                         </div>
                         
                         {isSelected && (
                           <div className="absolute right-8 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                              <Check className="h-4 w-4 text-primary" />
                           </div>
                         )}
                      </button>
                    );
                  })}
               </div>

               {/* Tactical Navigation Bar */}
               <div className="w-full p-8 border-t border-white/5 flex items-center justify-between bg-slate-950/40 backdrop-blur-md">
                  <Button 
                     variant="ghost" 
                     className={`rounded-2xl gap-3 font-black px-6 h-14 transition-all ${flagged.has(currentQuestion.id) ? 'bg-amber-500/10 text-amber-500' : 'text-white/30 hover:bg-white/5 hover:text-white'}`} 
                     onClick={toggleFlag}
                  >
                     <Flag className={`h-5 w-5 ${flagged.has(currentQuestion.id) ? 'fill-amber-500' : ''}`} />
                     FLAG
                  </Button>

                  <div className="flex gap-4">
                     <Button 
                        disabled={currentIdx === 0}
                        onClick={() => setCurrentIdx(prev => prev - 1)}
                        className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-20"
                     >
                        <ChevronLeft className="h-6 w-6" />
                     </Button>

                     {currentIdx === test.questions.length - 1 ? (
                        <Button 
                           onClick={handleSubmit}
                           className="h-14 px-10 rounded-[1.25rem] bg-gradient-to-br from-primary to-indigo-600 font-black text-sm tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex gap-3 items-center"
                        >
                           SUBMIT TEST <SendHorizontal className="h-5 w-5" />
                        </Button>
                     ) : (
                        <Button 
                           onClick={() => setCurrentIdx(prev => prev + 1)}
                           className="h-14 px-10 rounded-[1.25rem] bg-white text-slate-950 font-black text-sm tracking-widest hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all flex gap-3 items-center"
                        >
                           NEXT QUESTION <ChevronRight className="h-5 w-5" />
                        </Button>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </main>

      {/* EXIT DIALOG (Premium Styling) */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
         <DialogContent className="bg-slate-950 border-white/10 text-white rounded-[2.5rem] p-8 max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col items-center text-center gap-6">
               <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Info className="h-10 w-10 text-red-500" />
               </div>
               <div>
                  <DialogTitle className="text-3xl font-black mb-2">Abandon Session?</DialogTitle>
                  <p className="text-slate-400 font-medium">Your current progress will be lost. This attempt will not be recorded in your dashboard history.</p>
               </div>
               <div className="flex w-full gap-4">
                  <Button variant="outline" className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 font-bold" onClick={() => setShowExitDialog(false)}>BACK TO TEST</Button>
                  <Button variant="destructive" className="flex-1 h-14 rounded-2xl font-black bg-red-600 hover:bg-red-700" onClick={() => navigate(-1)}>EXIT NOW</Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
