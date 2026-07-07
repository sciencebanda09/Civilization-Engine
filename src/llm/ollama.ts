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
  private smallModel: string;
  private bigModel: string;

  constructor(smallModel?: string, bigModel?: string, host?: string) {
    super();
    this.host = host ?? process.env['OLLAMA_HOST'] ?? 'http://localhost:11434';
    this.smallModel = smallModel ?? process.env['OLLAMA_SMALL_MODEL'] ?? process.env['OLLAMA_MODEL'] ?? 'llama3.2';
    this.bigModel = bigModel ?? process.env['OLLAMA_BIG_MODEL'] ?? process.env['OLLAMA_MODEL'] ?? 'llama3.2';
    this.model = this.bigModel;
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    const model = options?.tier === 'small' ? this.smallModel
      : options?.tier === 'big' ? this.bigModel
      : options?.model ?? this.model;
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
