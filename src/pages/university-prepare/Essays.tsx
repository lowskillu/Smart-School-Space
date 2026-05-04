import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Save, CheckCircle, Bot, User, Plus, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useSchool } from "@/contexts/SchoolContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { Loader2 } from "lucide-react";

interface Essay {
  id: string;
  title: string;
  content: string;
  status: string;
  topic?: string;
}

export default function Essays() {
  const { t } = useTranslation();
  const { role } = useSchool();
  
  const qc = useQueryClient();
  
  const { data: essays = [], isLoading } = useQuery<Essay[]>({
    queryKey: ["essays"],
    queryFn: () => api.get("/uni-prep/essays")
  });

  const [selected, setSelected] = useState<Essay | null>(null);

  // Editor states
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);
  const wordLimit = 650;

  // AI Chat mock state
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (selected) {
      setContent(selected.content || "");
      setTitle(selected.title || "Untitled Essay");
      setAiFeedback(null);
    } else {
      setContent("");
      setTitle("");
      setAiFeedback(null);
    }
  }, [selected]);

  const createEssay = useMutation({
    mutationFn: (data: Partial<Essay>) => api.post("/uni-prep/essays", data),
    onSuccess: (newEssay: Essay) => {
      qc.invalidateQueries({ queryKey: ["essays"] });
      setSelected(newEssay);
    }
  });

  const updateEssay = useMutation({
    mutationFn: (data: { id: string, status: string, content: string, title: string }) => api.put(`/uni-prep/essays/${data.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["essays"] });
    }
  });

  const handleSave = (status: "Drafting" | "Completed", showToast = false) => {
    if (!selected) return;
    updateEssay.mutate({ id: selected.id, status, content, title });
    setSelected({ ...selected, content, title, status });
    if (showToast) toast.success(`Essay saved to ${status}`);
  };

  const handleCreateNew = () => {
    createEssay.mutate({ title: "Untitled Essay", content: "", status: "Not Started" });
  };

  const handleAskAi = async () => {
    if (!selected || !content.trim()) {
      toast.error("Please write some content first!");
      return;
    }
    setIsAiLoading(true);
    try {
      // Auto save before checking
      updateEssay.mutate({ id: selected.id, status: selected.status, content, title });
      const res = await api.post<{feedback: string}>(`/uni-prep/essays/${selected.id}/analyze`);
      setAiFeedback(res.feedback);
    } catch (e) {
      toast.error("Failed to analyze essay.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const drafts = essays.filter(e => e.status !== "Completed");
  const completed = essays.filter(e => e.status === "Completed");

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading essays...</div>;

  if (selected) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <input 
              className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Essay Title"
            />
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${wordCount > wordLimit ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
              {t("essaysDashboard.wordsLabel", { current: wordCount, max: wordLimit })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* Main Editor */}
          <BentoCard className="lg:col-span-2 flex flex-col h-full min-h-[600px]" title="Essay Editor">
            <div className="md:hidden mb-4">
               <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${wordCount > wordLimit ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
                {t("essaysDashboard.wordsLabel", { current: wordCount, max: wordLimit })}
              </div>
            </div>
            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("essaysDashboard.writeEssayHere")}
              className="flex-1 w-full resize-none bg-muted/20 border-border text-base leading-relaxed p-4 rounded-xl focus-visible:ring-1"
            />
            <div className="flex gap-4 mt-4">
              <Button onClick={() => handleSave("Drafting", true)} variant="secondary" className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {t("essaysDashboard.saveDraft")}
              </Button>
              <Button onClick={() => handleSave("Completed", true)} className="flex-1 gap-2">
                <CheckCircle className="h-4 w-4" />
                {t("essaysDashboard.saveCompleted")}
              </Button>
            </div>
          </BentoCard>

          {/* Feedback Panels */}
          <div className="space-y-6 flex flex-col h-full">
            <BentoCard className="flex-1 min-h-[300px] flex flex-col" title={t("essaysDashboard.aiChatTitle")} icon={<Bot className="h-5 w-5" />}>
              <div className="flex-1 bg-muted/20 rounded-xl p-4 flex flex-col text-sm text-muted-foreground border">
                {aiFeedback ? (
                  <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-foreground whitespace-pre-wrap flex-1 overflow-auto">
                    {aiFeedback}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                    <Bot className="h-12 w-12 mb-4" />
                    <p>Get instant feedback on your essay structure, grammar, and impact.</p>
                  </div>
                )}
                
                <Button onClick={handleAskAi} disabled={isAiLoading} className="mt-4 w-full">
                  {isAiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />}
                  {isAiLoading ? "Analyzing..." : "Ask AI Coach"}
                </Button>
              </div>
            </BentoCard>

            <BentoCard className="flex-1 min-h-[250px]" title={t("essaysDashboard.counselorFeedback")} icon={<User className="h-5 w-5" />}>
              <div className="h-full w-full border bg-muted/10 rounded-xl p-4 text-sm">
                {role === "admin" || role === "teacher" ? (
                  <Textarea placeholder="Write your feedback for this student..." className="h-full resize-none bg-transparent border-none focus-visible:ring-0 p-0" />
                ) : (
                  <p className="text-muted-foreground italic">No feedback from your counselor yet.</p>
                )}
              </div>
            </BentoCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/app/college-prep">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("essaysDashboard.pageTitle")}</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Left: Drafts */}
        <BentoCard title={t("essaysDashboard.draftsList")} className="lg:col-span-1">
          <div className="space-y-3 mt-2">
            {drafts.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-4">No drafts found.</p>
            ) : drafts.map(essay => (
              <div 
                key={essay.id} 
                onClick={() => setSelected(essay)}
                className="p-4 rounded-2xl border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-500 border-amber-500/30">
                    {t(`essaysDashboard.statuses.drafting`)}
                  </Badge>
                </div>
                <h4 className="font-semibold text-sm leading-tight line-clamp-2 mb-1">{essay.title}</h4>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Right: Completed + New Essay */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div 
            onClick={handleCreateNew}
            className="w-full border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors rounded-3xl p-6 flex items-center justify-center cursor-pointer min-h-[120px] group"
          >
            <div className="flex items-center gap-3 text-primary group-hover:scale-105 transition-transform">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">{t("essaysDashboard.addEssay")}</span>
            </div>
          </div>

          <BentoCard title={t("essaysDashboard.completedList")} className="flex-1">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {completed.length === 0 ? (
                 <p className="text-sm text-muted-foreground col-span-2 text-center py-4">No completed essays found.</p>
              ) : completed.map(essay => (
                <div 
                  key={essay.id} 
                  onClick={() => setSelected(essay)}
                  className="p-4 rounded-2xl border bg-card hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="default" className="text-[10px] uppercase font-bold bg-emerald-500 hover:bg-emerald-600 border-none">
                      {t(`essaysDashboard.statuses.completed`)}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm leading-tight line-clamp-2 mb-1">{essay.title}</h4>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>

      </div>
    </div>
  );
}

import { Input } from "@/components/ui/input";
