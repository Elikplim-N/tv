'use server';

import { autoTuneModelParams, AutoTuneModelParamsInput } from '@/ai/flows/auto-tune-model-params';
import { explainForecastReasoning, ExplainForecastReasoningInput } from '@/ai/flows/explain-forecast-reasoning';

export async function tuneModelParamsAction(input: AutoTuneModelParamsInput) {
  try {
    const result = await autoTuneModelParams(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error tuning model params:', error);
    return { success: false, error: 'Failed to tune model parameters.' };
  }
}

export async function getForecastExplanationAction(input: ExplainForecastReasoningInput) {
  try {
    const result = await explainForecastReasoning(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error getting forecast explanation:', error);
    return { success: false, error: 'Failed to get forecast explanation.' };
  }
}
