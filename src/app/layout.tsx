import type { ReactNode } from 'react';
import { PopupProvider } from '@/components/elementor/popups';
import { AppShellProvider } from '@/components/app/AppShell';
import { Runtime } from '@/components/site/Runtime';
import { Analytics } from '@/components/site/Analytics';

const ICON = '/wp-content/uploads/2020/06/cropped-wevtec-logo-new-trial-2020-v2-1';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" id="fwi-theme-color" />
        {/* dark mode before first paint */}
        <script id="fwi-theme-boot" dangerouslySetInnerHTML={{ __html: 'try{if(localStorage.getItem("fwiTheme")==="dark")document.documentElement.classList.add("fwi-dark")}catch(e){}' }} />
        <link rel="icon" href={`${ICON}-32x32.webp`} sizes="32x32" />
        <link rel="icon" href={`${ICON}-192x192.webp`} sizes="192x192" />
        <link rel="apple-touch-icon" href={`${ICON}-180x180.webp`} />
        <meta name="msapplication-TileImage" content={`${ICON}-270x270.webp`} />
      </head>
      <body suppressHydrationWarning>
        <PopupProvider>
          <AppShellProvider>
            {children}
            <Runtime />
            <Analytics />
          </AppShellProvider>
        </PopupProvider>
      </body>
    </html>
  );
}
