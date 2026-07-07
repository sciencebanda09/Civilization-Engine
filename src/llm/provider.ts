import { parseLLMJSON } from '../utils/json-parser.js';

export interface LLMProvider {
  generate(prompt: string, options?: LLMOptions): Promise<string>;
  generateJSON<T>(prompt: string, options?: LLMOptions): Promise<T>;
}

export interface LLMOptions {
  model?: string;
  tier?: 'small' | 'big';
  maxTokens?: number;
  temperature?: number;
  systemInstruction?: string;
}

export abstract class BaseLLMProvider implements LLMProvider {
  abstract generate(prompt: string, options?: LLMOptions): Promise<string>;

  async generateJSON<T>(prompt: string, options?: LLMOptions): Promise<T> {
    const result = await this.generate(prompt, {
      ...options,
      temperature: options?.temperature ?? 0.2,
    });
    return parseLLMJSON<T>(result);
  }
}
