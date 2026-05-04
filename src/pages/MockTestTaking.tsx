import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { Clock, Pause, Play, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MockTestTaking() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [status, setStatus] = useState<"not_started" | "in_progress" | "paused" | "completed">("not_started");
  const [score, setScore] = useState<number | null>(null);

  const { data: test, isLoading } = useQuery({
    queryKey: ["mock_test", testId],
    queryFn: () => api.get<any>(`/mock-tests/${testId}`)
  });

  const startAttempt = useMutation({
    mutationFn: () => api.post(`/mock-tests/${testId}/attempt`),
    onSuccess: (data: any) => {
      setAttemptId(data.id);
      setAnswers(data.answers || {});
      setRemainingSeconds(data.remaining_seconds);
      setStatus(data.status);
      if (data.status === "completed") {
        setScore(data.score);
      }
    }
  });

  const updateAttempt = useMutation({
    mutationFn: (action: "save" | "pause" | "submit") => 
      api.put(`/mock-tests/attempt/${attemptId}`, { action, answers, remaining_seconds: remainingSeconds }),
    onSuccess: (data: any) => {
      setStatus(data.status);
      if (data.status === "completed") {
        setScore(data.score);
      }
      if (data.status === "paused") {
        navigate("/app/college-prep/exams");
      }
    }
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === "in_progress" && remainingSeconds > 0) {
      timer = setInterval(() => {
        setRemainingSeconds(p => {
          if (p <= 1) {
            clearInterval(timer);
            updateAttempt.mutate("submit");
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status, remainingSeconds]);

  if (isLoading || !test) return <div className="p-12 text-center">Loading test...</div>;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (status === "not_started") {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-6 mt-12">
        <h1 className="text-4xl font-black">{test.title}</h1>
        <div className="flex justify-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {test.duration_minutes} Minutes</span>
          <span>{test.questions?.length} Questions</span>
        </div>
        <div className="bg-primary/10 p-6 rounded-3xl text-left border border-primary/20">
          <h3 className="font-bold mb-2 text-primary">Instructions:</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>You can pause the test at any time and resume later.</li>
            <li>Make sure you have a stable internet connection.</li>
            <li>The timer will continue counting down while you are in the test.</li>
            <li>When the timer reaches zero, the test will automatically submit.</li>
          </ul>
        </div>
        <Button size="lg" className="w-full text-lg h-14 rounded-2xl" onClick={() => startAttempt.mutate()} disabled={startAttempt.isPending}>
          <Play className="h-5 w-5 mr-2" /> Start Mock Test
        </Button>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-6 mt-12 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-black">Test Completed!</h1>
        <div className="bg-card border rounded-3xl p-8">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Your Score</p>
          <p className="text-6xl font-black text-primary">{score}%</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/app/college-prep/exams")} className="w-full">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const q = test.questions[currentQ];

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-card border-b rounded-t-3xl">
        <h2 className="font-bold hidden sm:block">{test.title}</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono font-black text-lg bg-secondary/30 px-3 py-1.5 rounded-lg">
            <Clock className="h-4 w-4 text-primary" />
            <span className={remainingSeconds < 300 ? "text-rose-500" : ""}>{formatTime(remainingSeconds)}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => updateAttempt.mutate("pause")} disabled={updateAttempt.isPending}>
            <Pause className="h-4 w-4 mr-2" /> Pause
          </Button>
          <Button size="sm" variant="default" onClick={() => updateAttempt.mutate("submit")} disabled={updateAttempt.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Submit
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6 bg-muted/10 border-x">
        <div className="flex justify-between text-sm font-bold text-muted-foreground mb-4">
          <span>Question {currentQ + 1} of {test.questions.length}</span>
        </div>
        
        <div className="text-xl font-medium mb-8 whitespace-pre-wrap">{q.text}</div>
        
        <div className="space-y-3">
          {q.options.map((opt: string, idx: number) => {
            const isSelected = answers[q.id] === idx;
            return (
              <button
                key={idx}
                onClick={() => setAnswers(p => ({ ...p, [q.id]: idx }))}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4
                  ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-transparent bg-card hover:border-border'}`}
              >
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0
                  ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                  {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Nav */}
      <div className="p-4 bg-card border-t border-x rounded-b-3xl flex justify-between items-center">
        <Button variant="ghost" disabled={currentQ === 0} onClick={() => setCurrentQ(p => p - 1)}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Previous
        </Button>
        
        <div className="flex gap-1 overflow-x-auto max-w-[50%] px-2">
          {test.questions.map((_: any, idx: number) => (
            <button key={idx} onClick={() => setCurrentQ(idx)}
              className={`h-2.5 w-8 rounded-full shrink-0 transition-colors
                ${currentQ === idx ? 'bg-primary' : 
                  answers[test.questions[idx].id] !== undefined ? 'bg-primary/40' : 'bg-muted'}`}
            />
          ))}
        </div>

        <Button variant="ghost" disabled={currentQ === test.questions.length - 1} onClick={() => setCurrentQ(p => p + 1)}>
          Next <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
