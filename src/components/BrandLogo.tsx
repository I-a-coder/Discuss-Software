import Image from "next/image";

/** Official Yusi Discuss logo — stored in /public/assets */
export const LOGO_PATH = "/assets/yusi-discuss-logo.png";

export function BrandLogo({
  className = "",
  width = 280,
}: {
  className?: string;
  width?: number;
}) {
  const height = Math.round(width * 0.38);
  return (
    <Image
      src={LOGO_PATH}
      alt="Yusi Discuss"
      width={width}
      height={height}
      className={`object-contain object-left ${className}`}
      priority
      unoptimized
    />
  );
}
