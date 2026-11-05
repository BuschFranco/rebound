import Script from "next/script";

const PIXEL_ID = "LUUeDv4nLQy2ebraDk2jL8";

/** Solo en producción, igual que Google Tag Manager: el dev server no manda eventos. */
const enabled = process.env.NODE_ENV === "production";

/** Pixel de OpenAI (oaiq). Next lo pone en el <head> y lo carga sin frenar la página. */
export function OpenAIPixelScript() {
  if (!enabled) return null;
  return (
    <Script id="oaiq" strategy="afterInteractive">
      {`!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:"${PIXEL_ID}",debug:true});`}
    </Script>
  );
}
