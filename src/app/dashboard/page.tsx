
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, Timestamp } from 'firebase/firestore';
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
import { Coins, Leaf, Target, ShieldCheck, Crown } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
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

interface Submission {
  id: string;
  date: Timestamp;
  geolocation: string;
  points: number;
  status: 'Approved' | 'Rejected';
}

const DAILY_GOAL = 3; // 3 trees per day

function AnimatedCounter({ endValue }: { endValue: number }) {
  const [count, setCount] = useState(0);
  const prevEndValueRef = useRef(0);

  useEffect(() => {
    const startValue = prevEndValueRef.current;
    let startTime: number;
    const duration = 1500; // ms

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const current = Math.min(startValue + (progress / duration) * (endValue - startValue), endValue);
      setCount(Math.floor(current));

      if (progress < duration) {
        requestAnimationFrame(step);
      } else {
        setCount(endValue);
        prevEndValueRef.current = endValue;
      }
    };

    requestAnimationFrame(step);

    return () => {
      prevEndValueRef.current = endValue;
    }
  }, [endValue]);

  return <>{count.toLocaleString()}</>;
}


export default function DashboardPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [dailyTrees, setDailyTrees] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [progressValue, setProgressValue] = useState(0);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

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

  useEffect(() => {
    if (user) {
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      const q = query(collection(db, 'submissions'), where('userId', '==', user.uid));
      const unsubscribeSubmissions = onSnapshot(q, (querySnapshot) => {
        const userSubmissions: Submission[] = [];
        let todayTreeCount = 0;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const submission = {
                id: doc.id,
                date: data.date,
                geolocation: data.geolocation || 'N/A',
                points: data.points,
                status: data.status,
            } as Submission;
            userSubmissions.push(submission);

            const submissionDate = submission.date.toDate();
            if (submissionDate >= startOfToday && submissionDate <= endOfToday && submission.status === 'Approved') {
                todayTreeCount += 1;
            }
        });
        setSubmissions(userSubmissions.sort((a, b) => b.date.toMillis() - a.date.toMillis()));
        setDailyTrees(todayTreeCount);
        setPageLoading(false);
      });
      
      return () => {
        unsubscribeSubmissions();
      };
    }
  }, [user]);

  useEffect(() => {
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
              Welcome to ClickBag! Please note that photos you upload are temporarily stored for validation and project-related purposes. We are committed to your privacy and only gather data you explicitly provide and agree to.
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
          {userData.totalPoints > 0 && (
             <motion.div
                className="flex items-center gap-2 text-accent bg-accent/10 px-3 py-1 rounded-full"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <motion.div
                  whileHover={{ rotate: [-5, 5, -2, 2, 0], filter: 'drop-shadow(0 0 4px hsl(var(--accent)))' }}
                  transition={{ duration: 0.5 }}
                >
                  <Crown className="h-5 w-5" />
                </motion.div>
                <h2 className="font-headline text-lg font-semibold">
                  ClickBag Contributor
                </h2>
              </motion.div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total ClickPoints</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter endValue={userData.totalPoints} />
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
                <AnimatedCounter endValue={userData.totalTrees} />
              </div>
              <p className="text-xs text-muted-foreground">
                Thanks to your points!
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submission history</CardTitle>
            <CardDescription>
              A log of your recent purchase and receipt uploads.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{format(submission.date.toDate(), 'PPP')}</TableCell>
                    <TableCell>{submission.geolocation}</TableCell>
                    <TableCell className="text-right">{submission.points}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          submission.status === 'Approved'
                            ? 'default'
                            : 'destructive'
                        }
                        className={submission.status === 'Approved' ? 'bg-green-500/20 text-green-700 border-green-500/20' : ''}
                      >
                        {submission.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
