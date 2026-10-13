'use client'

import * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'

import { cn } from '@/lib/utils'
// ⚠️ SHARED-FILE DIVERGENCE — see `portalTarget` below. Remove at fold-in.
import { usePhoneShell } from '@/components/solutions-dev/phone-shell'

/**
 * Where a drawer renders.
 *
 * ⛔⛔ A drawer is `position: fixed` inside a portal, and a portal escapes every
 * ancestor — including the transform that makes the desktop phone frame a
 * containing block. So on a wide screen an untreated support form opened at
 * **1440px across the whole window** instead of inside the phone. Measured:
 * `[0, 900, 1440, 792]`, parented to `document.body`.
 *
 * `"phone"` is the default because almost every drawer here is the DRIVER's.
 * `"viewport"` is for tooling that belongs to the page rather than the app —
 * there is exactly one, and a check asserts that.
 *
 * ⚠️ Below the breakpoint `usePhoneShell()` is `null`, which vaul reads as
 * `document.body`. Identical to the behaviour before any of this existed.
 */
type DrawerPortalTarget = 'phone' | 'viewport'

const Drawer = ({
  shouldScaleBackground = true,
  portalTarget = 'phone',
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root> & {
  portalTarget?: DrawerPortalTarget
}) => {
  const shell = usePhoneShell()
  const container = portalTarget === 'phone' ? shell : null
  return (
    <DrawerPrimitive.Root
      shouldScaleBackground={shouldScaleBackground}
      container={container}
      /**
       * ⛔ Safari only, and it does not fail quietly. vaul's `usePositionFixed`
       * short-circuits on every other browser, but on Safari it sets
       * `document.body { position: fixed; top: -scrollY }` while a drawer is
       * open. In a two-pane desktop layout that yanks the whole page out from
       * under the feature table. The body never needed locking here anyway —
       * the frame owns its own scroll.
       */
      noBodyStyles={Boolean(container)}
      {...props}
    />
  )
}
Drawer.displayName = 'Drawer'

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/80', className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background',
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = 'DrawerContent'

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)}
    {...props}
  />
)
DrawerHeader.displayName = 'DrawerHeader'

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('mt-auto flex flex-col gap-2 p-4', className)}
    {...props}
  />
)
DrawerFooter.displayName = 'DrawerFooter'

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className,
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
