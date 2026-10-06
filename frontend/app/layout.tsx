import type { Metadata } from "next";
import { Syne, Outfit, DM_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400","600","700","800"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300","400","500","600","700"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400","500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SihaIQ RCM — Intelligence artificielle pour les hôpitaux marocains",
  description: "Prédiction IA des rejets CNOPS/CNSS/FAR, tableau de bord financier temps réel, file de travail intelligente. Plateforme RCM souveraine et conforme CNDP.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${syne.variable} ${outfit.variable} ${dmMono.variable}`}>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}