import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem 
} from "@/components/ui/select";
import { ArrowLeft, UploadCloud, FileText, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/api/client";

interface Teacher {
  id: string;
  name: string;
  email: string | null;
  department?: string;
}

export default function LetterOfRecommendation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // state
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [deadline, setDeadline] = useState("");
  const [major, setMajor] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  // fetch teachers
  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ["teachers"],
    queryFn: async () => {
      return api.get<Teacher[]>("/teachers");
    }
  });

  const { data: existingRequests = [] } = useQuery<any[]>({
    queryKey: ["my_recommendations"],
    queryFn: () => api.get("/uni-prep/recommendations")
  });

  const createReq = useMutation({
    mutationFn: (data: any) => api.post("/uni-prep/recommendations", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_recommendations"] });
      toast.success(t("lettersRecommendations.successMsg", "Request submitted successfully"));
      setSelectedTeacher("");
      setDeadline("");
      setMajor("");
      setCvFile(null);
    }
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!selectedTeacher || !deadline || !major) {
      toast.error("Please fill out all required fields.");
      return;
    }

    createReq.mutate({
      teacher_id: selectedTeacher,
      deadline: new Date(deadline).toISOString(),
      major
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/app/college-prep">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("lettersRecommendations.pageTitle")}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Main Form Area */}
        <BentoCard className="md:col-span-2 lg:col-span-2">
          <div className="space-y-6">
            
            {/* Teachers List */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("lettersRecommendations.selectTeacher")}</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-full h-12 bg-muted/30">
                  <SelectValue placeholder={t("lettersRecommendations.selectTeacher")} />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.email ? `(${t.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Split row: Deadline & Major */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t("lettersRecommendations.deadline")}</Label>
                <Input 
                  type="date"
                  className="h-12 bg-muted/30"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t("lettersRecommendations.major")}</Label>
                <Input 
                  placeholder="e.g. Computer Science Option"
                  className="h-12 bg-muted/30"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                />
              </div>
            </div>

            {/* CV Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t("lettersRecommendations.cvLabel")}</Label>
              <div className="border-2 border-dashed border-border rounded-2xl p-8 bg-muted/10 text-center hover:bg-muted/20 transition-colors">
                {cvFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-primary" />
                    <p className="font-medium text-sm">{cvFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setCvFile(null)} className="mt-2">
                      Replace
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">{t("lettersRecommendations.cvDesc")}</p>
                    </div>
                    <Label className="cursor-pointer">
                      <Input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
                      <span className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 h-9 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors">
                        Browse Files
                      </span>
                    </Label>
                  </div>
                )}
              </div>
            </div>

            {/* Approve Button */}
            <Button 
              size="lg" 
              className="w-full text-base h-14 rounded-xl gap-2 font-semibold shadow-xl shadow-primary/20"
              onClick={handleSubmit}
              disabled={createReq.isPending}
            >
              <CheckCircle2 className="h-5 w-5" />
              {createReq.isPending ? "Submitting..." : t("lettersRecommendations.approveBtn", "Request Recommendation")}
            </Button>
          </div>
        </BentoCard>

        {/* Existing Requests */}
        <div className="md:col-span-2 lg:col-span-3">
          <BentoCard title="My Requests">
            <div className="space-y-4 mt-4">
              {existingRequests.map(req => (
                <div key={req.id} className="p-4 bg-muted/20 border rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">{req.teacher_name}</h4>
                    <p className="text-sm text-muted-foreground">{req.major} • Deadline: {new Date(req.deadline).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-black uppercase rounded-lg ${
                    req.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                    req.status === 'declined' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))}
              {existingRequests.length === 0 && (
                <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-2xl">
                  No requests yet.
                </div>
              )}
            </div>
          </BentoCard>
        </div>

        {/* Right Info Guidelines */}
        <div className="md:col-span-2 lg:col-span-1 space-y-6">
          <BentoCard title="Guidelines">
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <div className="bg-primary/10 p-1.5 h-7 w-7 rounded-full text-primary flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <p>Provide at least <strong className="text-foreground">3 weeks</strong> of notice before the deadline.</p>
              </li>
              <li className="flex gap-3">
                <div className="bg-primary/10 p-1.5 h-7 w-7 rounded-full text-primary flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <p>Attach an updated CV highlighting academic honors and relevant extracurriculars.</p>
              </li>
              <li className="flex gap-3">
                <div className="bg-primary/10 p-1.5 h-7 w-7 rounded-full text-primary flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <p>Ensure your university major aligns with the teacher's subject for a stronger narrative.</p>
              </li>
            </ul>
          </BentoCard>
        </div>

      </div>
    </div>
  );
}
