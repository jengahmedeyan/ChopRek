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
  titleClassName = "text-xs sm:text-sm font-medium",
  iconClassName = "h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground",
}) => (
  <Card className="shadow-sm h-full">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
      <CardTitle className={mergeClassNames(titleClassName, "truncate pr-2")}>{title}</CardTitle>
      {icon && React.isValidElement(icon)
        ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
            className: mergeClassNames((icon.props as any).className, iconClassName, "shrink-0"),
          })
        : icon}
    </CardHeader>
    <CardContent className="p-3 sm:p-4 pt-0">
      <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold break-words min-h-[32px] sm:min-h-[36px] lg:min-h-[40px] flex items-center">{value}</div>
      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 min-h-[28px] sm:min-h-[32px]" title={description}>{description}</p>
    </CardContent>
  </Card>
);

export default StatCard;
