
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Leaf, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { cn } from '@/lib/utils';


export function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    return names.map((n) => n[0]).join('');
  };

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} passHref>
        <SheetClose asChild>
            <Button variant="ghost" className="justify-start w-full text-left md:w-auto md:justify-center md:text-sm md:font-medium md:text-muted-foreground md:transition-colors md:hover:text-primary md:hover:bg-transparent md:px-0">
                {children}
            </Button>
        </SheetClose>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        
        {/* Left Section: Mobile Menu Trigger & Desktop Logo */}
        <div className="flex items-center">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Open Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="pr-0">
                    <SheetHeader>
                      <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
                      <SheetDescription className="sr-only">Navigation links for ClickBag.</SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-col gap-4 py-6">
                        <Link href="/" className="flex items-center space-x-2 mb-4" passHref>
                           <SheetClose asChild>
                             <div className="flex items-center space-x-2 pl-4">
                                <Leaf className="h-6 w-6 text-accent" />
                                <span className="font-bold">ClickBag</span>
                             </div>
                           </SheetClose>
                        </Link>
                        
                        <div className="flex flex-col gap-2 pr-4">
                            {user && (
                                <>
                                   <NavLink href="/dashboard">Dashboard</NavLink>
                                   <NavLink href="/upload">Upload</NavLink>
                                </>
                            )}
                            <NavLink href="/sponsors">Sponsors</NavLink>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
            <Link href="/" className="hidden md:flex items-center space-x-2 mr-6">
                <Leaf className="h-6 w-6 text-accent" />
                <span className="font-bold">ClickBag</span>
            </Link>
        </div>
        
        {/* Center Section: Mobile Logo & Desktop Nav */}
        <div className="flex-1 flex justify-center md:justify-start">
            <Link href="/" className="flex md:hidden items-center space-x-2">
                <Leaf className="h-6 w-6 text-accent" />
                <span className="font-bold">ClickBag</span>
            </Link>

            <nav className="hidden md:flex flex-1 items-center space-x-6">
                {user && (
                  <>
                    <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                      Dashboard
                    </Link>
                    <Link href="/upload" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                      Upload
                    </Link>
                  </>
                )}
                <Link href="/sponsors" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                      Sponsors
                </Link>
            </nav>
        </div>

        {/* Right Section: User Auth */}
        <div className="flex items-center">
          {user ? (
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/dashboard" passHref>
                  <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Register</Button>
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
