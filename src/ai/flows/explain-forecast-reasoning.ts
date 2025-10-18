'use server';

/**
 * @fileOverview Explains the reasoning behind the congestion forecast using an LLM.
 *
 * - explainForecastReasoning - A function that explains the reasoning behind the congestion forecast.
 * - ExplainForecastReasoningInput - The input type for the explainForecastReasoning function.
 * - ExplainForecastReasoningOutput - The return type for the explainForecastReasoning function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainForecastReasoningInputSchema = z.object({
  forecastData: z.string().describe('The congestion forecast data in JSON format.'),
  historicalData: z.string().describe('The historical traffic data in JSON format.'),
});
export type ExplainForecastReasoningInput = z.infer<typeof ExplainForecastReasoningInputSchema>;

const ExplainForecastReasoningOutputSchema = z.object({
  explanation: z.string().describe('The explanation of the congestion forecast reasoning.'),
});
export type ExplainForecastReasoningOutput = z.infer<typeof ExplainForecastReasoningOutputSchema>;

export async function explainForecastReasoning(input: ExplainForecastReasoningInput): Promise<ExplainForecastReasoningOutput> {
  return explainForecastReasoningFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainForecastReasoningPrompt',
  input: {schema: ExplainForecastReasoningInputSchema},
  output: {schema: ExplainForecastReasoningOutputSchema},
  prompt: `You are an expert traffic analyst. You will be provided with congestion forecast data and historical traffic data.
Your task is to explain the reasoning behind the congestion forecast, taking into account the historical trends and any other relevant factors.

Forecast Data:
{{forecastData}}

Historical Data:
{{historicalData}}

Explanation:`,
});

const explainForecastReasoningFlow = ai.defineFlow(
  {
    name: 'explainForecastReasoningFlow',
    inputSchema: ExplainForecastReasoningInputSchema,
    outputSchema: ExplainForecastReasoningOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
