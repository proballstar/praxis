import "./globals.css";
export const metadata = {
  title: "Praxis — Calm in the kitchen",
  description:
    "Kitchen preparation and delivery pickup coordination for restaurant merchants.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
