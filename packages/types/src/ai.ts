export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiProvider {
  chat(messages: AiMessage[], systemPrompt: string): Promise<string>;
}
