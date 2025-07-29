
'use server';

/**
 * @fileOverview Admin-only functions for managing users and submissions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, runTransaction, collection } from 'firebase/firestore';

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
    auth: (auth) => { // Auth policy to ensure only admins can run this
        if (!auth || auth.email !== ADMIN_EMAIL) {
            throw new Error("You must be an admin to perform this action.");
        }
    }
  },
  async (submissionId) => {
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
        auth: (auth) => { // Auth policy to ensure only admins can run this
            if (!auth || auth.email !== ADMIN_EMAIL) {
                throw new Error("You must be an admin to perform this action.");
            }
        }
    },
    async ({ userId, newTotalPoints }) => {
        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', userId);
                const communityStatsRef = doc(db, 'community-stats', 'global');

                const userDoc = await transaction.get(userRef);
                const communityStatsDoc = await transaction.get(communityStatsRef);

                if (!userDoc.exists()) {
                    throw new Error("User not found.");
                }

                // Calculate the difference in points
                const currentUserPoints = userDoc.data().totalPoints || 0;
                const pointDifference = newTotalPoints - currentUserPoints;
                const newTotalTrees = Math.floor(newTotalPoints / POINTS_PER_TREE);

                // Update user's points and trees
                transaction.update(userRef, {
                    totalPoints: newTotalPoints,
                    totalTrees: newTotalTrees
                });

                // Update community stats with the point difference
                if (communityStatsDoc.exists()) {
                    const currentCommunityPoints = communityStatsDoc.data().totalClickPoints || 0;
                    const newCommunityPoints = Math.max(0, currentCommunityPoints + pointDifference);
                    
                    transaction.update(communityStatsRef, {
                        totalClickPoints: newCommunityPoints,
                        // Note: We are not adjusting total community trees here as it's tied to approved submissions (TREES_PER_VALIDATION), not point adjustments. 
                        // This prevents point adjustments from incorrectly creating/deleting community trees.
                    });
                } else if (pointDifference > 0) {
                     transaction.set(communityStatsRef, {
                        totalClickPoints: pointDifference,
                        totalTreesPlanted: 0 // Start with 0 as this action doesn't plant a tree
                    });
                }
            });
        } catch (e) {
            console.error('Transaction failed: ', e);
            throw new Error(e instanceof Error ? e.message : 'Failed to update user points.');
        }
    }
);


const ExtendUserTreeLimitInputSchema = z.object({
    userId: z.string().describe("The ID of the user to update."),
    newLimit: z.number().int().min(0).describe("The new maximum tree limit for the user."),
});
export type ExtendUserTreeLimitInput = z.infer<typeof ExtendUserTreeLimitInputSchema>;

export const extendUserTreeLimit = ai.defineFlow(
    {
        name: 'extendUserTreeLimit',
        inputSchema: ExtendUserTreeLimitInputSchema,
        outputSchema: z.void(),
        auth: (auth) => { // Auth policy to ensure only admins can run this
            if (!auth || auth.email !== ADMIN_EMAIL) {
                throw new Error("You must be an admin to perform this action.");
            }
        }
    },
    async ({ userId, newLimit }) => {
        const userRef = doc(db, 'users', userId);
        const batch = writeBatch(db);
        batch.update(userRef, {
            maxTrees: newLimit,
        });
        await batch.commit();
    }
);

const AddPointsToAdminInputSchema = z.object({
  points: z.number().int().describe("The number of points to add or remove from the admin."),
});
export type AddPointsToAdminInput = z.infer<typeof AddPointsToAdminInputSchema>;


export const addPointsToAdmin = ai.defineFlow(
  {
    name: 'addPointsToAdmin',
    inputSchema: AddPointsToAdminInputSchema,
    outputSchema: z.void(),
    auth: (auth) => {
      if (!auth || auth.email !== ADMIN_EMAIL) {
        throw new Error("Only the admin can perform this action.");
      }
    },
  },
  async ({ points }, context) => {
    // The auth policy above guarantees that context.auth will be defined here.
    const adminId = context.auth!.uid;
    const adminEmail = context.auth!.email;
    const adminName = context.auth!.displayName;
    const userRef = doc(db, 'users', adminId);

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      let currentPoints = 0;
      if (userDoc.exists()) {
        currentPoints = userDoc.data().totalPoints || 0;
      }

      const newTotalPoints = Math.max(0, currentPoints + points);
      const newTotalTrees = Math.floor(newTotalPoints / POINTS_PER_TREE);

      if (userDoc.exists()) {
        transaction.update(userRef, {
          totalPoints: newTotalPoints,
          totalTrees: newTotalTrees,
        });
      } else {
        transaction.set(userRef, {
          displayName: adminName,
          email: adminEmail,
          totalPoints: newTotalPoints,
          totalTrees: newTotalTrees,
        });
      }
    });
    // This flow does NOT affect community stats, as it's for testing purposes.
  }
);
