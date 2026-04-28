"use client";

import React from "react";
import {
  XCircle,
  ShieldX,
  MapPinOff,
  UserX,
  CarFront,
  Clock,
  FileWarning,
  MessageSquareX,
  FlaskConicalOff,
  ArrowRight,
  Mail,
  Phone,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DriverRejection } from "@/lib/api/types";

// Map icon names from config to actual Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  UserX,
  MapPinOff,
  CarFront,
  ShieldX,
  FlaskConicalOff,
  FileWarning,
  MessageSquareX,
  Clock,
};

interface RejectionScreenProps {
  rejection: DriverRejection;
  driverName: string;
  onRetry?: () => void;
}

export function RejectionScreen({ rejection, driverName, onRetry }: RejectionScreenProps) {
  const isRecoverable = rejection.recoverable;

  // Format the rejection date
  const rejectedDate = new Date(rejection.rejectedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const IconComponent = ICON_MAP[rejection.reason] || XCircle;

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-8 text-center">
      {/* Icon */}
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-full ${
          isRecoverable
            ? "bg-amber-100 dark:bg-amber-900/30"
            : "bg-destructive/10"
        }`}
      >
        {isRecoverable ? (
          <CarFront className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        ) : (
          <XCircle className="h-10 w-10 text-destructive" />
        )}
      </div>

      {/* Heading */}
      <div className="max-w-lg">
        <h2 className="text-2xl font-bold text-foreground">
          {isRecoverable ? "Action Required" : "Application Not Approved"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {isRecoverable
            ? `Hi ${driverName}, there's an issue with your application that you may be able to resolve.`
            : `Hi ${driverName}, after reviewing your application, we're unable to move forward at this time.`}
        </p>
      </div>

      {/* Reason Card */}
      <div
        className={`w-full max-w-lg rounded-xl border p-6 text-left ${
          isRecoverable
            ? "border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20"
            : "border-destructive/20 bg-destructive/5"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
              isRecoverable
                ? "bg-amber-100 dark:bg-amber-900/40"
                : "bg-destructive/10"
            }`}
          >
            {isRecoverable ? (
              <CarFront
                className="h-5 w-5 text-amber-600 dark:text-amber-400"
              />
            ) : (
              <IconComponent className="h-5 w-5 text-destructive" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`text-sm font-semibold ${
                  isRecoverable
                    ? "text-amber-800 dark:text-amber-300"
                    : "text-destructive"
                }`}
              >
                {rejection.reason}
              </h3>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  rejection.type === "auto"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {rejection.type === "auto" ? "Automatic" : "Manual Review"}
              </span>
            </div>
            <p
              className={`mt-2 text-sm leading-relaxed ${
                isRecoverable
                  ? "text-amber-700/80 dark:text-amber-300/70"
                  : "text-muted-foreground"
              }`}
            >
              {rejection.description}
            </p>
            {rejection.rejectedBy && (
              <p className="mt-3 text-xs text-muted-foreground">
                Reviewed by {rejection.rejectedBy}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Decision date: {rejectedDate}
            </p>
          </div>
        </div>
      </div>

      {/* Recovery CTA for vehicle-recoverable */}
      {isRecoverable && rejection.retryCtaLabel && onRetry && (
        <div className="w-full max-w-lg">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Have a different vehicle?
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  If you have access to another vehicle that meets our
                  requirements (2015 or newer), you can update your vehicle
                  information and resubmit for review.
                </p>
              </div>
            </div>
            <Button
              className="mt-4 w-full gap-2"
              size="lg"
              onClick={onRetry}
            >
              {rejection.retryCtaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Support Contact -- always shown */}
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium text-foreground text-left">
          Need help or have questions?
        </p>
        <p className="mt-1 text-xs text-muted-foreground text-left leading-relaxed">
          If you believe this decision was made in error or need further clarification, our support team is here to help.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-1 bg-transparent"
            asChild
          >
            <a href="mailto:support@wingz.com">
              <Mail className="h-3.5 w-3.5" />
              Email Support
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-1 bg-transparent"
            asChild
          >
            <a href="tel:+18001234567">
              <Phone className="h-3.5 w-3.5" />
              Call Support
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
