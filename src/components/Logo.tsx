import { BrandLogo } from "./BrandLogo";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const width = { sm: 180, md: 240, lg: 320 }[size];
  return (
    <div className="flex flex-col items-center">
      <BrandLogo width={width} className="mx-auto" />
    </div>
  );
}
