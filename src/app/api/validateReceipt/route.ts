import { validateReceiptImageFlow } from '@/ai/flows/validate-receipt-image';
import { appRoute } from '@genkit-ai/next';

export const POST = appRoute(validateReceiptImageFlow);
