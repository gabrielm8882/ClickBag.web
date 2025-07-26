
'use client';

import { useEffect, useState } from 'react';
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
import { Coins, Leaf, Target, ShieldCheck } from 'lucide-react';
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

interface Submission {
  id: string;
  date: Timestamp;
  geolocation: string;
  points: number;
  status: 'Approved' | 'Rejected';
}

interface UserData {
  totalPoints: number;
  totalTrees: number;
}

const DAILY_GOAL = 3; // 3 trees per day

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userData, setUserData] = useState<UserData>({ totalPoints: 0, totalTrees: 0 });
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
    if (user) {
        const isNewUser = sessionStorage.getItem('isNewUser');
        if (isNewUser === 'true') {
            setShowPrivacyNotice(true);
        }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      // Listener for user's submissions
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

            // Check for daily progress
            const submissionDate = submission.date.toDate();
            if (submissionDate >= startOfToday && submissionDate <= endOfToday && submission.status === 'Approved') {
                todayTreeCount += 1;
            }
        });
        setSubmissions(userSubmissions.sort((a, b) => b.date.toMillis() - a.date.toMillis()));
        setDailyTrees(todayTreeCount);
        setPageLoading(false);
      });

      // Listener for user's aggregate data
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeUserData = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
        }
      });
      
      return () => {
        unsubscribeSubmissions();
        unsubscribeUserData();
      };
    }
  }, [user]);

  useEffect(() => {
    const newProgress = Math.min((dailyTrees / DAILY_GOAL) * 100, 100);
    const animationTimeout = setTimeout(() => setProgressValue(newProgress), 100); // Small delay for animation
    return () => clearTimeout(animationTimeout);
  }, [dailyTrees]);

  const handleClosePrivacyNotice = () => {
    setShowPrivacyNotice(false);
    sessionStorage.removeItem('isNewUser');
  };

  if (loading || pageLoading || !user) {
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
              Privacy and Data Information
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              Welcome to ClickBag! Please note that photos you upload are temporarily stored for validation and project-related purposes. We are committed to your privacy and only gather data you explicitly provide and agree to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClosePrivacyNotice} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container mx-auto py-8 px-4 md:px-6">
        <h1 className="font-headline text-3xl md:text-4xl font-bold mb-8">
          Your Impact Dashboard
        </h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total ClickPoints</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userData.totalPoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Your lifetime contribution
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trees Planted</CardTitle>
              <Leaf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userData.totalTrees}</div>
              <p className="text-xs text-muted-foreground">
                Thanks to your points!
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Goal ({dailyTrees}/{DAILY_GOAL} Trees)</CardTitle>
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
            <CardTitle>Submission History</CardTitle>
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
