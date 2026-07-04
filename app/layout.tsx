import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IzdeMe — AI Career Agent",
  description: "Describe your dream job. IzdeMe matches you to live hh.kz vacancies with an explainable Fit Score.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='32' y2='32' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%237c5cff'/%3E%3Cstop offset='1' stop-color='%234d8dff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='7' fill='url(%23g)'/%3E%3Cg fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 7 L7 11.5 L16 16 L25 11.5 Z' fill='%23fff'/%3E%3Cpath d='M7 16 L16 20.5 L25 16' opacity='.85'/%3E%3Cpath d='M7 20.5 L16 25 L25 20.5' opacity='.6'/%3E%3C/g%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
