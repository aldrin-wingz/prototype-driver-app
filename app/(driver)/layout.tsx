import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Wingz Driver",
  description: "Wingz NEMT Driver App",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1F2937",
};

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {children}
    </div>
  );
}
