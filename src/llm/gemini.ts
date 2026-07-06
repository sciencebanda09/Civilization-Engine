import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { BaseLLMProvider, LLMOptions } from './provider.js';
import { logger } from '../utils/logger.js';

export class GeminiProvider extends BaseLLMProvider {
  private model: GenerativeModel;
  private modelName: string;

  constructor(apiKey: string, modelName = 'gemini-2.0-flash') {
    super();
    const genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    this.model = genAI.getGenerativeModel({ model: modelName });
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    const modelToUse = options?.model ?? this.modelName;
    if (modelToUse !== this.modelName) {
      const genAI = new GoogleGenerativeAI(
        process.env['GEMINI_API_KEY'] ?? '',
      );
      this.model = genAI.getGenerativeModel({ model: modelToUse });
      this.modelName = modelToUse;
    }

    const generationConfig: Record<string, unknown> = {};
    if (options?.maxTokens) generationConfig['maxOutputTokens'] = options.maxTokens;
    if (options?.temperature !== undefined) generationConfig['temperature'] = options.temperature;

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (options?.systemInstruction) {
      contents.push({
        role: 'user',
        parts: [{ text: `[SYSTEM INSTRUCTION]\n${options.systemInstruction}\n\n[END SYSTEM INSTRUCTION]\n\nNow proceed with the actual task.` }],
      });
    }

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    try {
      logger.debug(`Calling Gemini model=${modelToUse}`);
      const result = await this.model.generateContent({
        contents,
        generationConfig,
      });
      const response = result.response;
      const text = response.text();
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Gemini API call failed: ${msg}`);
      throw new Error(`Gemini generation failed: ${msg}`);
    }
  }
}
