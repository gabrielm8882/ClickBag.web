'use server';

import { validateReceiptImage, type ValidateReceiptImageInput, type ValidateReceiptImageOutput } from '@/ai/flows/validate-receipt-image';

export async function handleImageUpload(
  input: ValidateReceiptImageInput
): Promise<{ data: ValidateReceiptImageOutput | null, error: string | null }> {
  try {
    const result = await validateReceiptImage(input);
    return { data: result, error: null };
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred during AI validation.';
    return { data: null, error: errorMessage };
  }
}
