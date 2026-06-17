import { HelpTip } from "@/components/ui/HelpTip";

export function PageHeader({
  title,
  description,
  help,
  action,
}: {
  title: string;
  description?: string;
  help?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1
            className="text-2xl font-bold text-[#5D3A8C] md:text-3xl"
            style={{ fontFamily: "var(--font-libre)" }}
          >
            {title}
          </h1>
          {help && <HelpTip text={help} />}
        </div>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
