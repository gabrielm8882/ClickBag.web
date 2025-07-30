
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
import { doc, getDoc, Timestamp, collection, addDoc, getDocs, query, where, runTransaction } from 'firebase/firestore';
import * as crypto from 'crypto';
import sharp from 'sharp';

const POINTS_PER_TREE = 10;
const TREES_PER_VALIDATION = 1;
const USER_MAX_TREES = 20;


const ValidateReceiptImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the purchased item and receipt together, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  userLatitude: z.number().optional().describe("The user's current latitude (if available)."),
  userLongitude: z.number().optional().describe("The user's current longitude (if available)."),
});
export type ValidateReceiptImageInput = z.infer<typeof ValidateReceiptImageInputSchema>;

const ValidateReceiptImageOutputSchema = z.object({
  isValid: z.boolean().describe('Whether or not the receipt and purchase photos are valid.'),
  clickPoints: z.number().describe('The number of ClickPoints awarded to the user.'),
  geolocation: z.string().optional().describe('The geolocation of the purchase, if available.'),
  validationDetails: z.string().describe('The AI analysis validation details.'),
  // Fields for receipt content hashing
  storeName: z.string().optional().describe('The name of the store extracted from the receipt.'),
  receiptDate: z.string().optional().describe('The date of the purchase from the receipt (e.g., YYYY-MM-DD).'),
  totalAmount: z.string().optional().describe('The total amount of the purchase from the receipt.'),
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
The current server time is {{currentDateTime}} (in ISO 8601 format). You MUST use this as the absolute reference for "now".
The user's current location, if provided, is Latitude: {{userLatitude}}, Longitude: {{userLongitude}}. This is a hint, not a strict requirement.

The user has submitted a SINGLE photo that MUST contain two items:
1. A shopping bag (for now, any shopping bag is acceptable).
2. A clear, unaltered photograph of a real paper receipt for a purchase.

You must perform the following checks with scrutiny:
1.  **Bag & Receipt Presence**: Confirm that BOTH a shopping bag and a paper receipt are clearly visible in the single image.
2.  **Authenticity Check**: The image must be a genuine photograph. It CANNOT be a screenshot, a digital document, or an AI-generated image. The user might upload the photo from home later in the day, which is perfectly acceptable. Scrutinize it for any signs of digital manipulation or artificial generation. If you suspect the image is not a real photo, you must reject the submission.
3.  **Date & Time Validation (via OCR)**:
    a. Use OCR to read the date from the receipt in the photo.
    b. The receipt must be for a purchase made on the same calendar day relative to the current server time ({{currentDateTime}}). The time of day on the receipt does not matter.
4.  **Location Validation (via OCR & Geolocation Hint)**:
    a. Attempt to use OCR to read the store's name and city from the receipt.
    b. If the user's location is provided, use it as a hint. The user does NOT need to be at the store. A valid submission can come from their home. Check if the purchase city on the receipt is plausibly the same as the user's location city.
    c. If location data is not available from the receipt or the user, do not fail the validation on this point alone.
    d. In your output, set the 'geolocation' field to the city and country you identify from the receipt, if possible.
5.  **Receipt Content Extraction (via OCR)**:
    a. Extract the store's name and set it to the 'storeName' field.
    b. Extract the purchase date and set it to the 'receiptDate' field in YYYY-MM-DD format.
    c. Extract the final total amount of the purchase and set it to the 'totalAmount' field. If not possible, leave these fields null.

**Final Decision:**

If ALL checks pass:
- Set 'isValid' to true.
- Award exactly 10 ClickPoints.
- Provide a detailed success message in 'validationDetails' confirming the key checks.

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
    if (!context.auth) {
      throw new Error('User must be authenticated.');
    }
    const uid = context.auth.uid;
    const userDisplayName = context.auth.displayName;
    const userEmail = context.auth.email;

    // 1. Check if user has reached the tree limit
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    const currentUserTrees = userData?.totalTrees || 0;
    const maxTreesForUser = userData?.maxTrees || USER_MAX_TREES;


    if (currentUserTrees >= maxTreesForUser) {
        return {
            isValid: false,
            clickPoints: 0,
            validationDetails: `You have reached your contribution limit of ${maxTreesForUser} trees. Thank you for your amazing impact! Please contact us to extend your limit.`
        };
    }

    // 2. Image Compression & Hashing to detect image reuse and prevent fraud.
    const imageBuffer = Buffer.from(input.photoDataUri.split(',')[1], 'base64');
    
    const compressedImageBuffer = await sharp(imageBuffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

    const imageHash = crypto.createHash('sha256').update(compressedImageBuffer).digest('hex');

    // 3. Duplicate Image Check in Firestore
    const submissionsRef = collection(db, 'submissions');
    const imageQuery = query(submissionsRef, where('imageHash', '==', imageHash));
    const imageQuerySnapshot = await getDocs(imageQuery);

    if (!imageQuerySnapshot.empty) {
        return {
            isValid: false,
            clickPoints: 0,
            validationDetails: 'This image has already been submitted. Please upload a new, unique receipt.'
        };
    }

    // 4. AI Validation with compressed image
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
    
    // 5. Receipt Content Hash Check
    let receiptContentHash: string | null = null;
    if (output.isValid && output.storeName && output.receiptDate && output.totalAmount) {
        const contentString = `${output.storeName}-${output.receiptDate}-${output.totalAmount}`;
        receiptContentHash = crypto.createHash('sha256').update(contentString).digest('hex');

        const contentQuery = query(
            submissionsRef, 
            where('userId', '==', uid),
            where('receiptContentHash', '==', receiptContentHash)
        );
        const contentQuerySnapshot = await getDocs(contentQuery);

        if (!contentQuerySnapshot.empty) {
            return {
                isValid: false,
                clickPoints: 0,
                validationDetails: 'This receipt appears to have been submitted already. Each unique purchase can only be validated once.',
            };
        }
    }


    // 6. Firestore Updates
    try {
      await runTransaction(db, async (transaction) => {
        // Add to submissions history
        const submissionDocRef = doc(collection(db, 'submissions'));
        transaction.set(submissionDocRef, {
            userId: uid,
            date: Timestamp.now(),
            status: output.isValid ? 'Approved' : 'Rejected',
            points: output.clickPoints,
            geolocation: output.geolocation || 'N/A',
            validationDetails: output.validationDetails,
            imageHash: imageHash,
            receiptContentHash: receiptContentHash,
        });

        if (output.isValid) {
            const communityStatsRef = doc(db, 'community-stats', 'global');
            
            // Get current docs within the transaction
            const userDocTransaction = await transaction.get(userDocRef);
            const communityStatsDocTransaction = await transaction.get(communityStatsRef);

            // Update User Stats
            const currentPoints = userDocTransaction.data()?.totalPoints || 0;
            const newTotalPoints = currentPoints + output.clickPoints;
            const newTotalTrees = Math.floor(newTotalPoints / POINTS_PER_TREE);
            
            if (!userDocTransaction.exists()) {
                 transaction.set(userDocRef, { 
                    displayName: userDisplayName || 'Anonymous',
                    email: userEmail || 'N/A',
                    totalPoints: newTotalPoints, 
                    totalTrees: newTotalTrees 
                });
            } else {
                 transaction.update(userDocRef, { 
                    totalPoints: newTotalPoints, 
                    totalTrees: newTotalTrees 
                });
            }
            
            // Update Community Stats
            const currentCommunityPoints = communityStatsDocTransaction.data()?.totalClickPoints || 0;
            const currentCommunityTrees = communityStatsDocTransaction.data()?.totalTreesPlanted || 0;
            const newCommunityPoints = currentCommunityPoints + output.clickPoints;
            const newCommunityTrees = currentCommunityTrees + TREES_PER_VALIDATION;

            if (!communityStatsDocTransaction.exists()) {
                transaction.set(communityStatsRef, { 
                    totalClickPoints: newCommunityPoints, 
                    totalTreesPlanted: newCommunityTrees 
                });
            } else {
                transaction.update(communityStatsRef, { 
                    totalClickPoints: newCommunityPoints, 
                    totalTreesPlanted: newCommunityTrees 
                });
            }
        }
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
      throw new Error("Failed to save submission and update points. Please try again.");
    }
    
    return output;
  }
);
