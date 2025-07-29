
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserData } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { deleteSubmission, updateUserPoints } from '@/ai/flows/admin-actions';
import { LeafLoader } from '@/components/ui/leaf-loader';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Leaf, Coins, User, Users, History, CheckCircle, XCircle, Trash2, Edit, Save, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/hooks/use-dashboard-store';


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
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const userRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  
  const [manageUser, setManageUser] = useState<FullUserData | null>(null);
  const [newPoints, setNewPoints] = useState(0);

  // Admin testing states
  const { testPoints, setTestPoints, setTestDailyTrees, resetDailyTrees, testDailyTrees } = useDashboard();
  const prevTestPointsRef = useRef<number | null>(null);


  const { toast } = useToast();

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
    if (selectedUserId && userRowRefs.current[selectedUserId]) {
      userRowRefs.current[selectedUserId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (isAdmin) {
      // Fetch Community Stats
      const statsUnsubscribe = onSnapshot(doc(db, 'community-stats', 'global'), (doc) => {
        if (doc.exists()) {
            setCommunityStats(doc.data() as CommunityStats);
        }
      });

      // Fetch Users and create a map for submissions
      const usersUnsubscribe = onSnapshot(query(collection(db, 'users'), orderBy('totalPoints', 'desc')), (usersSnapshot) => {
        const usersData: FullUserData[] = [];
        const userMap = new Map<string, string>();
        
        usersSnapshot.forEach((doc) => {
          const data = doc.data() as UserData;
          usersData.push({ id: doc.id, ...data });
          userMap.set(doc.id, data.displayName || 'Unknown User');
        });
        setUsers(usersData);

        // Fetch Submissions and map user names
        const submissionsUnsubscribe = onSnapshot(query(collection(db, 'submissions'), orderBy('date', 'desc')), (submissionsSnapshot) => {
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

   // Effect for simulating daily goal based on test points
  useEffect(() => {
    const DAILY_GOAL = 2; // Keep this consistent with the dashboard
    const prevPoints = prevTestPointsRef.current ?? 0;
    const currentPoints = testPoints ?? 0;

    const prevTrees = Math.floor(prevPoints / 10);
    const currentTrees = Math.floor(currentPoints / 10);
    
    if (currentPoints === 0) {
        resetDailyTrees();
    } else if (currentTrees > prevTrees) {
        const treesEarned = currentTrees - prevTrees;
        setTestDailyTrees(treesEarned);
    }

    if (testDailyTrees >= DAILY_GOAL) {
      resetDailyTrees();
    }
    
    prevTestPointsRef.current = currentPoints;
  }, [testPoints, setTestDailyTrees, resetDailyTrees, testDailyTrees]);


  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      await deleteSubmission(submissionId);
      toast({
        title: 'Submission Deleted',
        description: 'The submission and its associated points have been removed.',
      });
    } catch (error) {
      console.error("Error deleting submission:", error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    }
  };
  
  const handleManageUser = (userToManage: FullUserData) => {
    setManageUser(userToManage);
    setNewPoints(userToManage.totalPoints);
  };
  
  const handleUpdateUserPoints = async () => {
    if (!manageUser) return;
    try {
      await updateUserPoints({ userId: manageUser.id, newTotalPoints: newPoints });
      toast({
        title: 'User Updated',
        description: `${manageUser.displayName}'s points have been successfully updated.`,
      });
      setManageUser(null);
    } catch (error) {
      console.error("Error updating user points:", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    }
  };

  const getAdminDisplayData = () => {
    const adminUser = users.find(u => u.id === user?.uid);
    const realPoints = adminUser?.totalPoints ?? 0;
    
    const simulatedPoints = testPoints !== null ? testPoints : realPoints;
    const simulatedTrees = Math.floor(simulatedPoints / 10);
    
    return {
        totalPoints: simulatedPoints,
        totalTrees: simulatedTrees,
    };
  };


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
  
  const adminDisplayData = getAdminDisplayData();

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center gap-4 mb-8">
        <Shield className="h-10 w-10 text-accent" />
        <h1 className="font-headline text-3xl md:text-4xl font-bold">
          Admin Dashboard
        </h1>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter endValue={users.length} />
              </div>
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
            </CardContent>
          </Card>
           <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-800">Your Test Stats</CardTitle>
                    <User className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-blue-700">
                        Points: <span className="font-bold">{adminDisplayData.totalPoints.toLocaleString()}</span>, 
                        Trees: <span className="font-bold">{adminDisplayData.totalTrees.toLocaleString()}</span>
                    </p>
                </CardContent>
            </Card>
        </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
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
                <div className="overflow-auto max-h-[600px]">
                    <Table>
                    <TableHeader className="sticky top-0 bg-secondary">
                        <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead className="text-right">Trees</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length > 0 ? users.map((u) => (
                        <TableRow 
                          key={u.id}
                          ref={(el) => (userRowRefs.current[u.id] = el)}
                          className={cn({ 'bg-accent/20': selectedUserId === u.id })}
                        >
                            <TableCell>
                                <div className="font-medium">{u.displayName} {u.id === user?.uid && "(Admin)"}</div>
                                <div className="text-xs text-muted-foreground">{u.email}</div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{u.id === user?.uid ? adminDisplayData.totalPoints.toLocaleString() : (u.totalPoints || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono">{u.id === user?.uid ? adminDisplayData.totalTrees.toLocaleString() : (u.totalTrees || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-center">
                                <Button variant="ghost" size="icon" onClick={() => handleManageUser(u)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">No users yet.</TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
            </CardContent>
            </Card>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5" />
                            Admin Controls
                        </CardTitle>
                        <CardDescription>
                        Simulate your total points to test the leaderboard and daily goals. These changes are visual only.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="test-points">Test Total Points</Label>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => setTestPoints(p => Math.max(0, (p || 0) - 10))}><Minus className="h-4 w-4" /></Button>
                                <Input id="test-points" type="number" placeholder="Enter points..." value={testPoints ?? ''} onChange={(e) => setTestPoints(e.target.value === '' ? null : Number(e.target.value))} />
                                <Button variant="outline" size="icon" onClick={() => setTestPoints(p => (p || 0) + 10)}><Plus className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

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
                    <div className="overflow-auto max-h-[600px]">
                        <Table>
                        <TableHeader className="sticky top-0 bg-secondary">
                            <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.length > 0 ? submissions.map((submission) => (
                            <TableRow key={submission.id}>
                                <TableCell>
                                    <button onClick={() => setSelectedUserId(submission.userId)} className="font-medium hover:underline text-left">
                                      {submission.userName}
                                    </button>
                                </TableCell>
                                <TableCell>{submission.date ? format(submission.date.toDate(), 'PPp') : 'N/A'}</TableCell>
                                <TableCell>
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
                                <TableCell>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the submission and reverse its impact on the user and community stats. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteSubmission(submission.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                            )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">No submissions yet.</TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
                </Card>
            </div>
        </motion.div>
      </div>

       {manageUser && (
        <Dialog open={!!manageUser} onOpenChange={() => setManageUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage {manageUser.displayName}</DialogTitle>
              <DialogDescription>
                Directly update the user's total points. Trees will be recalculated.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="points">Total Points</Label>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setNewPoints(p => Math.max(0, p - 10))}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="points"
                      type="number"
                      value={newPoints}
                      onChange={(e) => setNewPoints(Number(e.target.value))}
                      className="text-center"
                    />
                     <Button variant="outline" size="icon" onClick={() => setNewPoints(p => p + 10)}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
              </div>
               <p className="text-sm text-muted-foreground text-center">
                  New tree count: {Math.floor(newPoints / 10)}
                </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setManageUser(null)}>Cancel</Button>
              <Button onClick={handleUpdateUserPoints}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

    
