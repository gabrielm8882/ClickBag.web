
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Leaf, LogOut, User as UserIcon, Menu, Crown, Shield, PartyPopper } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { cn } from '@/lib/utils';

const USER_MAX_TREES = 20;

export function Header() {
  const { user, userData, signOut, isAdmin } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    return names.map((n) => n[0]).join('');
  };

  const handleUploadClick = () => {
    // Admins are never blocked
    if (isAdmin) {
      router.push('/upload');
      return;
    }
    
    // Regular user check
    const userMax = userData?.maxTrees || USER_MAX_TREES;
    if (userData && userData.totalTrees >= userMax) {
      setShowLimitDialog(true);
    } else {
      router.push('/upload');
    }
  };

  const NavLink = ({ href, children, onClick }: { href?: string; children: React.ReactNode; onClick?: () => void }) => (
     <SheetClose asChild>
        {href ? (
             <Link href={href} passHref>
                <Button variant="ghost" className="justify-start w-full text-left md:w-auto md:justify-center md:text-sm md:font-medium md:text-muted-foreground md:transition-colors md:hover:text-primary md:hover:bg-transparent md:px-0">
                    {children}
                </Button>
            </Link>
        ) : (
            <Button onClick={onClick} variant="ghost" className="justify-start w-full text-left md:w-auto md:justify-center md:text-sm md:font-medium md:text-muted-foreground md:transition-colors md:hover:text-primary md:hover:bg-transparent md:px-0">
                {children}
            </Button>
        )}
    </SheetClose>
  );

  return (
    <>
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
                                   <NavLink onClick={() => { setIsMobileMenuOpen(false); handleUploadClick(); }}>Upload</NavLink>
                                </>
                            )}
                             {isAdmin && <NavLink href="/admin">Admin</NavLink>}
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
                     <button onClick={handleUploadClick} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                      Upload
                    </button>
                  </>
                )}
                {isAdmin && (
                  <Link href="/admin" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                      Admin
                  </Link>
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
                <div className="flex items-center gap-2 cursor-pointer">
                   {isAdmin ? (
                       <Shield className="h-5 w-5 text-accent -mr-1" />
                   ) : userData && userData.totalPoints > 0 && (
                      <Crown className="h-5 w-5 text-accent" />
                   )}
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-offset-background ring-offset-2 ring-accent">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </div>
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
                {isAdmin && (
                  <Link href="/admin" passHref>
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                <Link href="/dashboard" passHref>
                  <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
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

    <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <PartyPopper className="h-16 w-16 text-accent"/>
            </div>
            <AlertDialogTitle className="text-center font-headline text-2xl">
              You've Reached the Summit!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
               Congratulations! You have reached your current contribution limit. Your impact is amazing, and we're thrilled to have you in our community. Stay tuned for future updates on how you can contribute even more!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowLimitDialog(false)} className="w-full">
              I'm a Champion!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
