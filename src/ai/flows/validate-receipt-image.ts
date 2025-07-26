
'use server';

/**
 * @fileOverview A flow to validate uploaded receipt and purchase photos using AI.
 *
 * - validateReceiptImage - A function that handles the receipt and purchase photo validation process.
 * - ValidateReceiptImageInput - The input type for the validateReceiptImage function.
 * - ValidateReceiptImageOutput - The return type for the validateReceiptImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { determineGeolocation } from './determine-geolocation';
import { db } from '@/lib/firebase';
import { doc, runTransaction, Timestamp, collection, addDoc } from 'firebase/firestore';


const POINTS_PER_TREE = 10;
const TREES_PER_VALIDATION = 1;


const ValidateReceiptImageInputSchema = z.object({
  purchasePhotoDataUri: z
    .string()
    .describe(
      "A photo of the purchased item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  receiptPhotoDataUri: z
    .string()
    .describe(
      "A photo of the receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userLatitude: z.number().optional().describe("The user's current latitude."),
  userLongitude: z.number().optional().describe("The user's current longitude."),
});
export type ValidateReceiptImageInput = z.infer<typeof ValidateReceiptImageInputSchema>;

const ValidateReceiptImageOutputSchema = z.object({
  isValid: z.boolean().describe('Whether or not the receipt and purchase photos are valid.'),
  clickPoints: z.number().describe('The number of ClickPoints awarded to the user.'),
  geolocation: z.string().optional().describe('The geolocation of the purchase, if available.'),
  validationDetails: z.string().describe('The AI analysis validation details.'),
});
export type ValidateReceiptImageOutput = z.infer<typeof ValidateReceiptImageOutputSchema>;

export async function validateReceiptImage(input: ValidateReceiptImageInput): Promise<ValidateReceiptImageOutput> {
  return validateReceiptImageFlow(input);
}

// Define an extended schema for the prompt that includes the current date.
const PromptInputSchema = ValidateReceiptImageInputSchema.extend({
  currentDateTime: z.string().describe('The current server date and time in ISO format.'),
});

const validateReceiptImagePrompt = ai.definePrompt({
  name: 'validateReceiptImagePrompt',
  input: {schema: PromptInputSchema},
  output: {schema: ValidateReceiptImageOutputSchema},
  prompt: `You are an AI assistant that validates user-submitted photos for a sustainability rewards program called ClickBag.
The current server date and time is {{currentDateTime}} (in ISO 8601 format). You MUST use this as the absolute reference for "now". Be aware that the user may be in a different timezone.
{{#if userLatitude}}
The user's current location is approximately Latitude: {{userLatitude}}, Longitude: {{userLongitude}}. Use this as a clue to verify if they are near the purchase location on the receipt.
{{else}}
The user has not provided their location. You must perform the validation without it.
{{/if}}

You must perform the following checks with extreme scrutiny:
1.  **Purchase Photo Analysis**: Analyze the first photo. It MUST show a series of products inside a physical shopping bag.
2.  **Receipt Photo Analysis**: Analyze the second photo. It MUST be a clear, unaltered photograph of a real paper receipt for a purchase.
3.  **Authenticity Check**: Both images must be genuine photographs. They CANNOT be screenshots, digital documents, or AI-generated images. Scrutinize them for any signs of digital manipulation or artificial generation. If you suspect an image is not a real photo, you must reject the submission.
4.  **Date & Time Verification**:
    a. First, determine the store's location from the receipt to infer its timezone.
    b. The receipt must be for a purchase made on the same calendar day relative to the current server time ({{currentDateTime}}).
    c. Check if the time on the receipt is approximately correct for the inferred timezone. A receipt dated today is valid even if its time appears to be in the "future" from the server's perspective, as it could be from a different timezone.
5.  **Duplicate Check**: Be extra vigilant for submissions that look very similar to each other. Submissions are checked against a database of photos from the last 15 days. If you suspect this is a duplicate, reject it.
6.  **Location Cross-Reference (if available)**: If the user's coordinates are provided, compare them to the store location on the receipt. They should be plausibly close. If no coordinates are provided, skip this check.

If all checks pass:
- Set 'isValid' to true.
- Award exactly 10 ClickPoints.
- Provide a detailed success message in 'validationDetails'.

If any check fails:
- Set 'isValid' to false.
- Award 0 ClickPoints.
- Clearly explain the specific reason for the failure in 'validationDetails'.

Here's the purchase photo:
{{media url=purchasePhotoDataUri}}

Here's the receipt photo:
{{media url=receiptPhotoDataUri}}

Respond in JSON format, as specified in the output schema. Be verbose and descriptive in the validationDetails field.
`,
});

const validateReceiptImageFlow = ai.defineFlow(
  {
    name: 'validateReceiptImageFlow',
    inputSchema: ValidateReceiptImageInputSchema,
    outputSchema: ValidateReceiptImageOutputSchema,
    auth: (auth) => {
        if (!auth) {
            throw new Error('User not authenticated.');
        }
    }
  },
  async (input, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
        throw new Error('User not authenticated.');
    }
    
    // Get the current date and time on the server to pass to the prompt.
    const currentDateTime = new Date().toISOString();

    // Perform validation and geolocation in parallel
    const [validationResult, geolocationResult] = await Promise.all([
      validateReceiptImagePrompt({ ...input, currentDateTime }),
      determineGeolocation({ photoDataUri: input.receiptPhotoDataUri }),
    ]);

    const output = validationResult.output;
    if (!output) {
      throw new Error('AI validation failed to produce an output.');
    }
    
    // If the submission is valid, add the geolocation to the output.
    if (output.isValid && geolocationResult?.geolocation) {
      output.geolocation = geolocationResult.geolocation;
    }

    // Record submission and update points in Firestore
    await addDoc(collection(db, 'submissions'), {
        userId: uid,
        date: Timestamp.now(),
        status: output.isValid ? 'Approved' : 'Rejected',
        points: output.clickPoints,
        geolocation: output.geolocation || 'N/A',
        validationDetails: output.validationDetails,
    });


    if (output.isValid) {
        try {
            await runTransaction(db, async (transaction) => {
                const userDocRef = doc(db, 'users', uid);
                const communityStatsRef = doc(db, 'community-stats', 'global');

                const userDoc = await transaction.get(userDocRef);
                const communityStatsDoc = await transaction.get(communityStatsRef);

                // Update user stats
                const newTotalPoints = (userDoc.data()?.totalPoints || 0) + output.clickPoints;
                const newTotalTrees = Math.floor(newTotalPoints / POINTS_PER_TREE);
                
                if (!userDoc.exists()) {
                    transaction.set(userDocRef, { totalPoints: newTotalPoints, totalTrees: newTotalTrees });
                } else {
                    transaction.update(userDocRef, { totalPoints: newTotalPoints, totalTrees: newTotalTrees });
                }

                // Update community stats
                const newCommunityPoints = (communityStatsDoc.data()?.totalClickPoints || 0) + output.clickPoints;
                const newCommunityTrees = (communityStatsDoc.data()?.totalTreesPlanted || 0) + TREES_PER_VALIDATION;

                if (!communityStatsDoc.exists()) {
                    transaction.set(communityStatsRef, { totalClickPoints: newCommunityPoints, totalTreesPlanted: newCommunityTrees });
                } else {
                    transaction.update(communityStatsRef, { totalClickPoints: newCommunityPoints, totalTreesPlanted: newCommunityTrees });
                }
            });
        } catch (e) {
            console.error("Transaction failed: ", e);
            throw new Error("Failed to update user points.");
        }
    }


    return output;
  }
);
