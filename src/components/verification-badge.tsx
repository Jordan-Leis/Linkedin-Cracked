import { VERIFICATION_EXPIRY_DAYS } from "@/lib/constants";

interface VerificationBadgeProps {
  verifyStatus?: string | null;
  verifiedAt?: string | null;
  method?: string | null;
}

export function VerificationBadge({
  verifyStatus,
  verifiedAt,
  method,
}: VerificationBadgeProps) {
  if (verifyStatus !== "verified" || !verifiedAt) return null;

  // Check if expired (query-time check)
  const verifiedDate = new Date(verifiedAt);
  const expiryDate = new Date(
    verifiedDate.getTime() + VERIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );
  if (new Date() > expiryDate) return null;

  const dateStr = verifiedDate.toLocaleDateString();
  const title = `Verified on ${dateStr} via ${method || "unknown"}`;

  return (
    <span
      className="inline-flex items-center text-green-600 dark:text-green-400"
      title={title}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
        aria-label="Verified"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
