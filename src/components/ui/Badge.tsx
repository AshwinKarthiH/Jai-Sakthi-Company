import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "pending" | "awaiting_approval" | "in_progress" | "ready_for_dispatch" | "loaded" | "delivered" | "rejected" | "on_hold" | "tax_invoice_pending";
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
      variantClass = "bg-[#D97706] text-white border-transparent";
      break;
    case "awaiting_approval":
      variantClass = "bg-[#4F46E5] text-white border-transparent";
      break;
    case "in_progress":
      variantClass = "bg-[#2563EB] text-white border-transparent";
      break;
    case "on_hold":
      variantClass = "bg-[#EA580C] text-white border-transparent";
      break;
    case "tax_invoice_pending":
      variantClass = "bg-[#6D28D9] text-white border-transparent";
      break;
    case "ready_for_dispatch":
      variantClass = "bg-[#0891B2] text-white border-transparent";
      break;
    case "loaded":
      variantClass = "bg-[#0D9488] text-white border-transparent";
      break;
    case "delivered":
      variantClass = "bg-[#059669] text-white border-transparent";
      break;
    case "rejected":
      variantClass = "bg-[#DC2626] text-white border-transparent";
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
