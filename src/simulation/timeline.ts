import type { WorldState, EpochEvent, EpochTimelineEntry } from '../types/index.js';
import type { LLMProvider } from '../llm/provider.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { logger } from '../utils/logger.js';

export class TimelineService {
  private entries: EpochTimelineEntry[] = [];

  constructor(
    private llm: LLMProvider,
    private prompts: PromptManager,
  ) {}

  async recordEpoch(
    epochNumber: number,
    eraName: string,
    events: EpochEvent[],
    worldState: WorldState,
  ): Promise<EpochTimelineEntry> {
    const prompt = this.prompts.buildEpochNarration({
      epochNumber: String(epochNumber),
      eraName,
      epochEventsJson: JSON.stringify(events),
      worldStateSummary: JSON.stringify(worldState),
    });

    try {
      const result = await this.llm.generateJSON<{
        epochTitle: string | null;
        summary: string;
        notableDiscoveries: string[];
        notableFailures: string[];
        populationNote: string | null;
      }>(prompt, {
        temperature: 0.5,
        maxTokens: 300,
      });

      const entry: EpochTimelineEntry = {
        epochTitle: result.epochTitle,
        summary: result.summary,
        notableDiscoveries: result.notableDiscoveries,
        notableFailures: result.notableFailures,
        populationNote: result.populationNote,
      };

      this.entries.push(entry);
      logger.info(
        `Epoch ${epochNumber} timeline: "${result.epochTitle ?? '(untitled)'}"`,
      );
      return entry;
    } catch (err) {
      logger.error(`Epoch narration failed for epoch ${epochNumber}: ${err}`);
      const fallback: EpochTimelineEntry = {
        epochTitle: null,
        summary: `Epoch ${epochNumber} passed. ${events.length} events occurred.`,
        notableDiscoveries: [],
        notableFailures: [],
        populationNote: null,
      };
      this.entries.push(fallback);
      return fallback;
    }
  }

  getTimeline(): EpochTimelineEntry[] {
    return [...this.entries];
  }

  getRecentEpochs(n: number): EpochTimelineEntry[] {
    return this.entries.slice(-n);
  }

  getTimelineLog(n: number): string {
    const recent = this.getRecentEpochs(n);
    return recent
      .map(
        (e, i) =>
          `Epoch ${this.entries.indexOf(e)}: [${e.epochTitle ?? 'no title'}] ${e.summary.substring(0, 100)}`,
      )
      .join('\n');
  }
}
