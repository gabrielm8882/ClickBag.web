
'use server';

/**
 * @fileOverview Admin-only functions for managing users and submissions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, runTransaction } from 'firebase/firestore';

const ADMIN_EMAIL = "click.bag.sp@gmail.com";
const POINTS_PER_TREE = 10;
const TREES_PER_VALIDATION = 1;


// Helper function to check for admin privileges
const ensureAdmin = (context: any) => {
  if (!context.auth || context.auth.email !== ADMIN_EMAIL) {
    throw new Error('You must be an admin to perform this action.');
  }
};

const DeleteSubmissionInputSchema = z.string().describe("The ID of the submission document to delete.");
export type DeleteSubmissionInput = z.infer<typeof DeleteSubmissionInputSchema>;

export const deleteSubmission = ai.defineFlow(
  {
    name: 'deleteSubmission',
    inputSchema: DeleteSubmissionInputSchema,
    outputSchema: z.void(),
  },
  async (submissionId, context) => {
    ensureAdmin(context);

    try {
      await runTransaction(db, async (transaction) => {
        const submissionRef = doc(db, 'submissions', submissionId);
        const submissionDoc = await transaction.get(submissionRef);

        if (!submissionDoc.exists()) {
          throw new Error('Submission not found.');
        }

        const submissionData = submissionDoc.data();
        const userId = submissionData.userId;
        const pointsToReverse = submissionData.points;
        const treesToReverse = submissionData.status === 'Approved' ? TREES_PER_VALIDATION : 0;

        // 1. Reverse user stats if they exist
        if (userId) {
            const userRef = doc(db, 'users', userId);
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const newTotalPoints = Math.max(0, (userData.totalPoints || 0) - pointsToReverse);
                const newTotalTrees = Math.floor(newTotalPoints / POINTS_PER_TREE);
                transaction.update(userRef, {
                    totalPoints: newTotalPoints,
                    totalTrees: newTotalTrees
                });
            }
        }
        
        // 2. Reverse community stats if the submission was approved
        if (treesToReverse > 0) {
            const communityStatsRef = doc(db, 'community-stats', 'global');
            const communityStatsDoc = await transaction.get(communityStatsRef);
            
            if (communityStatsDoc.exists()) {
                const communityData = communityStatsDoc.data();
                const newCommunityPoints = Math.max(0, (communityData.totalClickPoints || 0) - pointsToReverse);
                const newCommunityTrees = Math.max(0, (communityData.totalTreesPlanted || 0) - treesToReverse);
                transaction.update(communityStatsRef, {
                    totalClickPoints: newCommunityPoints,
                    totalTreesPlanted: newCommunityTrees
                });
            }
        }

        // 3. Delete the submission
        transaction.delete(submissionRef);
      });
    } catch (e) {
      console.error('Transaction failed: ', e);
      throw new Error(e instanceof Error ? e.message : 'Failed to delete submission.');
    }
  }
);


const UpdateUserPointsInputSchema = z.object({
    userId: z.string().describe("The ID of the user to update."),
    newTotalPoints: z.number().int().min(0).describe("The new total points for the user."),
});
export type UpdateUserPointsInput = z.infer<typeof UpdateUserPointsInputSchema>;


export const updateUserPoints = ai.defineFlow(
    {
        name: 'updateUserPoints',
        inputSchema: UpdateUserPointsInputSchema,
        outputSchema: z.void(),
    },
    async ({ userId, newTotalPoints }, context) => {
        ensureAdmin(context);

        const userRef = doc(db, 'users', userId);
        const newTotalTrees = Math.floor(newTotalPoints / POINTS_PER_TREE);
        
        const batch = writeBatch(db);
        batch.update(userRef, {
            totalPoints: newTotalPoints,
            totalTrees: newTotalTrees,
        });

        await batch.commit();
    }
);
