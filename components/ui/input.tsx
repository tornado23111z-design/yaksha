import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-full border border-[#5c3a4a] bg-[#120e18] px-4 py-2 text-sm font-medium text-white caret-white shadow-inner placeholder:text-zinc-300 placeholder:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff001e]/90 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
