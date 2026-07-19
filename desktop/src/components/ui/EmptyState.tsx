import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function EmptyState({
  icon = "◇",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 border-dashed py-10 text-center">
      <span className="text-3xl text-primary" aria-hidden="true">
        {icon}
      </span>
      <p className="font-bold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </Card>
  );
}
