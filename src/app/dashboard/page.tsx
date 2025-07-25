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
import { Coins, Leaf, Target } from 'lucide-react';

const MOCK_SUBMISSIONS = [
  { date: '2024-05-20', store: 'Green Grocer', points: 120, status: 'Approved' },
  { date: '2024-05-18', store: 'Eco Goods', points: 85, status: 'Approved' },
  { date: '2024-05-15', store: 'SuperMart', points: 0, status: 'Rejected' },
  { date: '2024-05-12', store: 'Local Market', points: 150, status: 'Approved' },
  { date: '2024-05-10', store: 'The Corner Store', points: 45, status: 'Approved' },
];

const TOTAL_POINTS = 400;
const POINTS_PER_TREE = 100;
const TREES_PLANTED = Math.floor(TOTAL_POINTS / POINTS_PER_TREE);
const PROGRESS_TO_NEXT_TREE = (TOTAL_POINTS % POINTS_PER_TREE) * 100 / POINTS_PER_TREE;

export default function DashboardPage() {
  return (
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
            <div className="text-2xl font-bold">{TOTAL_POINTS.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{TREES_PLANTED}</div>
            <p className="text-xs text-muted-foreground">
              Thanks to your points!
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress to Next Tree</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{PROGRESS_TO_NEXT_TREE.toFixed(0)}%</div>
            <Progress value={PROGRESS_TO_NEXT_TREE} className="mt-2" />
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
                <TableHead>Store</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_SUBMISSIONS.map((submission, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{submission.date}</TableCell>
                  <TableCell>{submission.store}</TableCell>
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
  );
}
