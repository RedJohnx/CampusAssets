import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Assets",
  description: "Created by Kamal Karteek U",
  generator: "Kamal Karteek U",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
