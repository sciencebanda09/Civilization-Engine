import { BaseLLMProvider, LLMOptions } from './provider.js';
import { logger } from '../utils/logger.js';

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  message: OllamaChatMessage;
  done: boolean;
}

export class OllamaProvider extends BaseLLMProvider {
  private host: string;
  private model: string;

  constructor(model?: string, host?: string) {
    super();
    this.host = host ?? process.env['OLLAMA_HOST'] ?? 'http://localhost:11434';
    this.model = model ?? process.env['OLLAMA_MODEL'] ?? 'llama3.2';
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    const model = options?.model ?? this.model;
    const messages: OllamaChatMessage[] = [];

    if (options?.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }

    messages.push({ role: 'user', content: prompt });

    const body: Record<string, unknown> = {
      model,
      messages,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
      },
    };

    if (options?.maxTokens) {
      (body.options as Record<string, unknown>)['num_predict'] = options.maxTokens;
    }

    try {
      logger.debug(`Calling Ollama model=${model} at ${this.host}`);
      const res = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama API error ${res.status}: ${text}`);
      }

      const data = (await res.json()) as OllamaChatResponse;
      return data.message.content;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Ollama call failed: ${msg}`);
      throw new Error(`Ollama generation failed: ${msg}`);
    }
  }
}
