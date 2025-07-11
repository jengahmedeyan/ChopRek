import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React from "react";

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  description: string;
  titleClassName?: string;
  iconClassName?: string;
}

function mergeClassNames(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  icon,
  value,
  description,
  titleClassName = "text-xs lg:text-sm font-medium",
  iconClassName = "h-4 w-4 text-muted-foreground",
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className={titleClassName}>{title}</CardTitle>
      {icon && React.isValidElement(icon)
        ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
            className: mergeClassNames((icon.props as any).className, iconClassName),
          })
        : icon}
    </CardHeader>
    <CardContent>
      <div className="text-xl lg:text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

export default StatCard;
