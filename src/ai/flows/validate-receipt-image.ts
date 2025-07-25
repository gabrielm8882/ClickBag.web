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

// Define an extended schema for the prompt that includes the current date.
const PromptInputSchema = ValidateReceiptImageInputSchema.extend({
  currentDateTime: z.string().describe('The current server date and time in ISO format.'),
});

const validateReceiptImagePrompt = ai.definePrompt({
  name: 'validateReceiptImagePrompt',
  input: {schema: PromptInputSchema},
  output: {schema: ValidateReceiptImageOutputSchema},
  prompt: `You are an AI assistant that validates user-submitted photos for a sustainability rewards program.
The current server date and time is {{currentDateTime}} (in ISO 8601 format). You MUST use this as the absolute reference for "now". Be aware that the user may be in a different timezone.

You must perform the following checks with extreme scrutiny:
1.  **Purchase Photo Analysis**: Analyze the first photo. It MUST show a series of products inside a physical shopping bag.
2.  **Receipt Photo Analysis**: Analyze the second photo. It MUST be a clear, unaltered photograph of a real paper receipt for a purchase.
3.  **Authenticity Check**: Both images must be genuine photographs. They CANNOT be screenshots, digital documents, or AI-generated images. Scrutinize them for any signs of digital manipulation or artificial generation. If you suspect an image is not a real photo, you must reject the submission.
4.  **Date & Time Verification**:
    a. First, determine the store's location from the receipt to infer its timezone.
    b. The receipt must be for a purchase made on the same calendar day relative to the current server time ({{currentDateTime}}).
    c. Check if the time on the receipt is approximately correct for the inferred timezone. A receipt dated today is valid even if its time appears to be in the "future" from the server's perspective, as it could be from a different timezone.
5.  **Correspondence Check**: Both photos must clearly correspond to the same purchase event.
6.  **Duplicate Check**: Be extra vigilant for submissions that look very similar to each other. Submissions are checked against a database of photos from the last 15 days. If you suspect this is a duplicate, reject it.

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
  },
  async (input) => {
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

    return output;
  }
);
