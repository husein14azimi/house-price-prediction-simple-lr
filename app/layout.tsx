import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "House Price Prediction (Simple Linear Regression)",
  description:
    "A client-side educational app for predicting house prices using simple linear regression.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
