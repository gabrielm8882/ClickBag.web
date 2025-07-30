
'use server';

import { validateReceiptImage, type ValidateReceiptImageInput, type ValidateReceiptImageOutput } from '@/ai/flows/validate-receipt-image';

export async function handleImageUpload(
  input: ValidateReceiptImageInput
): Promise<ValidateReceiptImageOutput> {
  try {
    // The user's authentication is now automatically handled by Genkit's Next.js plugin
    const result = await validateReceiptImage(input);
    return result;
  } catch (e) {
    console.error("handleImageUpload failed:", e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred during AI validation.';
    // Re-throw a user-friendly error to be caught by the client-side form handler
    throw new Error(errorMessage);
  }
}
