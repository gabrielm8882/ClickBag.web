
'use server';

import { validateReceiptImage, type ValidateReceiptImageInput, type ValidateReceiptImageOutput } from '@/ai/flows/validate-receipt-image';

export async function handleImageUpload(
  input: ValidateReceiptImageInput
): Promise<ValidateReceiptImageOutput> {
  try {
    const result = await validateReceiptImage(input);
    return result;
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred during AI validation.';
    // Re-throw the error to be caught by the client-side form handler
    throw new Error(errorMessage);
  }
}
