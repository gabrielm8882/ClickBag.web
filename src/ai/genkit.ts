import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {next} from '@genkit-ai/next';
import {auth} from 'firebase-admin/lib/auth';

export const ai = genkit({
  plugins: [googleAI(), next({auth: true})],
  model: 'googleai/gemini-2.0-flash',
});
