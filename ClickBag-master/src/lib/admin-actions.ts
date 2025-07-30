
'use server';

import {
  deleteSubmission,
  updateUserPoints,
  extendUserTreeLimit,
  type UpdateUserPointsInput,
  type ExtendUserTreeLimitInput,
} from '@/ai/flows/admin-actions';

/**
 * Server action to delete a submission.
 * The user's authentication is automatically handled by Genkit's Next.js plugin.
 */
export async function deleteSubmissionAction(submissionId: string): Promise<void> {
  try {
    await deleteSubmission(submissionId);
  } catch (e) {
    console.error("deleteSubmissionAction failed:", e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred during submission deletion.';
    throw new Error(errorMessage);
  }
}

/**
 * Server action to update a user's points.
 */
export async function updateUserPointsAction(input: UpdateUserPointsInput): Promise<void> {
  try {
    await updateUserPoints(input);
  } catch (e) {
    console.error("updateUserPointsAction failed:", e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred while updating user points.';
    throw new Error(errorMessage);
  }
}

/**
 * Server action to extend a user's tree limit.
 */
export async function extendUserTreeLimitAction(input: ExtendUserTreeLimitInput): Promise<void> {
  try {
    await extendUserTreeLimit(input);
  } catch (e) {
    console.error("extendUserTreeLimitAction failed:", e);
    const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred while extending user's tree limit.";
    throw new Error(errorMessage);
  }
}
