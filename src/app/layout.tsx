import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XIMAGINE PRO | AI Video Generation Engine",
  description: "Professional AI-powered video and image generation studio powered by Grok",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body className="antialiased font-rajdhani">
        {children}
      </body>
    </html>
  );
}
