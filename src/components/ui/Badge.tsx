import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "pending" | "awaiting_approval" | "in_progress" | "ready_for_dispatch" | "loaded" | "delivered" | "rejected" | "on_hold";
}

function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  let variantClass = "";
  switch (variant) {
    case "secondary":
      variantClass = "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80";
      break;
    case "destructive":
      variantClass = "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80";
      break;
    case "outline":
      variantClass = "text-foreground";
      break;
    case "pending":
    case "awaiting_approval":
      variantClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
      break;
    case "in_progress":
      variantClass = "bg-blue-100 text-blue-800 border-blue-200";
      break;
    case "ready_for_dispatch":
      variantClass = "bg-purple-100 text-purple-800 border-purple-200";
      break;
    case "loaded":
      variantClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
      break;
    case "delivered":
      variantClass = "bg-green-100 text-green-800 border-green-200";
      break;
    case "rejected":
      variantClass = "bg-red-100 text-red-800 border-red-200";
      break;
    case "on_hold":
      variantClass = "bg-orange-100 text-orange-800 border-orange-200";
      break;
    default:
      variantClass = "border-transparent bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/80";
  }

  const combinedClassName = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClass} ${className}`.trim();

  return (
    <div className={combinedClassName} {...props} />
  )
}

export { Badge }
