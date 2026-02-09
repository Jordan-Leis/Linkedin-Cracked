"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ParsedProfile, ParsedExperience, ParsedEducation, ParsedSkill } from "@/lib/pdf-parser";

interface ImportReviewProps {
  parsed: ParsedProfile;
  onSaved: () => void;
  onCancel: () => void;
}

function toDateInput(ym: string | null): string {
  if (!ym) return "";
  // "YYYY-MM" -> "YYYY-MM-01"
  return ym.length === 7 ? `${ym}-01` : ym;
}

export function ImportReview({ parsed, onSaved, onCancel }: ImportReviewProps) {
  const [headline, setHeadline] = useState(parsed.headline || "");
  const [experiences, setExperiences] = useState<ParsedExperience[]>(parsed.experiences);
  const [education, setEducation] = useState<ParsedEducation[]>(parsed.education);
  const [skills, setSkills] = useState<ParsedSkill[]>(parsed.skills);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateExperience = (idx: number, field: keyof ParsedExperience, value: string | null) => {
    setExperiences((prev) =>
      prev.map((exp, i) => (i === idx ? { ...exp, [field]: value } : exp))
    );
  };

  const removeExperience = (idx: number) => {
    setExperiences((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateEducation = (idx: number, field: keyof ParsedEducation, value: string | null) => {
    setEducation((prev) =>
      prev.map((edu, i) => (i === idx ? { ...edu, [field]: value } : edu))
    );
  };

  const removeEducation = (idx: number) => {
    setEducation((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeSkill = (idx: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);

    try {
      // Save headline
      if (headline) {
        const res = await fetch("/api/profile/headline", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headline }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to save headline");
          return;
        }
      }

      // Save experiences
      if (experiences.length > 0) {
        const res = await fetch("/api/profile/experiences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            experiences: experiences.map((exp, i) => ({
              company: exp.company,
              title: exp.title,
              start_date: toDateInput(exp.start_date),
              end_date: exp.end_date ? toDateInput(exp.end_date) : null,
              location: exp.location || null,
              description: exp.description || null,
              sort_order: i,
            })),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to save experiences");
          return;
        }
      }

      // Save education
      if (education.length > 0) {
        const res = await fetch("/api/profile/education", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            education: education.map((edu) => ({
              institution: edu.institution,
              degree: edu.degree || null,
              field_of_study: edu.field_of_study || null,
              start_date: edu.start_date ? toDateInput(edu.start_date) : null,
              end_date: edu.end_date ? toDateInput(edu.end_date) : null,
            })),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to save education");
          return;
        }
      }

      // Save skills
      if (skills.length > 0) {
        const res = await fetch("/api/profile/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skills: skills.map((s, i) => ({
              name: s.name,
              sort_order: i,
            })),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to save skills");
          return;
        }
      }

      onSaved();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Review Imported Data</CardTitle>
        <CardDescription>
          Edit or remove entries before saving. You can always change these later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {parsed.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            {parsed.warnings.map((w, i) => (
              <p key={i} className="text-sm text-yellow-800 dark:text-yellow-200">{w}</p>
            ))}
          </div>
        )}

        {/* Headline */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Headline</label>
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Your headline"
            maxLength={200}
          />
        </div>

        {/* Experiences */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            Experiences ({experiences.length})
          </h3>
          {experiences.map((exp, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={exp.company}
                    onChange={(e) => updateExperience(i, "company", e.target.value)}
                    placeholder="Company"
                  />
                  <Input
                    value={exp.title}
                    onChange={(e) => updateExperience(i, "title", e.target.value)}
                    placeholder="Title"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-destructive"
                  onClick={() => removeExperience(i)}
                >
                  Remove
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {exp.start_date} &mdash; {exp.end_date || "Present"}
                {exp.location && ` | ${exp.location}`}
              </div>
            </div>
          ))}
          {experiences.length === 0 && (
            <p className="text-sm text-muted-foreground">No experiences yet.</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setExperiences((prev) => [
                ...prev,
                { company: "", title: "", start_date: "", end_date: null, location: null, description: null },
              ])
            }
          >
            + Add Experience
          </Button>
        </div>

        {/* Education */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            Education ({education.length})
          </h3>
          {education.map((edu, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Input
                    value={edu.institution}
                    onChange={(e) => updateEducation(i, "institution", e.target.value)}
                    placeholder="Institution"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-destructive"
                  onClick={() => removeEducation(i)}
                >
                  Remove
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {edu.degree && <span>{edu.degree}</span>}
                {edu.field_of_study && <span> - {edu.field_of_study}</span>}
                {edu.start_date && (
                  <span> | {edu.start_date} &mdash; {edu.end_date || "Present"}</span>
                )}
              </div>
            </div>
          ))}
          {education.length === 0 && (
            <p className="text-sm text-muted-foreground">No education yet.</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setEducation((prev) => [
                ...prev,
                { institution: "", degree: null, field_of_study: null, start_date: null, end_date: null },
              ])
            }
          >
            + Add Education
          </Button>
        </div>

        {/* Skills */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            Skills ({skills.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 border rounded-full px-3 py-1 text-sm"
              >
                {skill.name}
                <button
                  className="text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => removeSkill(i)}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          {skills.length === 0 && (
            <p className="text-sm text-muted-foreground">No skills yet.</p>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill..."
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    setSkills((prev) => [...prev, { name: val }]);
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save All"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
