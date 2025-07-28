
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
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
  date: any; 
  status: 'Approved' | 'Rejected';
  points: number;
  validationDetails: string;
  geolocation: string;
  userName?: string; 
}

interface CommunityStats {
    totalTreesPlanted: number;
    totalClickPoints: number;
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
  const [communityStats, setCommunityStats] = useState<CommunityStats>({ totalClickPoints: 0, totalTreesPlanted: 0 });

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        router.push('/login');
      } else {
        setPageLoading(false); 
      }
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      // Fetch Community Stats
      const statsUnsubscribe = onSnapshot(doc(db, 'community-stats', 'global'), (doc) => {
        if (doc.exists()) {
            setCommunityStats(doc.data() as CommunityStats);
        }
      });

      // Fetch Users and create a map for submissions
      const usersQuery = query(collection(db, 'users'), orderBy('totalPoints', 'desc'));
      const usersUnsubscribe = onSnapshot(usersQuery, (usersSnapshot) => {
        const usersData: FullUserData[] = [];
        const userMap = new Map<string, string>();
        
        usersSnapshot.forEach((doc) => {
          const data = doc.data() as UserData;
          usersData.push({ id: doc.id, ...data });
          userMap.set(doc.id, data.displayName || 'Unknown User');
        });
        setUsers(usersData);

        // Fetch Submissions and map user names
        const submissionsQuery = query(collection(db, 'submissions'), orderBy('date', 'desc'));
        const submissionsUnsubscribe = onSnapshot(submissionsQuery, (submissionsSnapshot) => {
          const submissionsData: Submission[] = submissionsSnapshot.docs.map(doc => {
            const data = doc.data();
            const userName = userMap.get(data.userId) || 'DelAco'; // Default to 'DelAco' if user not found
            return {
              id: doc.id,
              userName,
              ...data,
            } as Submission;
          });
          setSubmissions(submissionsData);
        });

        return () => submissionsUnsubscribe();
      }, (error) => {
        console.error("Error fetching users:", error);
      });

      return () => {
        statsUnsubscribe();
        usersUnsubscribe();
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
    return null; 
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center gap-4 mb-8">
        <Shield className="h-10 w-10 text-accent" />
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
                <AnimatedCounter endValue={communityStats.totalClickPoints} />
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
                <AnimatedCounter endValue={communityStats.totalTreesPlanted} />
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
                    {users.length > 0 ? users.map((u) => (
                    <TableRow key={u.id}>
                        <TableCell>
                            <div className="font-medium">{u.displayName}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{u.totalPoints}</TableCell>
                        <TableCell className="text-right font-mono">{u.totalTrees}</TableCell>
                    </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">No users yet.</TableCell>
                      </TableRow>
                    )}
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
                    {submissions.length > 0 ? submissions.map((submission) => (
                    <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.userName}</TableCell>
                        <TableCell>{submission.date ? format(submission.date.toDate(), 'PPp') : 'N/A'}</TableCell>
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
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">No submissions yet.</TableCell>
                      </TableRow>
                    )}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        </motion.div>
      </div>
    </div>
  );
}
