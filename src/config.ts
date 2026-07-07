export interface Config {
  llm: {
    geminiApiKey: string;
    geminiModelPro: string;
    geminiModelNano: string;
    ollamaModel: string;
    ollamaHost: string;
    maxRetries: number;
  };
  simulation: {
    maxEpochs: number;
    agentsPerEpochActive: number;
    maxActiveTeamsPerEpoch: number;
    debateMaxTurns: number;
    teamMinSize: number;
    teamMaxSize: number;
    idleEpochsBeforeStall: number;
  };
  memory: {
    maxMemoriesPerAgent: number;
    memoryDigestLength: number;
    salienceThreshold: number;
  };
  triage: {
    actionProbability: number;
    hypothesisProbability: number;
  };
  debug: {
    checkIntervalEpochs: number;
  };
}

export const defaultConfig: Config = {
  llm: {
    geminiApiKey: process.env['GEMINI_API_KEY'] ?? '',
    geminiModelPro: 'gemini-2.0-flash',
    geminiModelNano: 'gemini-2.0-flash-lite',
    ollamaModel: process.env['OLLAMA_MODEL'] ?? 'llama3.2',
    ollamaHost: process.env['OLLAMA_HOST'] ?? 'http://localhost:11434',
    maxRetries: 2,
  },
  simulation: {
    maxEpochs: 100,
    agentsPerEpochActive: 5,
    maxActiveTeamsPerEpoch: 3,
    debateMaxTurns: 5,
    teamMinSize: 2,
    teamMaxSize: 5,
    idleEpochsBeforeStall: 10,
  },
  memory: {
    maxMemoriesPerAgent: 200,
    memoryDigestLength: 5,
    salienceThreshold: 0.3,
  },
  triage: {
    actionProbability: 0.2,
    hypothesisProbability: 0.05,
  },
  debug: {
    checkIntervalEpochs: 10,
  },
};

export function loadConfig(overrides?: Partial<Config>): Config {
  if (overrides) {
    return deepMerge(defaultConfig, overrides) as Config;
  }
  return { ...defaultConfig };
}

function deepMerge(target: Config, source: Partial<Config>): Config {
  return {
    llm: { ...target.llm, ...source.llm },
    simulation: { ...target.simulation, ...source.simulation },
    memory: { ...target.memory, ...source.memory },
    triage: { ...target.triage, ...source.triage },
    debug: { ...target.debug, ...source.debug },
  } as Config;
}
