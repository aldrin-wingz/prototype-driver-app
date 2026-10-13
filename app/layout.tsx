import { Suspense } from "react";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { IncentiveEarnedProvider } from "@/lib/incentive-earned-context";
import { RideFlowProvider } from "@/lib/support-data/ride-flow-context";
import { SolutionProvider } from "@/lib/solutions/solution-context";
import { SolutionShell } from "@/components/solutions-dev/solution-shell";
import { SolutionPickerSheet } from "@/components/solutions-dev/solution-picker-sheet";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Wingz Driver",
  description: "Wingz NEMT Driver App - production mirror (prototype/driver-app-base)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-[#F9FAFB]">
      <head>
        {/* Wingz brand font (General Sans) + its sanctioned fallback (Inter),
            used by the v2 payout/wallet surfaces via the .font-wingz utility. */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${dmSans.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <IncentiveEarnedProvider>
            <RideFlowProvider>
              {/* ⚠️ `SolutionProvider` reads `useSearchParams`, which makes it a
                  dynamic client boundary. Without this Suspense every route
                  fails to prerender — and `next dev` never prerenders, so only
                  `next build` would ever tell us. */}
              <Suspense fallback={null}>
                <SolutionProvider>
                  {/* ⚠️ `Toaster` and `IncentiveEarnedPopup` used to sit out
                      here, beside the app. They are now inside `SolutionShell`
                      — both are `position: fixed`, and as SIBLINGS of
                      `{children}` no ancestor transform could ever contain
                      them, so on a wide screen they escaped the phone frame.
                      See the comment in solution-shell.tsx. */}
                  <SolutionShell>{children}</SolutionShell>
                  {/* ⛔ Stays OUTSIDE the shell. The picker is tooling — it
                      belongs to the page, not to the phone. */}
                  <SolutionPickerSheet />
                </SolutionProvider>
              </Suspense>
            </RideFlowProvider>
          </IncentiveEarnedProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
