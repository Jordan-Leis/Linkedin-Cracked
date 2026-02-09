"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VerificationStatus {
  status: string;
  verified_count: number | null;
  verified_at: string | null;
  method: string | null;
  expires_at: string | null;
  days_until_expiry: number | null;
  expiring_soon: boolean;
  pending_screenshots: { id: string; uploaded_at: string; review_status: string }[];
}

interface VerifyResult {
  status: string;
  verified_count?: number;
  self_reported_count?: number;
  discrepancy_percent?: number;
  within_tolerance?: boolean;
  prompt_update?: boolean;
  message?: string;
  reason?: string;
  suggest_manual?: boolean;
}

export function VerificationPanel() {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [consented, setConsented] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [updatingCount, setUpdatingCount] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/verification-status");
      if (res.ok) {
        const data = await res.json();
        setVerificationStatus(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleVerify = async () => {
    if (!consented) {
      setError("You must consent to follower verification.");
      return;
    }
    setError("");
    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch("/api/profile/verify-followers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed.");
        return;
      }

      setVerifyResult(data);
      fetchStatus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleUpdateCount = async () => {
    setUpdatingCount(true);
    setError("");

    try {
      const res = await fetch("/api/profile/verify-followers/update-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ use_verified_count: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update count.");
        return;
      }

      setVerifyResult(null);
      fetchStatus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUpdatingCount(false);
    }
  };

  // Screenshot upload for manual verification
  const handleScreenshotUpload = async (file: File, claimedCount: number) => {
    setError("");
    setVerifying(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("claimed_count", String(claimedCount));

      const res = await fetch("/api/profile/verify-followers/manual", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }

      setVerifyResult({ status: "pending_manual", message: data.message });
      fetchStatus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return null;
  }

  const status = verificationStatus?.status;
  const isVerified = status === "verified" && (verificationStatus?.days_until_expiry ?? 0) > 0;
  const isExpired = status === "expired" || (status === "verified" && (verificationStatus?.days_until_expiry ?? 0) <= 0);
  const isPending = status === "pending_manual";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Follower Verification</CardTitle>
        <CardDescription>
          Verify your LinkedIn follower count to earn a verification badge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current status */}
        {isVerified && verificationStatus && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
              Verified: {verificationStatus.verified_count?.toLocaleString()} followers
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              via {verificationStatus.method} on{" "}
              {verificationStatus.verified_at
                ? new Date(verificationStatus.verified_at).toLocaleDateString()
                : "unknown"}
            </p>
            {verificationStatus.expiring_soon && (
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 font-medium">
                Your verification expires in {verificationStatus.days_until_expiry} days. Re-verify now.
              </p>
            )}
          </div>
        )}

        {isExpired && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              Verification expired. Re-verify to restore your badge.
            </p>
          </div>
        )}

        {isPending && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Screenshot verification pending review.
            </p>
          </div>
        )}

        {/* Verification result */}
        {verifyResult && verifyResult.status === "verified" && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3 space-y-2">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
              Verification successful!
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Verified: {verifyResult.verified_count?.toLocaleString()} followers
              (reported: {verifyResult.self_reported_count?.toLocaleString()})
            </p>
            {verifyResult.prompt_update && (
              <div className="space-y-2 mt-2">
                <p className="text-sm">{verifyResult.message}</p>
                <Button
                  size="sm"
                  onClick={handleUpdateCount}
                  disabled={updatingCount}
                >
                  {updatingCount ? "Updating..." : "Update My Count"}
                </Button>
              </div>
            )}
          </div>
        )}

        {verifyResult && verifyResult.status === "failed" && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{verifyResult.reason}</p>
            {verifyResult.suggest_manual && (
              <ManualUpload onUpload={handleScreenshotUpload} disabled={verifying} />
            )}
          </div>
        )}

        {/* Verify action */}
        {!verifyResult && (!isVerified || isExpired || verificationStatus?.expiring_soon) && !isPending && (
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I consent to LinkedIn-Cracked visiting my public LinkedIn profile to verify my follower count.
              </span>
            </label>
            <Button
              onClick={handleVerify}
              disabled={verifying || !consented}
              className="w-full"
            >
              {verifying ? "Verifying..." : isExpired ? "Re-verify" : "Verify My Follower Count"}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function ManualUpload({
  onUpload,
  disabled,
}: {
  onUpload: (file: File, count: number) => void;
  disabled: boolean;
}) {
  const [claimedCount, setClaimedCount] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && claimedCount) {
      onUpload(file, parseInt(claimedCount));
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-medium">Upload a screenshot instead:</p>
      <input
        type="number"
        min="0"
        placeholder="Your follower count"
        value={claimedCount}
        onChange={(e) => setClaimedCount(e.target.value)}
        className="w-full border rounded px-3 py-1.5 text-sm"
      />
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFile}
        disabled={disabled || !claimedCount}
        className="text-sm"
      />
    </div>
  );
}
