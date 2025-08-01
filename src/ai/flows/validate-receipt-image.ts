'use server';

import { definePrompt, defineFlow } from 'genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import {
  doc, getDoc, Timestamp,
  collection, addDoc, getDocs, query, where, runTransaction
} from 'firebase/firestore';
import crypto from 'crypto';
import sharp from 'sharp';

const POINTS_PER_TREE = 10;
const TREES_PER_VALIDATION = 1;
const USER_MAX_TREES = 20;

const ValidateReceiptImageInputSchema = z.object({
  photoDataUri: z.string().describe("Data URI of purchase bag + receipt photo"),
  userLatitude: z.number().optional(),
  userLongitude: z.number().optional(),
});
export type ValidateReceiptImageInput = z.infer<typeof ValidateReceiptImageInputSchema>;

const ValidateReceiptImageOutputSchema = z.object({
  isValid: z.boolean(),
  clickPoints: z.number(),
  geolocation: z.string().optional(),
  validationDetails: z.string(),
  storeName: z.string().optional(),
  receiptDate: z.string().optional(),
  totalAmount: z.string().optional(),
});
export type ValidateReceiptImageOutput = z.infer<typeof ValidateReceiptImageOutputSchema>;

const PromptInputSchema = ValidateReceiptImageInputSchema.extend({
  currentDateTime: z.string(),
});

const validateReceiptImagePrompt = definePrompt({
  name: 'validateReceiptImagePrompt',
  input: { schema: PromptInputSchema },
  output: { schema: ValidateReceiptImageOutputSchema },
  prompt: `
YouYou are an AI assistant validating a purchase photo. Use current date {{currentDateTime}}.
Image must show both a real receipt and a bag. Use OCR to extract store name, date, amount, etc.
Respond in JSON according to the output schema.
`
});

export const validateReceiptImageFlow = defineFlow({
    name: 'validateReceiptImageFlow',
    inputSchema: ValidateReceiptImageInputSchema,
    outputSchema: ValidateReceiptImageOutputSchema,
  },
  async (input, context) => {
    if (!context.auth) {
      throw new Error('User must be authenticated.');
    }
    const uid = context.auth.uid;
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data() || {};
    const currentTrees = userData.totalTrees || 0;
    const maxTrees = userData.maxTrees ?? USER_MAX_TREES;

    if (currentTrees >= maxTrees) {
      return {
        isValid: false,
        clickPoints: 0,
        validationDetails: `Tree limit ${maxTrees} reached.`,
      };
    }

    const imageBuffer = Buffer.from(input.photoDataUri.split(',')[1], 'base64');
    const compressed = await sharp(imageBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const imageHash = crypto.createHash('sha256').update(compressed).digest('hex');
    const subsColl = collection(db, 'submissions');
    const existing = await getDocs(query(subsColl, where('imageHash', '==', imageHash)));

    if (!existing.empty) {
      return { isValid: false, clickPoints: 0, validationDetails: 'Duplicate image.' };
    }

    const compressedDataUri = `data:image/jpeg;base64,${compressed.toString('base64')}`;
    const currentDateTime = new Date().toISOString();

    const result = await validateReceiptImagePrompt({
      ...input,
      photoDataUri: compressedDataUri,
      currentDateTime,
    });

    if (!result.output) {
      throw new Error('AI validation failed.');
    }

    const output = result.output;
    let receiptContentHash: string | null = null;

    if (output.isValid && output.storeName && output.receiptDate && output.totalAmount) {
      receiptContentHash = crypto
        .createHash('sha256')
        .update(`${output.storeName}-${output.receiptDate}-${output.totalAmount}`)
        .digest('hex');

      const contentExists = await getDocs(query(
        subsColl,
        where('userId', '==', uid),
        where('receiptContentHash', '==', receiptContentHash),
      ));

      if (!contentExists.empty) {
        return { isValid: false, clickPoints: 0, validationDetails: 'Duplicate receipt content.' };
      }
    }

    await runTransaction(db, async tx => {
      const subRef = doc(subsColl);
      tx.set(subRef, {
        userId: uid,
        date: Timestamp.now(),
        status: output.isValid ? 'Approved' : 'Rejected',
        points: output.clickPoints,
        geolocation: output.geolocation || 'N/A',
        validationDetails: output.validationDetails,
        imageHash,
        receiptContentHash,
      });

      if (output.isValid) {
        const statsRef = doc(db, 'community-stats', 'global');
        const userSnapshot = await tx.get(userDocRef);
        const statsSnapshot = await tx.get(statsRef);

        const prevPoints = userSnapshot.data()?.totalPoints || 0;
        const newPoints = prevPoints + output.clickPoints;
        const newTrees = Math.floor(newPoints / POINTS_PER_TREE);

        tx[userSnapshot.exists() ? 'update' : 'set'](userDocRef, {
          displayName: context.auth.displayName || 'Anonymous',
          email: context.auth.email || '',
          totalPoints: newPoints,
          totalTrees: newTrees,
        });

        const prevCP = statsSnapshot.data()?.totalClickPoints || 0;
        const prevTrees = statsSnapshot.data()?.totalTreesPlanted || 0;

        tx[statsSnapshot.exists() ? 'update' : 'set'](statsRef, {
          totalClickPoints: prevCP + output.clickPoints,
          totalTreesPlanted: prevTrees + TREES_PER_VALIDATION,
        });
      }
    });

    return output;
  }
);