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

const validateReceiptImagePrompt = ai.definePrompt({
  name: 'validateReceiptImagePrompt',
  input: {schema: ValidateReceiptImageInputSchema},
  output: {schema: ValidateReceiptImageOutputSchema},
  prompt: `You are an AI assistant that validates user-submitted photos for a sustainability rewards program.

You must perform the following checks:
1.  Analyze the first photo and ensure it shows a series of products inside a shopping bag. For now, any shopping bag is acceptable.
2.  Analyze the second photo and ensure it is a receipt for a purchase.
3.  The receipt must be for a purchase made on the current date.
4.  If possible, determine the location from the receipt and see if it matches the user's location.
5.  Both photos must clearly correspond to the same purchase.

If all checks pass:
- Set 'isValid' to true.
- Award exactly 10 ClickPoints.
- Provide a detailed success message in 'validationDetails'.

If any check fails:
- Set 'isValid' to false.
- Award 0 ClickPoints.
- Clearly explain the reason for the failure in 'validationDetails'.

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
  },
  async input => {
    const {output} = await validateReceiptImagePrompt(input);
    return output!;
  }
);
