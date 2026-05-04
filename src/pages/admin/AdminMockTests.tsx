import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { Plus, Save, Trash2, GraduationCap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AdminMockTests() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  
  const [newTest, setNewTest] = useState({
    title: "",
    exam_type: "SAT",
    subject: "",
    duration_minutes: 60,
    questions: [
      { text: "", options: ["", "", "", ""], correct_answer_index: 0, explanation: "" }
    ]
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["mock_tests"],
    queryFn: () => api.get<any[]>("/mock-tests")
  });

  const createTest = useMutation({
    mutationFn: () => api.post("/mock-tests/admin", newTest),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mock_tests"] });
      setIsCreating(false);
      setNewTest({ title: "", exam_type: "SAT", subject: "", duration_minutes: 60, questions: [{ text: "", options: ["", "", "", ""], correct_answer_index: 0, explanation: "" }] });
    }
  });

  const addQuestion = () => {
    setNewTest(p => ({
      ...p,
      questions: [...p.questions, { text: "", options: ["", "", "", ""], correct_answer_index: 0, explanation: "" }]
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">{t("admin.mockTests", "Mock Tests Management")}</h1>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? t("common.cancel", "Cancel") : <><Plus className="h-4 w-4 mr-2" /> {t("common.create", "Create Test")}</>}
        </Button>
      </div>

      {isCreating && (
        <div className="bg-card border p-6 rounded-3xl space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-muted-foreground">{t("common.title", "Title")}</label>
              <Input value={newTest.title} onChange={e => setNewTest({...newTest, title: e.target.value})} placeholder="e.g. SAT Math Practice 1" />
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground">{t("admin.examType", "Exam Type")}</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newTest.exam_type} onChange={e => setNewTest({...newTest, exam_type: e.target.value})}>
                <option value="SAT">SAT</option>
                <option value="IELTS">IELTS</option>
                <option value="AP">AP</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground">{t("common.subject", "Subject (Optional)")}</label>
              <Input value={newTest.subject} onChange={e => setNewTest({...newTest, subject: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground">{t("admin.duration", "Duration (Minutes)")}</label>
              <Input type="number" value={newTest.duration_minutes} onChange={e => setNewTest({...newTest, duration_minutes: parseInt(e.target.value) || 60})} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">{t("admin.questions", "Questions")}</h3>
            {newTest.questions.map((q, qIndex) => (
              <div key={qIndex} className="p-4 border rounded-2xl bg-secondary/10 space-y-4 relative">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive"
                  onClick={() => setNewTest(p => ({ ...p, questions: p.questions.filter((_, i) => i !== qIndex) }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                
                <div>
                  <label className="text-sm font-bold text-muted-foreground">Question {qIndex + 1}</label>
                  <Textarea value={q.text} onChange={e => {
                    const nq = [...newTest.questions];
                    nq[qIndex].text = e.target.value;
                    setNewTest({...newTest, questions: nq});
                  }} />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qIndex}`} checked={q.correct_answer_index === oIndex}
                        onChange={() => {
                          const nq = [...newTest.questions];
                          nq[qIndex].correct_answer_index = oIndex;
                          setNewTest({...newTest, questions: nq});
                        }}
                      />
                      <Input value={opt} placeholder={`Option ${oIndex + 1}`} onChange={e => {
                        const nq = [...newTest.questions];
                        nq[qIndex].options[oIndex] = e.target.value;
                        setNewTest({...newTest, questions: nq});
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addQuestion} className="w-full border-dashed"><Plus className="h-4 w-4 mr-2" /> Add Question</Button>
          </div>
          
          <Button onClick={() => createTest.mutate()} disabled={!newTest.title || createTest.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" /> {t("common.save", "Save Test")}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tests.map(t => (
          <div key={t.id} className="p-4 rounded-2xl border bg-card flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-primary/10 text-primary uppercase">{t.exam_type}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {t.duration_minutes}m</span>
              </div>
              <h3 className="font-bold">{t.title}</h3>
              {t.subject && <p className="text-sm text-muted-foreground">{t.subject}</p>}
            </div>
          </div>
        ))}
        {tests.length === 0 && !isCreating && (
          <div className="col-span-full p-12 text-center border-2 border-dashed rounded-3xl text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold">No tests available</p>
          </div>
        )}
      </div>
    </div>
  );
}
