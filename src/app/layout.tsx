import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NOMBRE_SITIO, SUBTITULO_SITIO } from "@/lib/sitio";
import Encabezado from "./Encabezado";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${NOMBRE_SITIO} · ${SUBTITULO_SITIO}`,
  description: "Gestión docente e institucional para unidades educativas del Ecuador",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Encabezado />
        {children}
      </body>
    </html>
  );
}
