
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserData } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, Timestamp } from 'firebase/firestore';
import { deleteSubmissionAction, updateUserPointsAction, extendUserTreeLimitAction } from '@/lib/admin-actions';
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
import { Shield, Leaf, Coins, User, Users, History, CheckCircle, XCircle, Trash2, Edit, Save, Plus, Minus, ArrowUpRight, Award } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


interface FullUserData extends UserData {
    id: string;
    maxTrees?: number;
}

interface Submission {
  id: string;
  userId: string;
  date: Timestamp; 
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
  
  // State for the user management dialog
  const [manageUser, setManageUser] = useState<FullUserData | null>(null);
  const [pointsAdjustment, setPointsAdjustment] = useState(0);
  const [newMaxTrees, setNewMaxTrees] = useState(20);

  // State for the user history dialog
  const [historyUser, setHistoryUser] = useState<FullUserData | null>(null);

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
      const statsUnsubscribe = onSnapshot(doc(db, 'community-stats', 'global'), (doc) => {
        if (doc.exists()) {
            setCommunityStats(doc.data() as CommunityStats);
        }
      });

      const usersUnsubscribe = onSnapshot(query(collection(db, 'users'), orderBy('totalPoints', 'desc')), (usersSnapshot) => {
        const usersData: FullUserData[] = [];
        const userMap = new Map<string, string>();
        
        usersSnapshot.forEach((doc) => {
          const data = doc.data() as UserData;
          usersData.push({ id: doc.id, ...data });
          userMap.set(doc.id, data.displayName || 'Unknown User');
        });
        setUsers(usersData);

        const submissionsUnsubscribe = onSnapshot(query(collection(db, 'submissions'), orderBy('date', 'desc')), (submissionsSnapshot) => {
          const submissionsData: Submission[] = submissionsSnapshot.docs.map(doc => {
            const data = doc.data();
            const userName = userMap.get(data.userId) || 'Anonymous';
            return {
              id: doc.id,
              userName,
              date: data.date,
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

  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      await deleteSubmissionAction(submissionId);
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
    setPointsAdjustment(0);
    setNewMaxTrees(userToManage.maxTrees || 20);
  };
  
  const handleUpdateUser = async () => {
    if (!manageUser || !user) return;
    try {
      let updated = false;

      // Points update
      if (pointsAdjustment !== 0) {
        const currentPoints = manageUser.totalPoints || 0;
        const newTotalPoints = Math.max(0, currentPoints + pointsAdjustment);
        await updateUserPointsAction({ userId: manageUser.id, newTotalPoints });
        toast({
          title: 'User Points Updated',
          description: `${manageUser.displayName}'s points have been successfully updated.`,
        });
        updated = true;
      }

      // Limit update
      if (newMaxTrees !== (manageUser.maxTrees || 20)) {
        await extendUserTreeLimitAction({ userId: manageUser.id, newLimit: newMaxTrees });
         toast({
          title: 'User Limit Updated',
          description: `${manageUser.displayName}'s tree limit is now ${newMaxTrees}.`,
        });
        updated = true;
      }

      if (updated) {
        setManageUser(null);
      } else {
        toast({
            title: 'No Changes',
            description: 'No changes were made to the user.',
        });
      }

    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    }
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
  
  const userSubmissions = historyUser ? submissions.filter(s => s.userId === historyUser.id) : [];

  const adminUser = users.find(u => u.id === user?.uid);
  const otherUsers = users.filter(u => u.id !== user?.uid);
  const sortedUsers = adminUser ? [adminUser, ...otherUsers] : users;

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
                        {sortedUsers.length > 0 ? sortedUsers.map((u) => (
                        <TableRow 
                          key={u.id}
                          ref={(el) => (userRowRefs.current[u.id] = el)}
                          className={cn({
                            'bg-accent/20': selectedUserId === u.id,
                            'bg-orange-50 dark:bg-orange-950/50': u.id === user?.uid
                          })}
                        >
                            <TableCell>
                                <div className={cn("font-medium", { 'text-orange-600 dark:text-orange-400': u.id === user?.uid})}>
                                  {u.displayName} {u.id === user?.uid && "(Admin)"}
                                </div>
                                <div className={cn("text-xs text-muted-foreground", { 'text-orange-500 dark:text-orange-500': u.id === user?.uid})}>
                                  {u.email}
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{(u.totalPoints || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono">{(u.totalTrees || 0).toLocaleString()}</TableCell>
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
                Adjust points, extend tree limits, or view submission history.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid gap-6">
                <div className="space-y-3">
                    <Label>Adjust Points (in intervals of 10)</Label>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setPointsAdjustment(p => p - 10)}>
                            <Minus className="h-4 w-4" />
                        </Button>
                        <div className="flex-1 text-center font-bold text-lg p-2 border rounded-md">
                           {pointsAdjustment > 0 ? '+' : ''}{pointsAdjustment}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => setPointsAdjustment(p => p + 10)}>
                           <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                     <p className="text-sm text-muted-foreground text-center">
                        Current Points: {manageUser.totalPoints || 0} &rarr; New Total: {Math.max(0, (manageUser.totalPoints || 0) + pointsAdjustment)}
                    </p>
                </div>
                <div className="space-y-3">
                    <Label htmlFor="max-trees">Extend Tree Limit</Label>
                     <Input
                      id="max-trees"
                      type="number"
                      placeholder="Enter new tree limit"
                      value={newMaxTrees}
                      onChange={(e) => setNewMaxTrees(Math.max(0, Number(e.target.value)))}
                    />
                    <p className="text-sm text-muted-foreground text-center">
                        Default limit is 20.
                    </p>
                </div>
            </div>
            <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-none sm:flex">
               <Button variant="secondary" onClick={() => { setHistoryUser(manageUser); setManageUser(null); }}>
                    <History className="mr-2 h-4 w-4" /> View History
                </Button>
                <Button onClick={handleUpdateUser}>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Changes
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {historyUser && (
         <Dialog open={!!historyUser} onOpenChange={() => setHistoryUser(null)}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Submission History for {historyUser.displayName}</DialogTitle>
                    <DialogDescription>
                        A complete log of this user's submissions.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Points</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {userSubmissions.length > 0 ? userSubmissions.map(sub => (
                                <TableRow key={sub.id}>
                                    <TableCell>{format(sub.date.toDate(), 'Pp')}</TableCell>
                                    <TableCell>
                                        <Badge variant={sub.status === 'Approved' ? 'default' : 'destructive'} className={cn(sub.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200')}>
                                            {sub.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{sub.points}</TableCell>
                                    <TableCell className="text-xs max-w-xs truncate">{sub.validationDetails}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">No submissions found for this user.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setHistoryUser(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      )}

    </div>
  );
}
