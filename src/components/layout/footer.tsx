import { Leaf } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t bg-secondary">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Leaf className="h-6 w-6 text-accent" />
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by You. The source code is available on GitHub.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">How it Works</Link>
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Dashboard</Link>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} ClickImpact</p>
        </div>
      </div>
    </footer>
  );
}
