import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Council — Among Us Sandbox",
  description: "Watch AI council members deliberate in real-time",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#0a0a1a",
          color: "#ffffff",
          fontFamily: "'Courier New', monospace",
          overflow: "hidden",
        }}
      >
        {children}
      </body>
    </html>
  );
}
