import * as React from "react"
import { View, Text } from "react-native"
import * as Slot from "@rn-primitives/slot"
import { cva, type VariantProps } from "class-variance-authority"

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type BadgeProps = React.ComponentProps<typeof View> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const classes = cn(badgeVariants({ variant }), className)
  return asChild ? (
    <Slot.View data-slot="badge" className={classes} {...(props as any)} />
  ) : (
    <View data-slot="badge" className={classes} {...props} />
  )
}

export { Badge, badgeVariants }

