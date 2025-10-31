'use server';

/**
 * @fileOverview Automatically classifies the genre of uploaded music using AI.
 *
 * - classifyMusicGenre - A function that classifies the genre of a music file.
 * - ClassifyMusicGenreInput - The input type for the classifyMusicGenre function.
 * - ClassifyMusicGenreOutput - The return type for the classifyMusicGenre function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyMusicGenreInputSchema = z.object({
  musicDataUri: z
    .string()
    .describe(
      'The music file as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected the expected format
    ),
});

export type ClassifyMusicGenreInput = z.infer<typeof ClassifyMusicGenreInputSchema>;

const ClassifyMusicGenreOutputSchema = z.object({
  genre: z.string().describe('The predicted genre of the music.'),
});

export type ClassifyMusicGenreOutput = z.infer<typeof ClassifyMusicGenreOutputSchema>;

export async function classifyMusicGenre(input: ClassifyMusicGenreInput): Promise<ClassifyMusicGenreOutput> {
  return classifyMusicGenreFlow(input);
}

const classifyMusicGenrePrompt = ai.definePrompt({
  name: 'classifyMusicGenrePrompt',
  input: {schema: ClassifyMusicGenreInputSchema},
  output: {schema: ClassifyMusicGenreOutputSchema},
  prompt: `You are an AI music genre classifier. Given a music file, determine its genre.\n\nMusic File: {{media url=musicDataUri}}\n\nGenre:`, // Corrected the Handlebars syntax
});

const classifyMusicGenreFlow = ai.defineFlow(
  {
    name: 'classifyMusicGenreFlow',
    inputSchema: ClassifyMusicGenreInputSchema,
    outputSchema: ClassifyMusicGenreOutputSchema,
  },
  async input => {
    const {output} = await classifyMusicGenrePrompt(input);
    return output!;
  }
);
