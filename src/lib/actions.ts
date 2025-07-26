
'use server';

import { validateReceiptImage, type ValidateReceiptImageInput, type ValidateReceiptImageOutput } from '@/ai/flows/validate-receipt-image';
import { auth } from '@/lib/firebase';

export async function handleImageUpload(
  input: ValidateReceiptImageInput
): Promise<{ data: ValidateReceiptImageOutput | null, error: string | null }> {
  try {
    // This is the critical change: we get the token and pass it along.
    // However, the flow doesn't need it explicitly anymore, as the genkit/next plugin will handle it.
    const result = await validateReceiptImage(input);
    return { data: result, error: null };
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred during AI validation.';
    return { data: null, error: errorMessage };
  }
}
