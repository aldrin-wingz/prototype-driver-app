import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { IncentiveEarnedProvider } from "@/lib/incentive-earned-context";
import { IncentiveEarnedPopup } from "@/components/driver/incentive-earned-popup";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Wingz Driver",
  description: "Wingz NEMT Driver App - Driver Incentives Prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-[#F9FAFB]">
      <body className={`${dmSans.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <IncentiveEarnedProvider>
            {children}
            <IncentiveEarnedPopup />
          </IncentiveEarnedProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
