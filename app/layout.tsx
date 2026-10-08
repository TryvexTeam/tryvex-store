import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ProveedorBolsa } from "@/components/tienda/bolsa";
import { urlSitio } from "@/lib/sitio";
import { ContenedorNotificaciones } from "@/components/notificaciones";
import { MetaPixel, MetaPixelSinScript } from "@/components/meta-pixel";

// Geist es la tipografía de la marca Tryvex (misma que la landing corporativa).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Con esto, la imagen de vista previa y los enlaces canónicos salen con el dominio
  // de la tienda y no con el de la vista previa de Vercel.
  metadataBase: new URL(urlSitio()),
  title: {
    default: "Tryvex Store",
    template: "%s — Tryvex",
  },
  description:
    "Tienda online chilena de tecnología: audífonos, iPhone, relojes, parlantes, cámaras, proyectores y cargadores, con envío a todo Chile y garantía de 6 meses.",
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
        {/* Avisos (Sileo): el código pesado solo se descarga cuando hay algo que avisar. */}
        <ContenedorNotificaciones />
        {/* Meta Pixel: PageView en cada ruta; los demás eventos los dispara cada acción (lib/meta-pixel.ts). */}
        <MetaPixel />
        <MetaPixelSinScript />
      </body>
    </html>
  );
}
