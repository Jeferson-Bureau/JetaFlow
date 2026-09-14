import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JetaFlow",
  description: "Sistema de gestão da JETAPRINT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
