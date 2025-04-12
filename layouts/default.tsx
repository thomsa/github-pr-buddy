import { Head } from "./head";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentYear = new Date().getFullYear();
  const yearRange = currentYear > 2025 ? `2025 – ${currentYear}` : "2025";

  return (
    <div className="relative flex flex-col h-screen">
      <Head />
      <main className="container mx-auto max-w-7xl px-6 flex-grow pt-16">
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-3 flex-col">
        <p className="text-sm text-center">
          GitHub PR Buddy is an open-source project. You can run it on your own
          environment.
        </p>
        <p className="text-xs">
          <time dateTime="2025">{yearRange}</time>
        </p>
      </footer>
    </div>
  );
}
