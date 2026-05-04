import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";
import { CheckCircle2, Clock, XCircle, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function TeacherRecommendations() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  
  const { data: requests = [] } = useQuery<any[]>({
    queryKey: ["teacher_recommendations"],
    queryFn: () => api.get("/uni-prep/recommendations/teacher")
  });

  const updateReq = useMutation({
    mutationFn: (data: { id: string, status?: string, content?: string }) => api.put(`/uni-prep/recommendations/${data.id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher_recommendations"] })
  });

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/3 space-y-4">
        <h1 className="text-2xl font-black">{t("sidebar.recommendations", "Recommendations")}</h1>
        
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} 
              onClick={() => setSelectedReq(req)}
              className={`p-4 rounded-2xl border cursor-pointer transition-colors ${selectedReq?.id === req.id ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  req.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                  req.status === 'declined' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {req.status}
                </span>
                {req.deadline && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(req.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h3 className="font-bold">{req.student_name}</h3>
              <p className="text-sm text-muted-foreground">{req.major || "Undecided Major"}</p>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-2xl">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-bold">No requests found</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full md:w-2/3">
        {selectedReq ? (
          <div className="bg-card border rounded-3xl p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black">{selectedReq.student_name}</h2>
                <p className="text-muted-foreground">{t("uniPrep.major", "Major")}: {selectedReq.major}</p>
                {selectedReq.deadline && <p className="text-sm text-rose-500 font-bold mt-1">Deadline: {new Date(selectedReq.deadline).toLocaleDateString()}</p>}
              </div>
              
              {selectedReq.status === "pending" && (
                <div className="flex gap-2">
                  <Button variant="outline" className="text-rose-500 border-rose-500/20" 
                    onClick={() => updateReq.mutate({ id: selectedReq.id, status: "declined" })}>
                    <XCircle className="h-4 w-4 mr-2" /> Decline
                  </Button>
                  <Button onClick={() => updateReq.mutate({ id: selectedReq.id, status: "in_progress" })}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Accept
                  </Button>
                </div>
              )}
            </div>

            {(selectedReq.status === "in_progress" || selectedReq.status === "completed") && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-muted-foreground block mb-2">{t("uniPrep.letterContent", "Letter Content")}</label>
                  <Textarea 
                    value={selectedReq.content || ""} 
                    onChange={e => setSelectedReq({...selectedReq, content: e.target.value})}
                    placeholder="Write your recommendation letter here..."
                    className="min-h-[300px] resize-y"
                    disabled={selectedReq.status === "completed"}
                  />
                </div>
                
                {selectedReq.status !== "completed" && (
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => updateReq.mutate({ id: selectedReq.id, content: selectedReq.content })}>
                      Save Draft
                    </Button>
                    <Button onClick={() => updateReq.mutate({ id: selectedReq.id, content: selectedReq.content, status: "completed" })}>
                      <Send className="h-4 w-4 mr-2" /> Submit Letter
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed rounded-3xl text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold">Select a request to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
