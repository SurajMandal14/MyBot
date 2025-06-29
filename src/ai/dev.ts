import { config } from 'dotenv';
config();

import '@/ai/flows/handle-invoice-modifications.ts';
import '@/ai/flows/parse-service-details.ts';
import '@/ai/flows/parse-quotation-details.ts';
