
import { nextHandler } from '@genkit-ai/next';
import { defineFlow } from 'genkit';
import * as z from 'zod';

// Import all the flows that you want to expose via the API.
import * as adminActions from '@/ai/flows/admin-actions';
import * as validation from '@/ai/flows/validate-receipt-image';


export const { POST, GET } = nextHandler();
