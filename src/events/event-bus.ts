interface EventPayloadMap {
  epoch_start: { epoch: number; era: string };
  epoch_end: { epoch: number; events: number };
  hypothesis_proposed: { hypothesisId: string; title: string; proposerId: string };
  team_formed: { teamId: string; hypothesisId: string; memberIds: string[] };
  experiment_resolved: { teamId: string; outcome: 'success' | 'partial' | 'failure'; discoveryTitle: string | null };
  catastrophe: { type: string; description: string; severity: number };
  agent_status_change: { agentId: string; oldStatus: string; newStatus: string };
  relationship_change: { agentId1: string; agentId2: string; delta: number };
  era_transition: { from: string; to: string; epoch: number };
  achievement_unlocked: { achievementId: string; title: string };
}

export type SimEvent = {
  [K in keyof EventPayloadMap]: { type: K } & EventPayloadMap[K];
}[keyof EventPayloadMap];

type Listener<K extends keyof EventPayloadMap> = (event: EventPayloadMap[K]) => void;

export class EventBus {
  private listeners = new Map<string, Set<Function>>();

  on<K extends keyof EventPayloadMap>(type: K, callback: Listener<K>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback as Function);
    return () => {
      this.listeners.get(type)?.delete(callback as Function);
    };
  }

  emit<K extends keyof EventPayloadMap>(event: { type: K } & EventPayloadMap[K]): void {
    const type = event.type;
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(event);
        } catch (e) {
          console.error(`[EventBus] Error in listener for "${type}":`, e);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export class EventHistory {
  private events: SimEvent[] = [];

  record(event: SimEvent): void {
    this.events.push(event);
  }

  getAll(): SimEvent[] {
    return [...this.events];
  }

  getByType<K extends SimEvent['type']>(type: K): Extract<SimEvent, { type: K }>[] {
    return this.events.filter((e): e is Extract<SimEvent, { type: K }> => e.type === type);
  }

  getByEpoch(epoch: number): SimEvent[] {
    return this.events.filter(e => {
      if ('epoch' in e) {
        return (e as any).epoch === epoch;
      }
      return false;
    });
  }

  clear(): void {
    this.events = [];
  }
}
