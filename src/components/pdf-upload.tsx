"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedProfile } from "@/lib/pdf-parser";

interface PdfUploadProps {
  onParsed: (data: ParsedProfile) => void;
}

export function PdfUpload({ onParsed }: PdfUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (file: File) => {
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      onParsed(data.parsed);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Import from LinkedIn PDF</CardTitle>
        <CardDescription>
          Go to your LinkedIn profile, click &quot;More&quot; &rarr; &quot;Save to PDF&quot;, then upload it here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          {uploading ? (
            <p className="text-muted-foreground">Parsing PDF...</p>
          ) : (
            <>
              <p className="font-medium">Drop your LinkedIn PDF here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse (max 5MB)</p>
            </>
          )}
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        <Button
          variant="outline"
          className="w-full mt-3"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "Uploading..." : "Choose PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}
