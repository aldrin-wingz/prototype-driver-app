'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '@/lib/utils'
// ⚠️ SHARED-FILE DIVERGENCE — see the phone-frame note below. Remove at fold-in.
import { usePhoneShell } from '@/components/solutions-dev/phone-shell'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => {
  /**
   * ⚠️ SHARED-FILE DIVERGENCE — contains this surface in the desktop phone
   * frame. A portal escapes every ancestor, including the transform that makes
   * the frame a containing block, so without it this renders across the whole
   * window beside the app rather than inside it. `null` below the breakpoint,
   * which is `document.body` — exactly the behaviour before this existed.
   * ⛔ Remove at fold-in; the base has no phone frame.
   */
  const shell = usePhoneShell()
  return (
  <PopoverPrimitive.Portal container={shell}>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
  )
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
