import type { Metadata } from "next";
import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Prana Earth Predict Platform",
  description: "AI-powered climate risk intelligence platform",
};

export default function PredictLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${manrope.variable} font-[family-name:var(--font-manrope)]`}>
      {children}
    </div>
  );
}