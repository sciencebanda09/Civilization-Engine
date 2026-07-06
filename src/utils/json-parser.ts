export class JSONParseError extends Error {
  constructor(message: string, public readonly raw: string) {
    super(message);
    this.name = 'JSONParseError';
  }
}

export function stripCodeFences(input: string): string {
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  return cleaned.trim();
}

export function safeParseJSON<T>(input: string): T {
  const cleaned = stripCodeFences(input);
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new JSONParseError(
      `Failed to parse JSON: ${(err as Error).message}`,
      cleaned,
    );
  }
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function convertKeysRecursive(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(convertKeysRecursive);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.includes('_') ? snakeToCamel(key) : key;
      result[camelKey] = convertKeysRecursive(obj[key]);
    }
    return result;
  }
  return value;
}

export function parseLLMJSON<T>(input: string): T {
  const cleaned = stripCodeFences(input);
  try {
    const parsed = JSON.parse(cleaned);
    return convertKeysRecursive(parsed) as T;
  } catch (err) {
    throw new JSONParseError(
      `Failed to parse JSON: ${(err as Error).message}`,
      cleaned,
    );
  }
}

export function parseWithRetry<T>(
  raw: string,
  repair: () => Promise<string>,
  maxRetries = 2,
): Promise<T> {
  return (async (): Promise<T> => {
    let current = raw;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const cleaned = stripCodeFences(current);
        return JSON.parse(cleaned) as T;
      } catch (err) {
        if (attempt === maxRetries) {
          throw new JSONParseError(
            `Failed to parse JSON after ${maxRetries + 1} attempts: ${(err as Error).message}`,
            current,
          );
        }
        current = await repair();
      }
    }
    throw new JSONParseError('Unreachable', current);
  })();
}
