'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting optimized schedules and routes based on passenger demand,
 * ship availability, and timing, to reduce operational costs and improve efficiency.
 *
 * - suggestOptimizedSchedules - A function that handles the process of suggesting optimized schedules.
 * - SuggestOptimizedSchedulesInput - The input type for the suggestOptimizedSchedules function.
 * - SuggestOptimizedSchedulesOutput - The return type for the suggestOptimizedSchedules function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOptimizedSchedulesInputSchema = z.object({
  passengerDemandData: z
    .string()
    .describe('Data on passenger demand, including destinations and timing.'),
  shipAvailabilityData: z.string().describe('Data on ship availability, including locations and schedules.'),
  timingConstraints: z.string().describe('Timing constraints for routes and schedules.'),
  currentBookingsData: z.string().optional().describe('Current passenger booking data.'),
});
export type SuggestOptimizedSchedulesInput = z.infer<typeof SuggestOptimizedSchedulesInputSchema>;

const SuggestOptimizedSchedulesOutputSchema = z.object({
  optimizedSchedules: z.string().describe('Suggested optimized schedules and routes.'),
  estimatedCostSavings: z.string().describe('Estimated cost savings from the optimized schedules.'),
  improvedEfficiencyMetrics: z.string().describe('Metrics on improved efficiency from the optimized schedules.'),
});
export type SuggestOptimizedSchedulesOutput = z.infer<typeof SuggestOptimizedSchedulesOutputSchema>;

export async function suggestOptimizedSchedules(input: SuggestOptimizedSchedulesInput): Promise<SuggestOptimizedSchedulesOutput> {
  return suggestOptimizedSchedulesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOptimizedSchedulesPrompt',
  input: {schema: SuggestOptimizedSchedulesInputSchema},
  output: {schema: SuggestOptimizedSchedulesOutputSchema},
  prompt: `You are an expert in logistics and transportation, specializing in optimizing schedules and routes for shipping companies.

  Based on the passenger demand, ship availability, and timing constraints provided, suggest optimized schedules and routes.
  Consider the current passenger booking data to maximize passenger satisfaction and revenue.

  Passenger Demand Data: {{{passengerDemandData}}}
  Ship Availability Data: {{{shipAvailabilityData}}}
  Timing Constraints: {{{timingConstraints}}}
  Current Passenger Bookings: {{{currentBookingsData}}}

  Provide the suggested optimized schedules and routes, estimated cost savings, and improved efficiency metrics.
  Format the schedules in a clear and easy-to-understand manner.
  Clearly explain how the proposed changes lead to cost savings and improved efficiency.
  Provide specific metrics, like estimated fuel savings and reduced idle time, to demonstrate the benefits.
  Highlight the impact on passenger satisfaction and revenue generation.
  If currentBookingsData is unavailable, suggest optimized schedules and routes based solely on the provided passengerDemandData, shipAvailabilityData, and timingConstraints.
  `,
});

const suggestOptimizedSchedulesFlow = ai.defineFlow(
  {
    name: 'suggestOptimizedSchedulesFlow',
    inputSchema: SuggestOptimizedSchedulesInputSchema,
    outputSchema: SuggestOptimizedSchedulesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
