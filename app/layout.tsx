import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ProveedorBolsa } from "@/components/tienda/bolsa";

// Geist es la tipografía de la marca Tryvex (misma que la landing corporativa).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tryvex Store",
    template: "%s — Tryvex",
  },
  description: "Tecnología y productos para explorar por categoría en Tryvex Store.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CL"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* La bolsa acompaña toda la navegación: portada, colección, ficha y checkout. */}
        <ProveedorBolsa>{children}</ProveedorBolsa>
      </body>
    </html>
  );
}
