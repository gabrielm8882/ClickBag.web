'use server';

/**
 * @fileOverview Determines the geolocation from an uploaded image.
 *
 * - determineGeolocation - A function that handles the geolocation determination process.
 * - DetermineGeolocationInput - The input type for the determineGeolocation function.
 * - DetermineGeolocationOutput - The return type for the determineGeolocation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetermineGeolocationInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DetermineGeolocationInput = z.infer<typeof DetermineGeolocationInputSchema>;

const DetermineGeolocationOutputSchema = z.object({
  geolocation: z.string().describe('The geolocation of the purchase.'),
});
export type DetermineGeolocationOutput = z.infer<typeof DetermineGeolocationOutputSchema>;

export async function determineGeolocation(input: DetermineGeolocationInput): Promise<DetermineGeolocationOutput> {
  return determineGeolocationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'determineGeolocationPrompt',
  input: {schema: DetermineGeolocationInputSchema},
  output: {schema: DetermineGeolocationOutputSchema},
  prompt: `You are an expert at determining the geolocation of a purchase based on a photo of the receipt.

  Analyze the image to determine the city and country where the purchase was made. Provide the geolocation as a city, country string.
  Photo: {{media url=photoDataUri}}`,
});

const determineGeolocationFlow = ai.defineFlow(
  {
    name: 'determineGeolocationFlow',
    inputSchema: DetermineGeolocationInputSchema,
    outputSchema: DetermineGeolocationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
