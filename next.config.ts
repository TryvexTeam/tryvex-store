import type { NextConfig } from 'next'

/**
 * El host de Storage sale de la propia variable de entorno: escribirlo a mano
 * obligaría a tocar este archivo al cambiar de proyecto Supabase, y el fallo
 * aparecería recién en producción, como una imagen rota.
 */
const hostSupabase = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
})()

const nextConfig: NextConfig = {
  // Fija la raiz del rastreo de archivos. Sin esto, Turbopack busca hacia
  // arriba el lockfile mas alto, encuentra el del sitio estatico de la raiz y
  // el de la carpeta de usuario, e infiere una raiz equivocada: el build sale
  // inconsistente y en el servidor pueden faltar archivos.
  turbopack: { root: __dirname },

  // Cabeceras de seguridad. Una tienda que cobra no puede ser enmarcable: sin
  // frame-ancestors, el checkout y el login del panel se pueden incrustar en
  // un sitio ajeno y superponerle controles falsos.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
  // El indicador flotante de desarrollo se sienta justo sobre la esquina
  // inferior izquierda, que en móvil es donde vive el formulario. Los errores
  // de compilación y de ejecución se siguen mostrando igual.
  devIndicators: false,

  images: {
    // Solo el bucket público de este proyecto. Sin esta lista, `next/image`
    // sería un proxy abierto a cualquier host que le pidan.
    remotePatterns: hostSupabase
      ? [
          {
            protocol: 'https',
            hostname: hostSupabase,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
    // Las fotos de catálogo se sirven como miniatura y como imagen grande;
    // no hace falta generar tamaños intermedios que nadie pide.
    imageSizes: [64, 128, 256, 384],
    formats: ['image/webp'],
  },
}

export default nextConfig
