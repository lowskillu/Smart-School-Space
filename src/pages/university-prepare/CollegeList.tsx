import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Search, Bot, SlidersHorizontal, Loader2, CheckCircle2, ChevronDown, CheckSquare, Settings2, Globe, FileCheck, Plus } from "lucide-react";
import { useSchool } from "@/contexts/SchoolContext";
import { toast } from "sonner";
import { api } from "@/integrations/api/client";
import { useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

interface UniData {
  id: string;
  name: string;
  country: string;
  acceptanceRate: number;
  globalRank: number;
  sat: number;
  alevel: string;
  ib: number;
  ielts: number;
  regularDecision: string;
  cost: number;
  financialAid: boolean;
  status: "Draft" | "Applying" | "Submitted";
}

const COLUMNS = [
  { id: "country", label: "Country" },
  { id: "ar", label: "Acceptance Rate" },
  { id: "rank", label: "Global Rank" },
  { id: "sat", label: "SAT Avg" },
  { id: "alevel", label: "A-Level" },
  { id: "ib", label: "IB Points" },
  { id: "ielts", label: "IELTS" },
  { id: "cost", label: "Tuition" },
  { id: "aid", label: "Financial Aid" },
  { id: "deadline", label: "Deadline" }
];

export default function CollegeList() {
  const { t } = useTranslation();
  const { name } = useSchool();
  
  // User profile mock — should be empty for a clean state
  const userProfile = { gpa: 0, sat: 0, ib: 0, ielts: 0 };

  const [colleges, setColleges] = useState<UniData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchColleges = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<UniData[]>("/uni-prep/colleges");
      setColleges(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load college list.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);
  
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    country: true, ar: true, rank: true, sat: true, alevel: false, ib: false, ielts: true, cost: true, aid: true, deadline: true
  });

  const toggleCol = (id: string) => {
    setVisibleCols(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const calculateChance = (uni: UniData) => {
    if (uni.acceptanceRate < 10) return "Hard Reach";
    if (userProfile.sat && userProfile.sat >= uni.sat) return "Safety/Match";
    if (userProfile.sat && userProfile.sat < uni.sat - 50) return "Reach";
    return "Match";
  };

  const getChanceColor = (chance: string) => {
    if (chance === "Hard Reach") return "bg-rose-500 hover:bg-rose-600 text-white border-none";
    if (chance === "Reach") return "bg-orange-500 hover:bg-orange-600 text-white border-none";
    if (chance === "Match") return "bg-blue-500 hover:bg-blue-600 text-white border-none";
    if (chance === "Safety/Match") return "bg-emerald-500 hover:bg-emerald-600 text-white border-none";
    return "bg-muted";
  };

  const handleAiParse = async () => {
    if (!searchTerm) return;
    setLoadingAi(true);
    try {
      const data = await api.get<any>(`/parse-university?name=${encodeURIComponent(searchTerm)}`);
      if (data.status === "success") {
        const u = data.data;
        const newUniPayload = {
          name: u.name,
          country: u.country,
          acceptanceRate: u.acceptance_rate,
          globalRank: u.global_rank,
          sat: u.sat_req,
          alevel: u.alevel_req,
          ib: u.ib_req,
          ielts: u.ielts_req,
          regularDecision: u.regular_decision || "N/A",
          cost: u.tuition_fee,
          financialAid: u.financial_aid,
          status: "Draft",
        };
        
        // Auto-save to backend
        const saved = await api.post<UniData>("/uni-prep/colleges", newUniPayload);
        setColleges(prev => [saved, ...prev]);
        setSearchTerm("");
        toast.success(`Added ${u.name} to your list!`);
      }
    } catch(e) {
      toast.error("Failed to parse university data.");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/uni-prep/colleges/${id}`);
      setColleges(prev => prev.filter(c => c.id !== id));
      toast.info("University removed.");
    } catch (e) {
      toast.error("Failed to remove university.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative h-full flex flex-col">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/app/college-prep">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ultimate Universal College List</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Globe className="h-4 w-4" /> Global admissions tracker with smart AI matching
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Bot className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
          <Input 
            placeholder="Type university name to let Gemini AI parse its requirements..." 
            className="pl-10 h-14 bg-card border-primary/20 focus-visible:ring-primary shadow-sm text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if(e.key === "Enter") handleAiParse(); }}
          />
        </div>
        <Button onClick={handleAiParse} disabled={loadingAi} className="h-14 px-8 gap-2 shrink-0">
          {loadingAi ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          Parse & Add
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-14 gap-2 shrink-0">
              <Settings2 className="h-5 w-5" /> Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Toggle Columns</h4>
              {COLUMNS.map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <Checkbox 
                    id={c.id} 
                    checked={visibleCols[c.id]} 
                    onCheckedChange={() => toggleCol(c.id)} 
                  />
                  <label htmlFor={c.id} className="text-sm cursor-pointer">{c.label}</label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <BentoCard className="flex-1 overflow-hidden flex flex-col p-0">
        <div className="overflow-x-auto w-full">
          <Table className="w-full text-left min-w-[1200px]">
             <TableHeader className="bg-muted/40 sticky top-0 z-10 box-border border-b">
              <TableRow>
                <TableHead className="w-[280px] p-4 text-foreground font-semibold">University</TableHead>
                <TableHead className="p-4 text-foreground font-semibold">Chances</TableHead>
                {visibleCols.country && <TableHead className="p-4 whitespace-nowrap">Country</TableHead>}
                {visibleCols.ar && <TableHead className="p-4 whitespace-nowrap">Accepted %</TableHead>}
                {visibleCols.rank && <TableHead className="p-4 whitespace-nowrap">Rank</TableHead>}
                {visibleCols.sat && <TableHead className="p-4 whitespace-nowrap">SAT (Avg)</TableHead>}
                {visibleCols.alevel && <TableHead className="p-4 whitespace-nowrap">A-Level</TableHead>}
                {visibleCols.ib && <TableHead className="p-4 whitespace-nowrap">IB</TableHead>}
                {visibleCols.ielts && <TableHead className="p-4 whitespace-nowrap">IELTS</TableHead>}
                {visibleCols.cost && <TableHead className="p-4 whitespace-nowrap">Tuition</TableHead>}
                {visibleCols.aid && <TableHead className="p-4 whitespace-nowrap">Fin Aid</TableHead>}
                {visibleCols.deadline && <TableHead className="p-4 whitespace-nowrap">RD Deadline</TableHead>}
                <TableHead className="p-4 text-right">Checklist</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                   <TableCell colSpan={COLUMNS.length + 3} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                   </TableCell>
                </TableRow>
              ) : colleges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 3} className="h-24 text-center text-muted-foreground italic">
                    Add universities above via AI parser to populate your list.
                  </TableCell>
                </TableRow>
              ) : colleges.map(c => {
                const chance = calculateChance(c);
                return (
                  <TableRow key={c.id} className="hover:bg-muted/10 group">
                    <TableCell className="p-4">
                      <div className="font-semibold truncate max-w-[260px]">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-sm ${c.status === 'Submitted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted'}`}>
                          {c.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <Badge className={`px-3 py-1 font-bold whitespace-nowrap ${getChanceColor(chance)}`}>
                        {chance}
                      </Badge>
                    </TableCell>
                    {visibleCols.country && <TableCell className="p-4">{c.country}</TableCell>}
                    {visibleCols.ar && <TableCell className="p-4">{c.acceptanceRate}%</TableCell>}
                    {visibleCols.rank && <TableCell className="p-4 font-mono">#{c.globalRank}</TableCell>}
                    {visibleCols.sat && <TableCell className="p-4 font-mono font-medium">{c.sat}</TableCell>}
                    {visibleCols.alevel && <TableCell className="p-4 font-mono">{c.alevel}</TableCell>}
                    {visibleCols.ib && <TableCell className="p-4 font-mono">{c.ib}</TableCell>}
                    {visibleCols.ielts && <TableCell className="p-4 font-mono">{c.ielts}</TableCell>}
                    {visibleCols.cost && <TableCell className="p-4">${c.cost.toLocaleString()}</TableCell>}
                    {visibleCols.aid && (
                      <TableCell className="p-4">
                        {c.financialAid ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    )}
                    {visibleCols.deadline && <TableCell className="p-4">{c.regularDecision}</TableCell>}
                    <TableCell className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 px-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <FileCheck className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-4 mr-10" align="end">
                            <h4 className="font-semibold mb-3 border-b pb-2">Required Documents</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex gap-2 items-center"><CheckSquare className="h-4 w-4 text-primary" /> Application Form</li>
                              <li className="flex gap-2 items-center"><CheckSquare className="h-4 w-4 text-primary" /> Official Transcript</li>
                              <li className="flex gap-2 items-center"><CheckSquare className="h-4 w-4 text-primary" /> 2 Recommendation Letters</li>
                              <li className="flex gap-2 items-center"><CheckSquare className="h-4 w-4 text-primary" /> Personal Statement</li>
                              {c.country === "USA" && <li className="flex gap-2 items-center"><CheckSquare className="h-4 w-4 text-primary" /> SAT/ACT Score</li>}
                              {c.financialAid && <li className="flex gap-2 items-center"><CheckSquare className="h-4 w-4 text-primary" /> CSS Profile / Fin Aid form</li>}
                            </ul>
                          </PopoverContent>
                        </Popover>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Plus className="h-4 w-4 rotate-45" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </BentoCard>
      
    </div>
  );
}
