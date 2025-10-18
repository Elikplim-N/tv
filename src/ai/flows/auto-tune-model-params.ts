'use server';

/**
 * @fileOverview This file defines a Genkit flow to automatically tune RandomForest model parameters using GenAI.
 *
 * The flow takes training data as input and outputs the optimal model parameters.
 * - autoTuneModelParams - A function that handles the model parameter tuning process.
 * - AutoTuneModelParamsInput - The input type for the autoTuneModelParams function.
 * - AutoTuneModelParamsOutput - The return type for the autoTuneModelParams function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutoTuneModelParamsInputSchema = z.object({
  trainingDataSummary: z
    .string()
    .describe(
      `A summary of the training data, including the features and target variable.
      Also describe the size and distribution of the training data, and the evaluation metric to optimize for.`
    ),
  modelType: z.string().describe('The type of model to tune (e.g., RandomForest).'),
  tuningObjective: z
    .string()
    .describe(
      `The objective of the tuning process (e.g., maximize accuracy, minimize error).
      Also include specific constraints or requirements, such as acceptable training time or model complexity.`
    ),
});
export type AutoTuneModelParamsInput = z.infer<typeof AutoTuneModelParamsInputSchema>;

const AutoTuneModelParamsOutputSchema = z.object({
  optimalParams: z
    .record(z.any())
    .describe(
      `A dictionary of optimal model parameters found by the GenAI tuning process.
       Include the parameter names and their corresponding values.`
    ),
  reasoning: z.string().describe('The reasoning behind the selected optimal parameters.'),
});
export type AutoTuneModelParamsOutput = z.infer<typeof AutoTuneModelParamsOutputSchema>;

export async function autoTuneModelParams(input: AutoTuneModelParamsInput): Promise<AutoTuneModelParamsOutput> {
  return autoTuneModelParamsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autoTuneModelParamsPrompt',
  input: {schema: AutoTuneModelParamsInputSchema},
  output: {schema: AutoTuneModelParamsOutputSchema},
  prompt: `You are an expert in machine learning model tuning.

  Given the following training data summary, model type, and tuning objective, suggest optimal parameters for the model.
  Explain your reasoning for selecting these parameters.

  Training Data Summary: {{{trainingDataSummary}}}
  Model Type: {{{modelType}}}
  Tuning Objective: {{{tuningObjective}}}

  Format your response as a JSON object with the following keys:
  - optimalParams: A dictionary of optimal model parameters.
  - reasoning: The reasoning behind the selected optimal parameters.

  Example:
  {
    "optimalParams": {
      "n_estimators": 100,
      "max_depth": 10,
      "min_samples_leaf": 5
    },
    "reasoning": "Based on the training data summary, a RandomForest model with 100 estimators, a maximum depth of 10, and a minimum samples leaf of 5 should provide a good balance between accuracy and generalization."
  }`,
});

const autoTuneModelParamsFlow = ai.defineFlow(
  {
    name: 'autoTuneModelParamsFlow',
    inputSchema: AutoTuneModelParamsInputSchema,
    outputSchema: AutoTuneModelParamsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
