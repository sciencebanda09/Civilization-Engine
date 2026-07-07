import { BaseLLMProvider, LLMOptions } from './provider.js';
import { logger } from '../utils/logger.js';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqChoice {
  message: GroqMessage;
}

interface GroqResponse {
  choices: GroqChoice[];
}

export class GroqProvider extends BaseLLMProvider {
  private apiKeys: string[];
  private baseUrl: string;
  private defaultModel: string;
  private keyIndex = 0;
  private smallModel: string;
  private bigModel: string;

  constructor(apiKeys: string | string[], smallModel?: string, bigModel?: string, baseUrl?: string) {
    super();
    this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
    this.baseUrl = baseUrl ?? 'https://api.groq.com/openai/v1';
    this.smallModel = smallModel ?? process.env['GROQ_SMALL_MODEL'] ?? process.env['GROQ_MODEL'] ?? 'llama-3.1-8b-instant';
    this.bigModel = bigModel ?? process.env['GROQ_BIG_MODEL'] ?? process.env['GROQ_MODEL'] ?? 'llama-3.3-70b-versatile';
    this.defaultModel = this.bigModel;
  }

  private getNextKey(): string {
    const key = this.apiKeys[this.keyIndex % this.apiKeys.length]!;
    this.keyIndex++;
    return key;
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    const model = options?.tier === 'small' ? this.smallModel
      : options?.tier === 'big' ? this.bigModel
      : options?.model ?? this.defaultModel;
    const messages: GroqMessage[] = [];

    if (options?.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }

    messages.push({ role: 'user', content: prompt });

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options?.temperature ?? 0.2,
    };

    if (options?.maxTokens) {
      body['max_tokens'] = options.maxTokens;
    }

    const maxRetries = this.apiKeys.length;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const apiKey = this.getNextKey();

      try {
        logger.debug(`Calling Groq model=${model} key=${apiKey.slice(0, 8)}...`);
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text();
          const msg = `Groq API error ${res.status}: ${text}`;

          if (res.status === 429 || res.status === 503) {
            lastError = new Error(msg);
            logger.warn(`Groq key ${apiKey.slice(0, 8)}... rate limited, trying next key`);
            continue;
          }

          throw new Error(msg);
        }

        const data = (await res.json()) as GroqResponse;
        return data.choices[0]!.message.content;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRateLimit = msg.includes('429') || msg.includes('503') || msg.includes('rate limit');

        if (isRateLimit && attempt < maxRetries - 1) {
          lastError = err instanceof Error ? err : new Error(String(err));
          continue;
        }

        throw err;
      }
    }

    throw lastError ?? new Error('Groq generation failed after all retries');
  }
}
