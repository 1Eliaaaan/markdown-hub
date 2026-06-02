import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarkdownHub — Organize your ideas",
  description:
    "A beautiful Markdown file manager. Create projects, organize folders, write documents, and share them instantly.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
