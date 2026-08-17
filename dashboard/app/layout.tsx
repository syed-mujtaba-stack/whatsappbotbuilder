import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BotFlow — WhatsApp AI Agent",
  description: "Build and deploy AI-powered WhatsApp bots in minutes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a1d27",
              color: "#e8eaf0",
              border: "1px solid #2a2f45",
              borderRadius: "10px",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#22c55e", secondary: "#1a1d27" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#1a1d27" } },
          }}
        />
      </body>
    </html>
  );
}
