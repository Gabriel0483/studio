'use server';

import { suggestOptimizedSchedules, type SuggestOptimizedSchedulesInput, type SuggestOptimizedSchedulesOutput } from '@/ai/flows/suggest-optimized-schedules';
import { z } from 'zod';

const FormSchema = z.object({
  passengerDemandData: z.string().min(10, "Passenger demand data is too short."),
  shipAvailabilityData: z.string().min(10, "Ship availability data is too short."),
  timingConstraints: z.string().min(10, "Timing constraints are too short."),
  currentBookingsData: z.string().optional(),
});

export type FormState = {
    message: string;
    fields?: Record<string, string>;
    issues?: string[];
    data?: SuggestOptimizedSchedulesOutput
};


export async function getOptimizedSchedules(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const validatedFields = FormSchema.safeParse({
    passengerDemandData: formData.get('passengerDemandData'),
    shipAvailabilityData: formData.get('shipAvailabilityData'),
    timingConstraints: formData.get('timingConstraints'),
    currentBookingsData: formData.get('currentBookingsData'),
  });

  if (!validatedFields.success) {
    const fields: Record<string, string> = {};
    for (const key of Object.keys(validatedFields.error.format())) {
        fields[key] = validatedFields.error.format()[key as '_input']?._errors.join(', ') ?? 'Invalid field';
    }

    return {
      message: "Invalid form data.",
      fields,
      issues: validatedFields.error.issues.map((issue) => issue.message),
    };
  }

  try {
    const result = await suggestOptimizedSchedules(validatedFields.data as SuggestOptimizedSchedulesInput);
    if (!result) {
        return { message: "Failed to get a response from the AI." };
    }
    return { message: "Successfully generated schedules.", data: result };
  } catch (e) {
    console.error(e);
    return { message: "An unexpected error occurred." };
  }
}
