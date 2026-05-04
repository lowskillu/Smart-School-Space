import { useLocation, useNavigate } from "react-router-dom";
import { 
  CheckCircle2, XCircle, ChevronLeft, 
  RotateCcw, ArrowRight, BrainCircuit,
  Target, Clock, Award, Sparkles, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_SAT_READING } from "@/data/mockTests";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

export default function TestReview() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { testId: string, examId: string, answers: Record<number, string>, timeSpent: number };

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0F172A] text-white">
        <h2 className="text-2xl font-bold">No Attempt Data Found</h2>
        <Button onClick={() => navigate("/app/college-prep/exam")} className="mt-4">Return Home</Button>
      </div>
    );
  }

  const test = MOCK_SAT_READING; // Mocking test retrieval
  const totalQuestions = test.questions.length;
  const correctCount = test.questions.reduce((acc, q) => acc + (state.answers[q.id] === q.correctAnswer ? 1 : 0), 0);
  const score = Math.round((correctCount / totalQuestions) * 1600); // Simple SAT mock score calculation

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedQ = test.questions[selectedIdx];
  const isCorrect = state.answers[selectedQ.id] === selectedQ.correctAnswer;

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4">
      {/* 1. TOP RESULT CARD */}
      <div className="relative overflow-hidden p-8 rounded-[3rem] bg-card border border-primary/20 shadow-2xl">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32" />
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
               <div className="flex items-center gap-3">
                  <Badge className="bg-primary/20 text-primary border-primary/30 font-black">MOCK TEST COMPLETE</Badge>
                  <span className="text-xs text-muted-foreground font-bold">{test.title}</span>
               </div>
               <h1 className="text-5xl font-black tracking-tight mt-2">Score Breakdown</h1>
               <div className="flex gap-12 mt-6">
                  <div>
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Est. Section Score</p>
                     <p className="text-4xl font-black text-primary">{score}</p>
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Accuracy</p>
                     <p className="text-4xl font-black text-white">{Math.round((correctCount/totalQuestions)*100)}%</p>
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Time Spent</p>
                     <p className="text-4xl font-black text-white">{Math.floor(state.timeSpent/60)}m {state.timeSpent%60}s</p>
                  </div>
               </div>
            </div>
            
            <div className="flex flex-col gap-4">
               <Button variant="outline" className="rounded-2xl h-12 font-bold px-8 bg-transparent" onClick={() => navigate(`/app/college-prep/exam/${state.examId}`)}>
                  BACK TO HUB
               </Button>
               <Button className="rounded-2xl h-14 px-8 font-black bg-primary shadow-lg shadow-primary/20" onClick={() => navigate(-1)}>
                  <RotateCcw className="mr-2 h-4 w-4" /> RETAKE TEST
               </Button>
            </div>
         </div>
      </div>

      {/* 2. REVIEW INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[600px]">
         {/* Question Sidebar */}
         <div className="lg:col-span-1 bg-card rounded-[2.5rem] border p-6 flex flex-col gap-6">
            <h3 className="font-black text-lg">Question Map</h3>
            <ScrollArea className="flex-1">
               <div className="grid grid-cols-4 gap-3">
                  {test.questions.map((q, i) => {
                    const qCorrect = state.answers[q.id] === q.correctAnswer;
                    const qSelected = selectedIdx === i;
                    return (
                      <button 
                        key={q.id}
                        onClick={() => setSelectedIdx(i)}
                        className={`h-12 rounded-xl flex items-center justify-center font-black transition-all ${qSelected ? 'scale-110 ring-2 ring-primary border-primary' : 'border'} ${qCorrect ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
                      >
                         {i + 1}
                      </button>
                    );
                  })}
               </div>
            </ScrollArea>
         </div>

         {/* Review Area */}
         <div className="lg:col-span-3 bg-card rounded-[2.5rem] border overflow-hidden flex flex-col">
            <div className="p-8 border-b bg-muted/20 flex items-center justify-between">
               <div>
                  <h4 className="font-bold">Question {selectedIdx + 1}</h4>
                  <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mt-1">{selectedQ.category}</p>
               </div>
               <Badge className={isCorrect ? "bg-emerald-500/20 text-emerald-500" : "bg-destructive/20 text-destructive"}>
                  {isCorrect ? "Correct" : "Incorrect"}
               </Badge>
            </div>

            <ScrollArea className="flex-1 p-8">
               <div className="space-y-8 max-w-3xl">
                  {/* Question Content */}
                  <div className="space-y-4">
                     {selectedQ.passage && <div className="p-6 bg-muted/50 rounded-2xl border italic text-sm text-muted-foreground">{selectedQ.passage}</div>}
                     <p className="text-xl font-bold leading-tight">{selectedQ.content}</p>
                  </div>

                  {/* Answers Comparison */}
                  <div className="space-y-3">
                     <div className={`p-4 rounded-2xl border flex items-center justify-between ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                        <div>
                           <p className="text-[10px] font-black uppercase text-muted-foreground">Your Answer</p>
                           <p className="font-bold">{state.answers[selectedQ.id] || "No Answer"}</p>
                        </div>
                        {isCorrect ? <CheckCircle2 className="text-emerald-500 h-6 w-6" /> : <XCircle className="text-destructive h-6 w-6" />}
                     </div>
                     {!isCorrect && (
                        <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 flex items-center justify-between">
                           <div>
                              <p className="text-[10px] font-black uppercase text-muted-foreground">Correct Answer</p>
                              <p className="font-bold">{selectedQ.correctAnswer}</p>
                           </div>
                           <CheckCircle2 className="text-emerald-500 h-6 w-6" />
                        </div>
                     )}
                  </div>

                  {/* AI FEEDBACK BLOCK */}
                  <div className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-500/10 to-primary/10 border border-primary/20 relative">
                     <div className="absolute top-6 right-8 text-primary/30"><BrainCircuit className="h-10 w-10 rotate-12" /></div>
                     <div className="flex items-center gap-2 mb-4 text-primary">
                        <Sparkles className="h-5 w-5 fill-primary" />
                        <h4 className="font-black text-lg uppercase tracking-tight">AI Reasoning Breakdown</h4>
                     </div>
                     <div className="space-y-4 text-sm leading-relaxed font-medium">
                        <p>{selectedQ.explanation}</p>
                        <div className="h-px bg-primary/10" />
                        <div className="flex items-start gap-4">
                           <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary"><MessageSquare className="h-4 w-4" /></div>
                           <p className="italic text-muted-foreground text-xs italic bg-background/50 p-4 rounded-2xl border">
                              "Keep focus on the word 'cruelest'. T.S. Eliot uses this paradox to suggest that the rebirth of spring is painful when it stirs up dead roots and memories."
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            </ScrollArea>
         </div>
      </div>
    </div>
  );
}
