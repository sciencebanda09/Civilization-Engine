const DISCOVERY_TEMPLATES = [
  '{agent} peered at the world with fresh eyes and {discovery} was born.',
  'Through patient trial and error, {agent} brought forth {discovery}.',
  'A spark of insight visited {agent} — {discovery} emerged from the mind into reality.',
  'While the others slept, {agent} worked by firelight and {discovery} took shape.',
  'The tribe gathered as {agent} revealed {discovery} for the first time.',
  '{agent}\'s hands moved with sudden purpose, and {discovery} came into being.',
  'A breakthrough! {agent} shouted for the elders to witness {discovery}.',
  'In the quiet of morning, {agent} understood — {discovery} was the answer.',
];

const HYPOTHESIS_TEMPLATES = [
  '{agent} proposed a daring new idea: maybe there was more to the world than they knew.',
  'Stroking their chin, {agent} wondered aloud about the mysteries of their craft.',
  '{agent} gathered the thinkers and posed a question none had thought to ask.',
  'A new thought stirred in {agent}\'s mind — what if things could be done differently?',
  '{agent} scratched diagrams in the dirt, trying to make sense of a pattern.',
];

const CATASTROPHE_TEMPLATES = [
  'Dark clouds gathered as {catastrophe} swept through the settlement.',
  'Panic gripped the tribe when {catastrophe} struck without warning.',
  'The earth groaned and {catastrophe} unleashed its fury upon the people.',
  'A wail rose from the huts — {catastrophe} had come for them.',
];

const FACTION_TEMPLATES = [
  'Whispers spread through the camp like wildfire. {faction1} and {faction2} grew wary.',
  'Old grudges surfaced between {faction1} and {faction2} during the evening council.',
  'A heated argument erupted. {faction1} accused {faction2} of hoarding knowledge.',
  'The rift deepened. {faction1} no longer shared fire with {faction2}.',
];

const NPC_STORIES = [
  'An elder sat by the river, recounting the great flood of their childhood. The children listened, wide-eyed.',
  'A young mother wove reeds into a basket, humming a tune as old as the hills.',
  'Two teenagers raced to the tallest tree and back, their laughter echoing through the camp.',
  'A hunter returned with news of strange tracks near the eastern ridge — large and unfamiliar.',
  'A child pointed at the stars and asked, "What keeps them from falling?" No one had an answer.',
  'The oldest member of the tribe sharpened a bone tool by the fire, hands steady despite their years.',
  'Lovers met in secret at the river bend, exchanging tokens carved from stone.',
  'A dispute over a fishing spot was settled by the elders under the great oak.',
  'Someone spotted smoke on the horizon, but it faded before anyone could investigate.',
  'A travelling storyteller arrived with tales of a distant land where stone grew from the ground like trees.',
];

const SEASONAL_NARRATIVES: Record<string, string[]> = {
  spring: [
    'Spring rain softened the earth. Seeds stirred beneath the mud.',
    'Blossoms erupted across the valley. The air grew sweet and thick.',
    'Streams swelled with meltwater. Game returned to the lowlands.',
  ],
  summer: [
    'The sun beat down relentlessly. The river ran low.',
    'Summer heat ripened the berries but parched the fields.',
    'Long days meant more work, but also more food for the stores.',
  ],
  autumn: [
    'Leaves painted the valley in fire and gold. Harvest time.',
    'The air turned crisp. The tribe prepared for the long cold ahead.',
    'Mushrooms and nuts were gathered by the basketful.',
  ],
  winter: [
    'Snow fell silent and deep. The tribe huddled close.',
    'The river froze. Food grew scarce. Winter tested them all.',
    'Bitter winds howled through the palisade. Only the stored grain kept them alive.',
  ],
};

const ENEMY_RAID_TEMPLATES = [
  'Strangers emerged from the treeline, their eyes hungry and hands clenched.',
  'Screams pierced the night as raiders descended upon the outer huts.',
  'A war party from beyond the hills attacked at dawn, catching the sentries off guard.',
];

const PEACE_TEMPLATES = [
  'The strangers lowered their weapons. One stepped forward, palm open. A gesture of peace.',
  'Emissaries from the rival camp arrived with gifts — rare salt and cured meat.',
  'A truce was struck under the old sycamore. Both sides drank from the same cup.',
];

export function narrateEvent(event: string, agents: { name: string; archetype: string }[]): string {
  const agent = agents.length > 0 ? agents[Math.floor(Math.random() * agents.length)]! : { name: 'Someone', archetype: 'human' };

  if (/discov|discovered|breakthrough|invented|mastered/i.test(event)) {
    const discName = event.replace(/.*?:\s*/, '').substring(0, 40) || 'a new discovery';
    const tpl = DISCOVERY_TEMPLATES[Math.floor(Math.random() * DISCOVERY_TEMPLATES.length)]!;
    return tpl.replace('{agent}', agent.name).replace('{discovery}', discName);
  }

  if (/hypothesis|proposed|wondered|question/i.test(event)) {
    const tpl = HYPOTHESIS_TEMPLATES[Math.floor(Math.random() * HYPOTHESIS_TEMPLATES.length)]!;
    return tpl.replace('{agent}', agent.name);
  }

  if (/catastrophe|starv|famine|flood|drought|plague|blizzard|earthquake|fire|storm/i.test(event)) {
    const cName = event.replace(/.*?:\s*/, '').substring(0, 30) || 'a disaster';
    const tpl = CATASTROPHE_TEMPLATES[Math.floor(Math.random() * CATASTROPHE_TEMPLATES.length)]!;
    return tpl.replace('{catastrophe}', cName);
  }

  if (/tension|rivalry|faction/i.test(event)) {
    const tpl = FACTION_TEMPLATES[Math.floor(Math.random() * FACTION_TEMPLATES.length)]!;
    const names = agents.length >= 2
      ? [agents[0]!.name, agents[agents.length - 1]!.name]
      : ['One group', 'Another'];
    return tpl.replace('{faction1}', names[0]!).replace('{faction2}', names[1]!);
  }

  if (/raid|attack|war|enemy|stranger/i.test(event)) {
    return ENEMY_RAID_TEMPLATES[Math.floor(Math.random() * ENEMY_RAID_TEMPLATES.length)]!;
  }

  if (/peace|truce|alliance|trade|gift/i.test(event)) {
    return PEACE_TEMPLATES[Math.floor(Math.random() * PEACE_TEMPLATES.length)]!;
  }

  // Fallback: just add flavor
  const fallbacks = [
    `A murmur ran through the crowd. ${event}`,
    `The elders conferred. ${event}`,
    `News arrived at dusk: ${event.toLowerCase()}`,
    `In the village square, a proclamation: ${event}`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)]!;
}

export function getRandomCitizenStory(): string {
  return NPC_STORIES[Math.floor(Math.random() * NPC_STORIES.length)]!;
}

export function getSeasonalNarrative(season: string): string {
  const arr = SEASONAL_NARRATIVES[season];
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function getAgentQuote(name: string, archetype: string): string {
  const QUOTES: Record<string, string[]> = {
    inventor: ['"If it doesn\'t work, make it again."', '"I saw it in a dream first."', '"The stone wants to be shaped."'],
    scholar: ['"Write it down before you forget."', '"There is wisdom in the old ways."', '"Let me study this further."'],
    explorer: ['"What lies beyond the ridge?"', '"The map is never complete."', '"Smoke on the horizon — let\'s go."'],
    leader: ['"We stand together or fall apart."', '"For the good of the tribe."', '"I will carry the heaviest stone."'],
    crafter: ['"Make it beautiful and it will be strong."', '"The hands remember what the mind forgets."', '"Every tool tells a story."'],
    warrior: ['"Peace is earned through strength."', '"I stand at the edge, so others sleep."', '"The spear remembers every fight."'],
    diplomat: ['"Better to trade than to fight."', '"Let me speak with them first."', '"A shared meal ends most quarrels."'],
    philosopher: ['"What is a tool but a thought made solid?"', '"The stars ask questions we cannot answer."', '"Is fire a thing or a process?"'],
  };
  const qs = QUOTES[archetype] ?? ['"Hmm."', '"Interesting."', '"Let us proceed."'];
  return qs[Math.floor(Math.random() * qs.length)]!;
}
