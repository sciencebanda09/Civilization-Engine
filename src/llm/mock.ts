import { BaseLLMProvider, LLMOptions } from './provider.js';

export class MockLLMProvider extends BaseLLMProvider {
  private responseMap: Map<string, string> = new Map();
  private defaultResponse: string;

  constructor(defaultResponse = '{"status": "ok"}') {
    super();
    this.defaultResponse = defaultResponse;
  }

  registerResponse(promptSubstring: string, response: string): void {
    this.responseMap.set(promptSubstring, response);
  }

  async generate(prompt: string, _options?: LLMOptions): Promise<string> {
    for (const [substring, response] of this.responseMap) {
      if (prompt.includes(substring)) {
        const parsed = JSON.parse(response) as Record<string, unknown>;
        const allIds = prompt.match(/agent_\d+/g);
        if (substring === 'team-formation reasoner' && allIds && allIds.length > 0) {
          parsed['selected_agent_ids'] = [allIds[0]!];
        }
        if (substring === 'impartial world simulator' && allIds && allIds.length > 0) {
          const notes = parsed['agent_memory_notes'] as Array<Record<string, unknown>> | undefined;
          if (notes && notes.length > 0) {
            notes[0]!['agent_id'] = allIds[0]!;
          }
        }
        return JSON.stringify(parsed);
      }
    }
    return this.defaultResponse;
  }

  static createDemo(): MockLLMProvider {
    const mock = new MockLLMProvider(
      JSON.stringify({
        epoch_title: null,
        summary: 'A quiet epoch passed with little notable change.',
        notable_discoveries: [],
        notable_failures: [],
        population_note: null,
      }),
    );

    mock.registerResponse(
      'fast, cheap decision filter',
      JSON.stringify({
        wants_to_act: true,
        action_type: 'propose_hypothesis',
        reason: 'New resources suggest an opportunity',
        urgency: 'medium',
      }),
    );

    mock.registerResponse(
      'spotted an opportunity for progress',
      JSON.stringify({
        hypothesis_title: 'Test Stone Hardness',
        hypothesis_description: 'We should test different stones to find which is hardest for toolmaking.',
        rationale: 'As a toolmaker, I know stone quality varies with color and grain.',
        required_expertise: ['mining', 'toolmaking'],
        estimated_difficulty: 'low',
        resources_needed: ['stone samples'],
      }),
    );

    mock.registerResponse(
      'team-formation reasoner',
      JSON.stringify({
        team_formed: true,
        selected_agent_ids: [],
        team_rationale: 'Hypothesis is simple enough for the proposer alone.',
        excluded_notable_candidates: [],
      }),
    );

    mock.registerResponse(
      'working debate with your research team',
      JSON.stringify({
        dialogue: 'I think we should focus on the flaking properties of each stone type.',
        stance: 'support',
        modification_proposed: null,
        final_confidence: 0.7,
      }),
    );

    mock.registerResponse(
      'neutral synthesis reasoner',
      JSON.stringify({
        final_hypothesis: 'Flint with high silica content produces the sharpest edges.',
        experiment_design: 'Collect five stone types, test flaking, record edge sharpness.',
        team_confidence: 0.65,
        identified_risks: ['Sample size too small', 'Subjective sharpness measurement'],
        resources_committed: ['stone samples', 'labor'],
      }),
    );

    mock.registerResponse(
      'impartial world simulator',
      JSON.stringify({
        outcome: 'success',
        narrative: 'The team tested various stones and discovered that dark flint produces the sharpest, most durable edges \u2014 a breakthrough for toolmaking.',
        discovery: {
          title: 'Flint Knapping',
          description: 'Dark flint can be flaked into extremely sharp edges for cutting tools.',
          world_state_delta: { 'tool_quality': '+2', 'flag_flint_known': 'true' },
          enabled_future_domains: ['advanced_toolmaking', 'weapon_crafting'],
        },
        lesson_learned: 'Systematic material testing yields reliable knowledge.',
        agent_memory_notes: [
          { agent_id: 'agent_1', memory_summary: 'I discovered that dark flint makes the sharpest tools.' },
        ],
      }),
    );

    mock.registerResponse(
      'Compress the following event',
      JSON.stringify({
        memory_summary: 'I tested stone hardness and discovered flint works best for tools.',
        memory_type: 'discovery',
        salience: 0.8,
        linked_entities: [],
      }),
    );

    mock.registerResponse(
      'civilization\'s chronicler',
      JSON.stringify({
        epoch_title: null,
        summary: 'A quiet epoch passed with little notable change.',
        notable_discoveries: [],
        notable_failures: [],
        population_note: null,
      }),
    );

    return mock;
  }
}
