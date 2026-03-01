"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

// Modern Jumia-style overlay with smooth backdrop
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Modern responsive dialog content with Jumia-inspired design
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Base positioning and sizing
        "fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)]",
        "max-w-2xl translate-x-[-50%] translate-y-[-50%]",
        
        // Modern styling
        "rounded-xl sm:rounded-2xl bg-white shadow-lg sm:shadow-2xl",
        "border border-gray-100",
        
        // Animations
        "duration-300",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        
        // Mobile responsive max-height
        "max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]",
        "overflow-hidden flex flex-col",
        
        className,
      )}
      {...props}
    >
      {children}
      
      {/* Close button - top right with smooth interaction */}
      <DialogPrimitive.Close
        className={cn(
          "absolute right-4 sm:right-6 top-4 sm:top-6",
          "p-1 rounded-lg transition-all duration-200",
          "hover:bg-gray-100 hover:text-gray-900 text-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
          "z-50",
        )}
      >
        <X className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="sr-only">Close dialog</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

// Header with clean spacing
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6",
      "border-b border-gray-100",
      "bg-white",
      className,
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

// Scrollable body - handles overflow
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6",
      "bg-white",
      className,
    )}
    {...props}
  />
)
DialogBody.displayName = "DialogBody"

// Footer with action buttons
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex-shrink-0 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5",
      "border-t border-gray-100 bg-white",
      "flex flex-col-reverse sm:flex-row items-center justify-end gap-3",
      className,
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

// Modern title with better typography
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900",
      "tracking-tight leading-tight",
      className,
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

// Subtle, readable description
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      "text-sm sm:text-base text-gray-600 mt-2",
      "leading-relaxed",
      className,
    )}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
