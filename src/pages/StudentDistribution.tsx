import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSchool } from "@/contexts/SchoolContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StudentDistribution() {
  const { t } = useTranslation();
  const { classes, addStudentToClass, removeStudentFromClass } = useSchool();
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id || "");
  const [studentName, setStudentName] = useState("");

  const currentClass = classes.find((c) => c.id === selectedClass);

  const handleAdd = () => {
    if (!studentName.trim() || !selectedClass) return;
    addStudentToClass(selectedClass, studentName.trim());
    setStudentName("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("distribution.title")}</h1>
        <p className="text-muted-foreground">{t("distribution.subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Class list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("distribution.classes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedClass === c.id ? "border-primary bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {c.studentNames.length}/{c.studentCount}
                </div>
              </button>
            ))}
            {classes.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("distribution.noClasses")}</p>
            )}
          </CardContent>
        </Card>

        {/* Student assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {currentClass ? currentClass.name : t("distribution.selectClass")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentClass ? (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder={t("distribution.studentNamePlaceholder")}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                  <Button onClick={handleAdd} size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentClass.studentNames.map((name, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {name}
                      <button
                        onClick={() => removeStudentFromClass(selectedClass, name)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {currentClass.studentNames.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("distribution.noStudents")}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t("distribution.selectClassPrompt")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
