/* One-colour social marks (currentColor), the same set as meltcei.com. */
export type Social = "Instagram" | "Facebook" | "TikTok";

export function SocialIcon({ name, className = "size-5" }: { name: Social; className?: string }) {
  if (name === "Instagram")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-none stroke-current stroke-2 ${className}`}>
        <rect x="3" y="3" width="18" height="18" rx="5.5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="1.1" className="fill-current stroke-0" />
      </svg>
    );
  if (name === "Facebook")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-current ${className}`}>
        <path d="M13.6 21v-7.3h2.5l.4-2.9h-2.9V9c0-.8.3-1.4 1.5-1.4h1.5V5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8.2v2.9h2.5V21H4.5A1.5 1.5 0 0 1 3 19.5v-15A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v15a1.5 1.5 0 0 1-1.5 1.5Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-current ${className}`}>
      <path d="M16.6 3c.3 2.3 1.6 3.8 3.9 4v2.6c-1.4.1-2.6-.3-3.9-1.1v5.3c0 6.8-7.4 8.9-10.3 4-1.9-3.1-.7-8.6 5.4-8.8v2.8c-.5.1-1 .2-1.4.4-1.4.5-2.2 1.4-2 3 .4 3.1 6.1 4 5.6-2V3Z" />
    </svg>
  );
}
