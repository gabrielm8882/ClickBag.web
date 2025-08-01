import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { validateReceiptImageFlow } from './src/ai/flows/validate-receipt-image';
import {
  deleteSubmission,
  updateUserPoints,
  extendUserTreeLimit,
} from './src/ai/flows/admin-actions';

console.log('Flows registered:', [
  validateReceiptImageFlow.name,
  deleteSubmission.name,
  updateUserPoints.name,
  extendUserTreeLimit.name,
]);

export default genkit({
  plugins: [googleAI()],
  flows: [
    validateReceiptImageFlow,
    deleteSubmission,
    updateUserPoints,
    extendUserTreeLimit,
  ],
});