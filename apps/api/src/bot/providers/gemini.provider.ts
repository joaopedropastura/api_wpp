import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { AiProvider, AiMessage } from '@repo/types';

@Injectable()
export class GeminiProvider implements AiProvider {
  private model: ReturnType<ReturnType<typeof createGoogleGenerativeAI>>;

  constructor() {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_AI_API_KEY ?? '',
    });
    this.model = google('gemini-2.0-flash');
  }

  async chat(messages: AiMessage[], systemPrompt: string): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return text;
  }
}
