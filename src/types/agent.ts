export interface Memory {
  id: string;
  agentId: string;
  summary: string;
  type: MemoryType;
  salience: number;
  linkedEntities: string[];
  createdAt: number;
}

export type MemoryType = 'discovery' | 'failure' | 'debate' | 'social' | 'policy_reaction';

export type Archetype =
  | 'scientist'
  | 'explorer'
  | 'builder'
  | 'merchant'
  | 'warrior'
  | 'diplomat'
  | 'philosopher'
  | 'artist'
  | 'farmer'
  | 'leader'
  | 'inventor'
  | 'scholar'
  | 'crafter'
  | 'survivalist';

export type AgentStatus = 'idle' | 'in_debate' | 'in_experiment' | 'busy';

export interface Agent {
  id: string;
  name: string;
  archetype: Archetype;
  personalityTraits: string[];
  expertise: string[];
  expertiseDescription: string;
  goals: string[];
  relationshipSummary: string;
  status: AgentStatus;
  memoryDigest: string;
  memories: Memory[];
}
