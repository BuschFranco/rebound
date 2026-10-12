import Script from "next/script";

const GTM_ID = "GTM-555QBJLR";

/** Solo en producción: así las visitas del dev server no ensucian las estadísticas. */
const enabled = process.env.NODE_ENV === "production";

/** Snippet de Google Tag Manager. Next mueve el script al <head> y lo carga sin frenar la página. */
export function GoogleTagManagerScript() {
  if (!enabled) return null;
  return (
    <Script id="gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}

/** Respaldo para navegadores sin JavaScript: va al principio del <body>. */
export function GoogleTagManagerNoScript() {
  if (!enabled) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
