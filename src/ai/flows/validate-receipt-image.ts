
'use server';

/**
 * @fileOverview A flow to validate an uploaded photo containing a bag and a receipt.
 *
 * - validateReceiptImage - A function that handles the image validation process.
 * - ValidateReceiptImageInput - The input type for the validateReceiptImage function.
 * - ValidateReceiptImageOutput - The return type for the validateReceiptImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp, collection, addDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import * as crypto from 'crypto';
import sharp from 'sharp';

const POINTS_PER_TREE = 10;
const TREES_PER_VALIDATION = 1;


const ValidateReceiptImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the purchased item and receipt together, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  userLatitude: z.number().describe("The user's current latitude."),
  userLongitude: z.number().describe("The user's current longitude."),
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
  prompt: `You are an AI assistant that validates a user-submitted photo for a sustainability rewards program called ClickBag.
The current server date and time is {{currentDateTime}} (in ISO 8601 format). You MUST use this as the absolute reference for "now".
The user's current location is Latitude: {{userLatitude}}, Longitude: {{userLongitude}}.

The user has submitted a SINGLE photo that MUST contain two items:
1. A shopping bag (for now, any shopping bag is acceptable).
2. A clear, unaltered photograph of a real paper receipt for a purchase.

You must perform the following checks with extreme scrutiny:
1.  **Bag & Receipt Presence**: Confirm that BOTH a shopping bag and a paper receipt are clearly visible in the single image.
2.  **Authenticity Check**: The image must be a genuine photograph. It CANNOT be a screenshot, a digital document, or an AI-generated image. Scrutinize it for any signs of digital manipulation or artificial generation. If you suspect the image is not a real photo, you must reject the submission.
3.  **Date & Time Validation (via OCR)**:
    a. Use OCR to read the date and time from the receipt in the photo.
    b. The receipt must be for a purchase made on the same calendar day relative to the current server time ({{currentDateTime}}).
    c. A receipt dated today is valid even if its time appears to be in the "future" from the server's perspective, as it could be from a different timezone.
4.  **Location Validation (via OCR)**:
    a. Use OCR to read the store's name, city, and/or address from the receipt. This is the purchase location.
    b. Compare the purchase location to the user's provided coordinates. They must be plausibly close (e.g., within the same city or a reasonable driving distance). If they are too far apart, reject the submission.
    c. In your output, set the 'geolocation' field to the city and country you identify from the receipt.

**Final Decision:**

If ALL checks pass:
- Set 'isValid' to true.
- Award exactly 10 ClickPoints.
- Provide a detailed success message in 'validationDetails'.

If ANY check fails:
- Set 'isValid' to false.
- Award 0 ClickPoints.
- Clearly explain the specific reason for the failure in 'validationDetails'.

**Image to Analyze:**
{{media url=photoDataUri}}

Respond in JSON format, as specified in the output schema. Be verbose and descriptive in the validationDetails field.
`,
});

const validateReceiptImageFlow = ai.defineFlow(
  {
    name: 'validateReceiptImageFlow',
    inputSchema: ValidateReceiptImageInputSchema,
    outputSchema: ValidateReceiptImageOutputSchema,
  },
  async (input, context) => {
    // This flow no longer has auth context from the plugin.
    // For now, we cannot verify the user ID. This is a temporary state
    // to get the app building and can be addressed later.
    const uid = 'temp-unauthenticated-user'; // Placeholder

    // 1. Image Compression & Hashing
    const imageBuffer = Buffer.from(input.photoDataUri.split(',')[1], 'base64');
    
    const compressedImageBuffer = await sharp(imageBuffer)
        .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

    const imageHash = crypto.createHash('sha256').update(compressedImageBuffer).digest('hex');

    // 2. Duplicate Check in Firestore
    const submissionsRef = collection(db, 'submissions');
    const q = query(submissionsRef, where('imageHash', '==', imageHash));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        return {
            isValid: false,
            clickPoints: 0,
            validationDetails: 'This image has already been submitted. Please upload a new, unique receipt.'
        };
    }

    // 3. AI Validation with compressed image
    const compressedDataUri = `data:image/jpeg;base64,${compressedImageBuffer.toString('base64')}`;
    const currentDateTime = new Date().toISOString();

    const validationResult = await validateReceiptImagePrompt({
      ...input,
      photoDataUri: compressedDataUri,
      currentDateTime,
    });

    const output = validationResult.output;
    if (!output) {
      throw new Error('AI validation failed to produce an output.');
    }

    // 4. Firestore Batch Write
    const batch = writeBatch(db);

    // Add to submissions history
    const submissionDocRef = doc(collection(db, 'submissions'));
    batch.set(submissionDocRef, {
        userId: uid,
        date: Timestamp.now(),
        status: output.isValid ? 'Approved' : 'Rejected',
        points: output.clickPoints,
        geolocation: output.geolocation || 'N/A',
        validationDetails: output.validationDetails,
        imageHash: imageHash, 
    });

    if (output.isValid) {
        try {
            const userDocRef = doc(db, 'users', uid);
            const communityStatsRef = doc(db, 'community-stats', 'global');
            
            const userDoc = await getDoc(userDocRef);
            const communityStatsDoc = await getDoc(communityStatsRef);

            // Update user stats
            const newTotalPoints = (userDoc.data()?.totalPoints || 0) + output.clickPoints;
            const newTotalTrees = Math.floor(newTotalPoints / POINTS_PER_TREE);
            
            if (!userDoc.exists()) {
                batch.set(userDocRef, { totalPoints: newTotalPoints, totalTrees: newTotalTrees });
            } else {
                batch.update(userDocRef, { totalPoints: newTotalPoints, totalTrees: newTotalTrees });
            }

            // Update community stats
            const newCommunityPoints = (communityStatsDoc.data()?.totalClickPoints || 0) + output.clickPoints;
            const newCommunityTrees = (communityStatsDoc.data()?.totalTreesPlanted || 0) + TREES_PER_VALIDATION;

            if (!communityStatsDoc.exists()) {
                batch.set(communityStatsRef, { totalClickPoints: newCommunityPoints, totalTreesPlanted: newCommunityTrees });
            } else {
                batch.update(communityStatsRef, { totalClickPoints: newCommunityPoints, totalTreesPlanted: newCommunityTrees });
            }
        } catch (e) {
            console.error("Failed to prepare batch updates for points: ", e);
            throw new Error("Failed to update user and community points.");
        }
    }

    await batch.commit();

    return output;
  }
);
