export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <main aria-label="Authentication">{children}</main>
    </div>
  );
}
