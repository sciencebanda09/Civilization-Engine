import { LLMProvider } from './provider.js';
import { GeminiProvider } from './gemini.js';
import { OllamaProvider } from './ollama.js';
import { GroqProvider } from './groq.js';
import { FallbackLLMProvider } from './fallback.js';
import { MockLLMProvider } from './mock.js';
import { logger } from '../utils/logger.js';

function getEnvArray(key: string): string[] {
  const vals: string[] = [];
  for (let i = 1; ; i++) {
    const k = i === 1 ? key : `${key}${i}`;
    const v = process.env[k]?.trim();
    if (!v) break;
    vals.push(v);
  }
  return vals;
}

export function createProvider(): LLMProvider {
  const groqKeys = getEnvArray('GROQ_API_KEY');
  if (groqKeys.length > 0) {
    const smallModel = process.env['GROQ_SMALL_MODEL']?.trim() || 'llama-3.1-8b-instant';
    const bigModel = process.env['GROQ_BIG_MODEL']?.trim() || process.env['GROQ_MODEL']?.trim() || 'llama-3.3-70b-versatile';
    logger.info(`Creating Groq provider with ${groqKeys.length} key(s): small=${smallModel}, big=${bigModel}`);
    const groq = new GroqProvider(groqKeys, smallModel, bigModel);
    return new FallbackLLMProvider(groq);
  }

  const ollamaModel = process.env['OLLAMA_MODEL']?.trim();
  if (ollamaModel) {
    const smallModel = process.env['OLLAMA_SMALL_MODEL']?.trim() || ollamaModel;
    const bigModel = process.env['OLLAMA_BIG_MODEL']?.trim() || ollamaModel;
    logger.info(`Creating Ollama provider: small=${smallModel}, big=${bigModel}`);
    const ollama = new OllamaProvider(smallModel, bigModel);
    return new FallbackLLMProvider(ollama);
  }

  const apiKey = process.env['GEMINI_API_KEY']?.trim();
  if (apiKey) {
    logger.info('Creating Gemini provider with fallback');
    const gemini = new GeminiProvider(apiKey);
    return new FallbackLLMProvider(gemini);
  }

  logger.info('No API keys found, using mock/deterministic provider');
  return MockLLMProvider.createDemo();
}

export function createProviderFromKey(apiKey: string): LLMProvider {
  const groq = new GroqProvider(apiKey);
  return new FallbackLLMProvider(groq);
}
