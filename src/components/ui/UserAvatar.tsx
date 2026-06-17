"use client";

type Props = {
  name?: string | null;
  email?: string;
  image?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  online?: boolean;
  className?: string;
};

const SIZES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

const DOT_SIZES = {
  xs: "h-2 w-2 border",
  sm: "h-2.5 w-2.5 border-2",
  md: "h-2.5 w-2.5 border-2",
  lg: "h-3 w-3 border-2",
};

function initials(name?: string | null, email?: string): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return base[0]?.toUpperCase() || "?";
}

export function UserAvatar({
  name,
  email,
  image,
  size = "md",
  online,
  className = "",
}: Props) {
  const dim = SIZES[size];

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {image ? (
        <span className={`${dim} overflow-hidden rounded-full`}>
          <img
            src={image}
            alt={name || email || "User"}
            className="h-full w-full object-cover"
          />
        </span>
      ) : (
        <span
          className={`${dim} flex items-center justify-center rounded-full bg-[#5D3A8C] font-bold text-white`}
        >
          {initials(name, email)}
        </span>
      )}
      {online && (
        <span
          className={`absolute bottom-0 right-0 ${DOT_SIZES[size]} rounded-full border-white bg-green-500`}
          title="Online"
        />
      )}
    </span>
  );
}
