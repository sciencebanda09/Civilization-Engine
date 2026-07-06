<h1 align="center">🏛️ Civilization Engine</h1>

<p align="center">
  <strong>v1.0</strong> — <em>Multi-agent AI civilization simulator for the terminal</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/AI-Groq%20%7C%20Fallback-orange?style=flat-square" alt="AI">
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="Status">
</p>

<p align="center">
  <em>Multi-agent AI civilization simulator — pure terminal, emergent gameplay</em>
</p>

<br>

<p align="center">
  <a href="#screenshots">📸 Screenshots</a> ·
  <a href="#quick-start">🚀 Quick Start</a> ·
  <a href="#gameplay">🎮 Gameplay</a> ·
  <a href="#features">✨ Features</a> ·
  <a href="#scenarios">🌍 Scenarios</a>
</p>

<br>

---

## 📸 Screenshots

<p align="center">
  <img src="assets/Screenshot%202026-07-07%20024322.png" width="400" alt="Council of Elders decision screen">
  <img src="assets/Screenshot%202026-07-07%20024312.png" width="400" alt="Epoch overview with resources and map">
</p>
<p align="center">
  <em>Left: Council decisions shape your civilization's fate · Right: Seasonal epoch display with dynamic terrain map</em>
</p>

<br>

<p align="center">
  <img src="assets/Screenshot%202026-07-07%20024300.png" width="400" alt="Agent chatter and breaking news popup">
  <img src="assets/Screenshot%202026-07-07%20024250.png" width="400" alt="End-game chronicles and history book">
</p>
<p align="center">
  <em>Left: Agents converse with emotions and opinions · Right: Full civilization chronicles at game end</em>
</p>

<br>

<p align="center">
  <img src="assets/Screenshot%202026-07-07%20024203.png" width="400" alt="Discovery breakthrough announcement">
  <img src="assets/Screenshot%202026-07-07%20024151.png" width="400" alt="Newspaper printout">
</p>
<p align="center">
  <em>Left: Breaking news popup for major discoveries · Right: The Civilization Times newspaper</em>
</p>

```
  +------------------------------------------+
  |         CIVILIZATION ENGINE v1.0         |
  |    AI agents . Interactive . Terminal    |
  +------------------------------------------+

  Year 8/20    Bronze Age    Summer
  Pop: 134     Discoveries: 3

  Kael . Doren . Mira . Thane . Elara

  Food  ###########..  84
  Wood  ####........   42
  Stone ######......   63

  Innovators  24    Scholars  19
  Builders    14    Threat    55%

  + Agriculture discovered
  ! Raid -- Grey Wolves attack! Lost 8
  > Kael asks: "Can we channel the river?"
```

## Overview

**Civilization Engine** is an interactive simulation where five AI agents — each with unique personalities, expertise, and goals — build a society from scratch. You don't just watch. Every few years, you sit on the Council of Elders and make decisions that shape your civilization's fate.

Will you invest in agriculture to stave off famine? Fortify defenses against raiding tribes? Fund research to discover bronze-working? Or crush a rival faction before they grow too powerful?

Your choices echo across generations.

## Quick Start

```bash
# Clone and install
git clone https://github.com/sciencebanda09/Civilization-Engine.git
cd Civilization-Engine
npm install

# Play with the interactive scenario picker
npm run play

# Or launch directly with a scenario and epoch count
npm run play -- peaceful_valley 10

# Run the test suite (93 assertions)
npm test
```

No API keys required. The simulation runs out of the box with a built-in fallback provider.

---

## Gameplay

### The Simulation Loop

Each **epoch** (year) advances through 4 **seasonal micro-epochs** — each with distinct weather, resource flows, and visual feedback:

| Season | Effect | Map Color | Player Sees |
|--------|--------|-----------|-------------|
| 🌸 **Spring** | Planting +10 food | Green | Agent chatter, council invites |
| ☀️ **Summer** | Growth or drought risk | Golden | Breaking news popups, wildfire warnings |
| 🍂 **Autumn** | Harvest +25 food, +15 wood | Orange | Event cascades, dynasty updates |
| ❄️ **Winter** | Scarcity −15 food, −5 wood | White | Disaster rolls, end-of-year newspaper |

Between seasons, **agents converse** — they argue, agree, gossip, and react to recent events based on their personalities and opinions of each other. You can press **[T]** to talk to any agent mid-epoch, **[D]** to issue an urgent decree, or **[H]** to browse history.

### Core Systems Tick

1. **Economy** — Resources are produced and consumed through supply chains. Population grows or starves.
2. **Disasters** — Floods, droughts, plagues, raids, and earthquakes can strike at any moment.
3. **Event Cascades** — Events chain into narratives (drought → famine → blame → revolt) across multiple seasons.
4. **Agent Actions** — AI agents triage, form teams, debate hypotheses, and make discoveries.
5. **Faction Update** — Influence shifts based on events and agent reputations.
6. **Civilization Diplomacy** — Autonomous civilizations trade, ally, spy, and declare war.
7. **Religion & Culture** — Faiths emerge from events, traditions form, holy sites are declared.

### Interactive Decisions

The simulation pauses for you at critical moments:

| Decision | Trigger | What You Choose |
|----------|---------|----------------|
| **Council of Elders** | Every 4 epochs | A strategic focus: Food Production, Military Defense, Scientific Research, Territorial Expansion, Foreign Trade, Warfare, or Diplomatic Outreach |
| **Crisis Response** | When disaster strikes | A course of action — play it safe, gamble on a bold solution, or exploit the situation |
| **Tech Direction** | When a discovery is near | Nudge scholars toward a specific field |

Each choice has real consequences. Boost defense too early and your economy may stagnate. Neglect research and enemy tribes will outpace you.

### Example: Council Decision

```
  +--------------------------------------------+
  |  The Council of Elders convenes...         |
  |                                            |
  |  "The river floods our southern fields.    |
  |   Half the grain stores are ruined.        |
  |   What should we do, elder?"               |
  |                                            |
  |  [1] Build levees -- secure next harvest   |
  |  [2] Send expeditions south -- find land   |
  |  [3] Ration food -- weather the storm      |
  |  [4] Blame the Builders -- consolidate     |
  |       power                                |
  +--------------------------------------------+
```

### Example: Crisis Response

```
  +--------------------------------------------+
  |  DROUGHT has struck the valley!            |
  |                                            |
  |  "The wells have run dry. Crops are        |
  |   withering. The elders are panicking."    |
  |                                            |
  |  [1] Dig deeper wells -- safe, steady      |
  |  [2] Sacrifice to the ancestors -- risky,  |
  |       high reward                          |
  |  [3] Raid the Grey Wolves' oasis --        |
  |       dangerous, fills granaries           |
  +--------------------------------------------+
```

---

## Scenarios

Six starting worlds, each with a unique challenge:

| Scenario | Difficulty | Agents | Starting Era | Description |
|----------|-----------|--------|-------------|-------------|
| `peaceful_valley` | Easy | 5 | Stone Age | A lush valley with abundant resources. Perfect for learning the mechanics. |
| `rich_valley` | Normal | 5 | Stone Age | Fertile valley with booming population. Rapid growth brings new problems. |
| `island_colony` | Normal | 3 | Stone Age | A small island far from any mainland. No escape. No help. |
| `desert_oasis` | Hard | 3 | Stone Age | A tiny oasis in a vast desert. Water and wood are precious. |
| `volcanic_winter` | Hard | 3 | Stone Age | The sun is blotted out. Crops freeze. Survival is everything. |
| `iron_fist` | Extreme | 5 | Iron Age | Oppression. Slavery. You start with iron and a hunger for freedom. |

---

## Technology Tree

28 technologies spanning 4 eras. Each discovery unlocks new capabilities and requires specific prerequisites — for example, Bronze requires both Copper AND Tin smelting plus Trade routes.

```
  Stone Age         Copper Age        Bronze Age        Iron Age
  ----------        ----------        ----------        --------
  Fire              Smelting          Bronze Smithing   Iron Smelt
  Stone Tools       Copper Tools      Adv. Weapons      Steel Making
  Shelter           Irrigation        Chariots          Engineering
  Hunting           Animal Domes.     Writing           Philosophy
  Gathering         Pottery           Mathematics       Law
  Clothing          Weaving           Astronomy         Medicine
  Farming           Trade
  Language                                      +------ WIN CONDITION
  Basic Construction                            |    Reach Iron Age
                                                 +--  Population > 80
```

Technologies have prerequisites. You can't research Bronze Smithing without first discovering Smelting and Copper Tools. The tech tree is visible in-game and updates as discoveries are made.

---

## ✨ Features

### Dynamic Agent Personalities
Each agent has a persistent personality (trust, optimism, risk tolerance, political leaning) that shapes their behavior. Traits evolve through trauma (disasters reduce trust) and victory (discoveries boost optimism). Agent names in the UI are color-coded by trust level.

### Natural Language Chatter
Agents converse with each other every season using the built-in conversation engine. Dialogue reflects their relationship (allies are warm, rivals are hostile) and reacts to current events — droughts trigger worried exchanges, discoveries spark excitement.

### Breaking News Popups
Major events trigger full-screen news cards:
- **Discoveries** → Green ASCII art with quote
- **Wars/Raids** → Red alert with crossed swords
- **Disasters** → Hazard warning with skull icon
- **Era Advancements** → Gold bordered with star

### Event Cascades
Events chain into multi-season narratives:
```
Drought → Food < 30 → Famine → Agents blame each other → Trust drops → Revolt
Discovery → Economic boom → Population growth + trade surplus
Victory → Confidence surge → Defense boost + population increase
```

### Emergent Religions & Culture
Religions spawn from major events (disasters create "Sky Worship," discoveries create "The Way of Knowing"). Cultural traditions emerge independently (Harvest Festival, Ancestor Night, Warrior Coming of Age). Faiths grow followers, declare holy sites, and can undergo schisms.

### Autonomous Civilizations
Independent AI civilizations spawn at map edges with distinct archetypes (tribal, merchant, militarist, scholar, nomad). They form diplomacy states: neutral → friendly → allied (or hostile → war), establish trade routes, send tribute, and conduct espionage.

### Dynasty System
Agents belong to family lines. Achievements build dynastic reputation that carries across generations. The end-game report shows each dynasty's living members, dead members, and known accomplishments.

### Climate & Environment
Population growth drives CO₂ rise, temperature increase, deforestation, and pollution. Cross environmental thresholds to trigger climate events. The dynamic map shows deforestation visually.

### History Book & Newspapers
Every major event is recorded in the **History Book** (viewable mid-game with [H]). Every 5 years, **The Civilization Times** newspaper prints with sections: Front Page, Science & Discovery, Society, Market Report, and Historical Reflection.

---

## Factions & Politics

Agents don't work in harmony. They form factions based on their personalities and goals:

- **Innovators** — Driven by discovery and progress (inventors, explorers)
- **Scholars** — Value knowledge and preservation (scholars, sages)
- **Builders** — Focus on infrastructure and defense (crafters, leaders)
- **Militarists** — Believe in strength through conquest (warriors)

Factions gain and lose influence based on events, discoveries, and your council decisions. A faction with high influence can accelerate research in their field — but neglected factions may sow dissent or even attempt a coup.

---

## World Systems

### Terrain Map

A procedurally generated 20×6 world with rivers, forests, mountains, and settlements. The map evolves as your civilization builds and expands.

```
  ~~TT~~T^TT~~TT##TT~~
  ~TTTTTT^TTT~TTT#TT~~
  ~~TTTTTTT^^~TTTTTT~~
```

### Weather & Seasons

The world cycles through **4 seasons per year**, each rendered with distinct terrain colors:

- **🌸 Spring** — Planting: +10 food, heavy rains bring abundance, dry springs hinder sowing
- **☀️ Summer** — Growth or drought: normal years +10 food, droughts −12 food, heat waves −8 food
- **🍂 Autumn** — Harvest: +25 food, +15 wood, +5 stone — the most productive season
- **❄️ Winter** — Scarcity: −15 food (or −30 in bitter cold), −5 wood, no growth

The dynamic map reflects all of this — terrain changes color per season, drought browns the land, deforestation turns forest to plains, wildfires flicker with animated `F` tiles, and walls grow visually thicker as you fortify.

### Climate System

Population growth drives measurable climate change:
- **CO₂** rises from 280 ppm baseline with population
- **Temperature** increases with CO₂
- **Deforestation** spreads as the settlement expands
- **Pollution** accumulates with industry

Cross thresholds to trigger climate events: droughts, soil erosion, and heat waves.

### Enemy Tribes

Hostile tribes lurk beyond your borders. They raid, scout, and trade based on their hostility level. Successful raids cost you villagers and resources. Strong defenses deter them — but provoke larger assaults.

```
  ! Raid -- Grey Wolves attacked!
    Defender: Mira (explorer) fought back
    Damage: 12   Lost: 8 villagers
    The Grey Wolves retreat with stolen food.

  Enemy taunts:
    "Your walls are twigs. We will feast tonight."
```

---

## Achievements & Legacy

### 10 Achievements

Earned across all playthroughs:

| Achievement | Requirement |
|------------|------------|
| First Steps | Complete 5 epochs |
| Bronze Age | Reach the Bronze Age |
| Iron Age | Reach the Iron Age |
| Population Boom | Reach 150 population |
| Scholar | Discover 10 technologies |
| Defender | Win 10 raids |
| Explorer | Try 4 different scenarios |
| Silver Tongue | Resolve 10 crises peacefully |
| Conqueror | Win a game |
| Survivor | Survive past epoch 20 |

### Legacy System

Heroes from each run are recorded as legends. Their achievements — discoveries made, battles won, crises averted — become part of your civilization's mythology. Start a new game and your former heroes appear in the narrative as ancestral figures.

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run play` | Launch interactive game with scenario picker |
| `npm run play -- <scenario> <epochs>` | Direct launch, skips picker |
| `npm run analyze` | Run multiple simulations for statistical comparison |
| `npm test` | Run end-to-end integration test suite (93 assertions) |
| `npm run lint` | Type-check the codebase (`tsc --noEmit`) |

### Examples

```bash
# Classic start, 10 years
npm run play -- peaceful_valley 10

# Survival challenge, 20 years
npm run play -- volcanic_winter 20

# Extreme mode, 15 years
npm run play -- iron_fist 15

# Batch analysis (runs 10 simulations)
npm run analyze
```

---

## Configuration

### API Keys (Optional)

The simulation uses **Groq's free tier** with automatic load balancing across multiple API keys. When all keys are rate-limited, a built-in fallback provider generates varied template responses so the simulation never stalls.

Copy `.env.example` to `.env` and add your keys:

```env
GROQ_API_KEY=gsk_your_key_here
GROQ_API_KEY2=gsk_your_key_here
GROQ_API_KEY3=gsk_your_key_here
GROQ_API_KEY4=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
LOG_LEVEL=info
```

> No API keys are required. The simulation runs in fallback mode without any configuration.

### Other Options

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log verbosity: `info`, `debug`, `warn`, `error`, `none` |

---

## Architecture

```mermaid
graph TD
    UI[Terminal UI] --> Game[Game Systems]
    Game --> Sim[Simulation Core]
    Sim --> Agents[AI Agents]
    Sim --> Economy[Economy Engine]
    Sim --> World[World Systems]
    World --> Map[Terrain Map]
    World --> Weather[Weather & Seasons]
    World --> Enemies[Enemy Tribes]
    Agents --> LLM[LLM Providers]
    LLM --> Groq[Groq API]
    LLM --> Fallback[Fallback Provider]
    Agents --> Factions[Faction Politics]
    Agents --> Memory[Agent Memory]
    Game --> Tech[Tech Tree]
    Game --> Decisions[Player Decisions]
    Game --> Narrative[Narrative Engine]
    Game --> Legacy[Legacy System]
    Game --> Achievements[Achievements]
    Sim --> Events[Event Bus]
    Events --> Catastrophes[Disasters]
    Events --> Discoveries[Discoveries]
    subgraph "Data"
        Chapters[Save/Load]
        History[History Tracker]
    end
```

```
Civilization-Engine/
├── src/
│   ├── ui/                   # Terminal rendering: ANSI toolkit, chatter box, news popups
│   ├── game/                 # Game systems: decisions, tech tree, win/loss, game-session, dynasty
│   ├── simulation/           # Core loop: orchestrator, economy, disasters, event-cascade, debate
│   ├── factions/             # Faction politics: rivalries, influence tracking
│   ├── map/                  # Procedural terrain, dynamic seasonal renderer, resource deposits
│   ├── world/                # Weather/seasons, enemy tribes, autonomous civilizations, religion
│   ├── scenarios/            # 6 scenario definitions with custom world states
│   ├── narrative/            # Story engine, history book, newspapers, agent portraits
│   ├── llm/                  # Groq, Gemini, Ollama, mock, fallback providers
│   ├── prompts/              # LLM prompt templates for agents, oracle, triage
│   ├── agents/               # Agent personalities, opinions, conversation, memory
│   ├── oracle/               # Causal analysis and counterfactual engine
│   ├── events/               # Event bus for internal messaging
│   ├── types/                # TypeScript type definitions (agent, world, experiment)
│   ├── utils/                # JSON parser, logger
│   └── index.ts              # Barrel exports (60+ public APIs)
├── examples/
│   ├── play.ts               # Interactive CLI game (4-season micro-epoch loop)
│   └── analyze.ts            # Multi-run statistical analyzer
├── tests/
│   └── e2e.test.ts           # 93-assertion end-to-end integration test
├── assets/                   # Screenshots
├── .github/                  # Issue templates, PR template
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
└── LICENSE
```

### Technology Stack

| Component | Tech |
|-----------|------|
| Runtime | Node.js 18+ |
| Language | TypeScript 5.6 (strict mode) |
| LLM Provider | Groq (llama-3.3-70b-versatile) + fallback |
| Dependencies | `dotenv`, `@google/generative-ai` |
| Dev Tools | `tsx` (runner), `typescript` |

---

## Testing

```bash
# Run the full test suite (93 assertions across 16 categories)
npm test
```

The test suite validates:
- GameSession creation with all integrated systems
- Agent personalities (trust, optimism, risk tolerance, age)
- Agent opinions and stances
- Full simulation running 10 epochs
- History Book recording and printing
- Newspaper generation and formatting
- Religion and cultural tradition spawning
- Dynasty tracking and summary
- Civilization diplomacy, trade, and espionage
- Climate system (CO₂, temperature, deforestation)
- Agent aging over time
- Dynamic map rendering (seasonal colors, drought, fire warnings)
- News popup category detection and body building
- Agent chatter generation (with emotions)
- Event cascade engine (chained narratives)
- Personality trauma recording

---

## Requirements

- **Node.js** 18 or later
- **npm** (ships with Node)

Windows, macOS, and Linux are all supported.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

## License

MIT. See [LICENSE](./LICENSE) for details.

---

<p align="center">
  <sub>Built for the terminal. No browser. No dashboard. Just pure simulation.</sub>
</p>
