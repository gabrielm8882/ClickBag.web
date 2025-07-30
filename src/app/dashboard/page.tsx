
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, Timestamp, orderBy } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Coins, Leaf, Target, ShieldCheck, Crown, PartyPopper, CheckCircle, XCircle, Eye } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LeafLoader } from '@/components/ui/leaf-loader';
import type { UserData } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';


interface Submission {
  id: string;
  date: Timestamp;
  geolocation: string;
  points: number;
  status: 'Approved' | 'Rejected';
  validationDetails: string;
}

const DAILY_GOAL = 2; // 2 trees per day
const USER_MAX_TREES = 20;

function AnimatedCounter({ endValue }: { endValue: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 1500; // ms

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const current = Math.min((progress / duration) * endValue, endValue);
      setCount(Math.floor(current));

      if (progress < duration) {
        requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };
    
    const animationFrame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [endValue]);

  return <>{count.toLocaleString()}</>;
}


export default function DashboardPage() {
  const { user, userData, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [dailyTrees, setDailyTrees] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [progressValue, setProgressValue] = useState(0);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [showLimitReached, setShowLimitReached] = useState(false);
  const { toast } = useToast();
  

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    const isNewUser = sessionStorage.getItem('isNewUser');
    if (isNewUser) {
      setShowPrivacyNotice(true);
      sessionStorage.removeItem('isNewUser');
    }
  }, []);

  const totalPoints = userData?.totalPoints || 0;
  const totalTrees = userData?.totalTrees || 0;
  const maxTrees = userData?.maxTrees || USER_MAX_TREES;


  useEffect(() => {
    // Check if the user has reached the limit and hasn't seen the notification yet.
    if (!isAdmin && totalTrees >= maxTrees && !sessionStorage.getItem('limitNotified')) {
        setShowLimitReached(true);
        sessionStorage.setItem('limitNotified', 'true');
    }
  }, [totalTrees, maxTrees, isAdmin]);


  useEffect(() => {
    if (user) {
      setPageLoading(true);

      const today = new Date();
      const startOfToday = startOfDay(today);

      const q = query(
        collection(db, 'submissions'),
        where('userId', '==', user.uid)
      );
      
      const unsubscribeSubmissions = onSnapshot(q, (querySnapshot) => {
        let userSubmissions: Submission[] = [];
        let todayTreeCount = 0;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const submission = {
                id: doc.id,
                ...data,
            } as Submission;
            userSubmissions.push(submission);

            const submissionDate = submission.date.toDate();
            if (submissionDate >= startOfToday && submission.status === 'Approved') {
                todayTreeCount += 1;
            }
        });

        // Sort submissions by date on the client-side
        userSubmissions.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
        
        setSubmissions(userSubmissions);
        setDailyTrees(todayTreeCount);
        setPageLoading(false);
      }, (error) => {
          console.error("Error fetching submissions:", error);
          setPageLoading(false);
      });
      
      return () => {
        unsubscribeSubmissions();
      };
    }
  }, [user]);

  useEffect(() => {
    setProgressValue(0);
    const newProgress = Math.min((dailyTrees / DAILY_GOAL) * 100, 100);
    const animationTimeout = setTimeout(() => setProgressValue(newProgress), 100);
    return () => clearTimeout(animationTimeout);
  }, [dailyTrees]);

  const handleClosePrivacyNotice = () => {
    setShowPrivacyNotice(false);
  };

  if (loading || pageLoading || !user || !userData) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <LeafLoader />
        <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <>
       {showLimitReached && <Confetti width={window.innerWidth} height={window.innerHeight} />}
       <AlertDialog open={showLimitReached} onOpenChange={(isOpen) => { if (!isOpen) setShowLimitReached(false)}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <PartyPopper className="h-16 w-16 text-accent"/>
            </div>
            <AlertDialogTitle className="text-center font-headline text-2xl">
              You're a Tree-Planting Champion!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              Wow! You've reached the limit of {maxTrees} planted trees. Your impact is incredible, and we're so grateful.
              <br/><br/>
              To continue planting more trees with your ClickBag, please contact us for a free account upgrade.
              <br/><br/>
              DM us on Instagram: <a href="https://www.instagram.com/click_bag_" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">@click_bag_</a>
              <br/>
              Or email: <a href="mailto:click.bag.sp@gmail.com" className="font-semibold text-accent hover:underline">click.bag.sp@gmail.com</a>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowLimitReached(false)} className="w-full">
              Got it!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPrivacyNotice} onOpenChange={handleClosePrivacyNotice}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <ShieldCheck className="h-16 w-16 text-orange-500"/>
            </div>
            <AlertDialogTitle className="text-center font-headline text-2xl">
              Privacy and data information
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              Welcome to ClickBag! Please note that photos you upload are temporarily stored for validation and project-related purposes. Your submission history is stored indefinitely to track your contributions and prevent fraud. We are committed to your privacy and only gather data you explicitly provide and agree to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClosePrivacyNotice} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex items-center justify-center md:justify-start gap-4 mb-8 text-center md:text-left flex-wrap">
          <h1 className="font-headline text-3xl md:text-4xl font-bold">
            Your impact dashboard
          </h1>
          {userData && totalPoints > 0 && (
             <motion.div
                className="flex items-center gap-2 text-accent bg-accent/10 px-3 py-1 rounded-full cursor-pointer"
                whileHover={{ scale: 1.03, transition: { duration: 0.2, ease: 'easeInOut' } }}
              >
                <motion.div
                  whileHover={{ rotate: [-8, 5, -5, 2, 0], filter: 'drop-shadow(0 0 4px hsl(var(--accent) / 0.6))', transition: { duration: 0.4, ease: 'easeInOut' } }}
                >
                  <Crown className="h-5 w-5" />
                </motion.div>
                <h2 className="font-headline text-lg font-semibold">
                  ClickBag Contributor
                </h2>
              </motion.div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total ClickPoints</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter endValue={totalPoints} />
              </div>
              <p className="text-xs text-muted-foreground">
                Your lifetime contribution
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trees planted</CardTitle>
              <Leaf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter endValue={totalTrees} />
              </div>
              <p className="text-xs text-muted-foreground">
                Thanks to your points! ({maxTrees} max)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily goal ({dailyTrees}/{DAILY_GOAL} Trees)</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressValue.toFixed(0)}%</div>
              <Progress value={progressValue} className="mt-2 [&>div]:bg-accent" />
            </CardContent>
          </Card>
          {isAdmin && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>Admin Tools</span>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                 <CardDescription className="text-xs pt-1">Quick admin actions.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                 <Button variant="outline" size="sm" className="w-full" onClick={() => setShowLimitReached(true)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview Limit Pop-up
                 </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submission history</CardTitle>
            <CardDescription>
              A log of your recent purchase and receipt uploads. Click a row to see details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <Dialog key={submission.id}>
                      <DialogTrigger asChild>
                         <TableRow className="cursor-pointer">
                          <TableCell className="font-medium">{format(submission.date.toDate(), 'PPP')}</TableCell>
                          <TableCell>{submission.geolocation}</TableCell>
                          <TableCell className="text-right">{submission.points}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={submission.status === 'Approved' ? 'default' : 'destructive'}
                              className={cn(
                                submission.status === 'Approved' 
                                  ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                              )}
                            >
                               {submission.status === 'Approved' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                               {submission.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Submission Details</DialogTitle>
                          <DialogDescription>
                            {format(submission.date.toDate(), 'PPP, p')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 py-4">
                           <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">AI Validation:</span> {submission.validationDetails}</p>
                           <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Location:</span> {submission.geolocation}</p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
