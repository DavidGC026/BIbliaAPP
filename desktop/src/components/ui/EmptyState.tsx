import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 border-dashed py-10 text-center">
      <span className="rounded-2xl bg-primary/10 p-3 text-primary">
        <Icon name={icon} size={28} />
      </span>
      <p className="font-bold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </Card>
  );
}
