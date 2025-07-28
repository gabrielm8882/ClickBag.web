
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, getDocs, doc } from 'firebase/firestore';
import { LeafLoader } from '@/components/ui/leaf-loader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Leaf, Coins, User, Users, History, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { UserData } from '@/hooks/use-auth';
import { motion } from 'framer-motion';

interface FullUserData extends UserData {
    id: string;
}

interface Submission {
  id: string;
  userId: string;
  date: any; // Using `any` to avoid timestamp issues, will format later
  status: 'Approved' | 'Rejected';
  points: number;
  validationDetails: string;
  geolocation: string;
  userName?: string; // Will be populated later
}

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


export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  
  const [users, setUsers] = useState<FullUserData[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalTrees, setTotalTrees] = useState(0);

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        router.push('/login');
      }
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      setPageLoading(true);

      const usersQuery = query(collection(db, 'users'), orderBy('totalPoints', 'desc'));
      const submissionsQuery = query(collection(db, 'submissions'), orderBy('date', 'desc'));

      const unsubscribeUsers = onSnapshot(usersQuery, (querySnapshot) => {
        const usersData: FullUserData[] = [];
        let points = 0;
        let trees = 0;
        querySnapshot.forEach((doc) => {
          const data = doc.data() as UserData;
          usersData.push({ id: doc.id, ...data });
          points += data.totalPoints || 0;
          trees += data.totalTrees || 0;
        });
        setUsers(usersData);
        setTotalPoints(points);
        setTotalTrees(trees);
      });

      const unsubscribeSubmissions = onSnapshot(submissionsQuery, async (querySnapshot) => {
        const submissionsData: Submission[] = [];
        const userPromises = new Map<string, Promise<any>>();

        const getUserName = async (userId: string) => {
            if (!userPromises.has(userId)) {
                userPromises.set(userId, getDocs(query(collection(db, 'users'), where('__name__', '==', userId))));
            }
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));

            if (!userDoc.empty) {
                return userDoc.docs[0].data().displayName || 'Unknown User';
            }
            return 'Unknown User';
        };
        
        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            const userName = await getUserName(data.userId);
            submissionsData.push({
                id: doc.id,
                ...data,
                userName: userName,
            } as Submission);
        }
        
        setSubmissions(submissionsData);
        setPageLoading(false);
      });

      return () => {
        unsubscribeUsers();
        unsubscribeSubmissions();
      };
    }
  }, [isAdmin]);

  if (loading || pageLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <LeafLoader />
        <p className="mt-4 text-muted-foreground">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // or a dedicated "Access Denied" component
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center gap-4 mb-8">
        <Shield className="h-10 w-10 text-blue-500" />
        <h1 className="font-headline text-3xl md:text-4xl font-bold">
          Admin Dashboard
        </h1>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter endValue={users.length} />
              </div>
              <p className="text-xs text-muted-foreground">
                Registered ClickBag participants
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Community Points</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter endValue={totalPoints} />
              </div>
              <p className="text-xs text-muted-foreground">
                Total points earned by the community
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Community Trees</CardTitle>
              <Leaf className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter endValue={totalTrees} />
              </div>
              <p className="text-xs text-muted-foreground">
                Total trees planted by the community
              </p>
            </CardContent>
          </Card>
        </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Leaderboard
                </CardTitle>
                <CardDescription>
                All registered users, ranked by total points.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Trees</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((u) => (
                    <TableRow key={u.id}>
                        <TableCell>
                            <div className="font-medium">{u.displayName}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{u.totalPoints}</TableCell>
                        <TableCell className="text-right font-mono">{u.totalTrees}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Global Submission History
                </CardTitle>
                <CardDescription>
                A log of every submission from all users.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.userName}</TableCell>
                        <TableCell>{format(submission.date.toDate(), 'PPp')}</TableCell>
                        <TableCell>
                            <Badge
                                variant={submission.status === 'Approved' ? 'default' : 'destructive'}
                                className={submission.status === 'Approved' ? 'bg-green-500/20 text-green-700 border-green-500/20' : ''}
                            >
                                {submission.status === 'Approved' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                {submission.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        </motion.div>
      </div>
    </div>
  );
}

