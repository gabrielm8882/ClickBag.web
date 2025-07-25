import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-accent" />
            <span className="font-bold sm:inline-block">ClickBag</span>
          </Link>
        </div>
        <nav className="flex flex-1 items-center space-x-4">
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Dashboard
          </Link>
          <Link href="/upload" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Upload
          </Link>
        </nav>
        <div className="flex items-center justify-end space-x-4">
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/register">
            <Button>Register</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
