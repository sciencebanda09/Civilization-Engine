export interface Memory {
  id: string;
  agentId: string;
  summary: string;
  type: MemoryType;
  salience: number;
  linkedEntities: string[];
  createdAt: number;
}

export type MemoryType = 'discovery' | 'failure' | 'debate' | 'social' | 'policy_reaction' | 'trauma' | 'victory' | 'grudge' | 'trade';

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

export type AgentStatus = 'idle' | 'in_debate' | 'in_experiment' | 'busy' | 'traveling' | 'recovering';

export type PoliticalLeaning = 'expansionist' | 'isolationist' | 'diplomatic' | 'militarist' | 'scholar' | 'traditionalist';
export type AgentGoal = { target: string; priority: number; reason: string };

export interface AgentPersonality {
  trust: number;
  optimism: number;
  riskTolerance: number;
  politicalLeaning: PoliticalLeaning;
  knownFor: string[];
  trauma: string[];
  age: number;
  familyLine: string;
  dynasticReputation: number;
}

export interface AgentOpinion {
  targetId: string;
  trust: number;
  respect: number;
  fear: number;
  lastInteraction: number;
  grudge: string | null;
  debt: number;
}

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
  personality: AgentPersonality;
  opinions: Map<string, AgentOpinion>;
  visibleResources: Record<string, number> | null;
  visibleDiscoveries: string[];
  visibleEnemies: string[];
  optimizationTarget: string;
}
