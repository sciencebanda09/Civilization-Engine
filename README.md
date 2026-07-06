<h1 align="center">🏛️ Civilization Engine</h1>

<p align="center">
  <strong>v1.0</strong> — <em>Multi-agent AI civilization simulator for the terminal.</em><br>
  Guide a tribe of AI agents from the Stone Age to the Iron Age.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

---

```ascii
  +------------------------------------------------+
  |   CIVILIZATION ENGINE                          |
  |   v1.0                                         |
  |   AI agents · Interactive · Terminal            |
  +------------------------------------------------+

  YEAR 8/20  Bronze Age  SUMMER  Pop: 134  Disc: 3

  Kael · Doren · Mira · Thane · Elara

  Food ████████░░░ 84   Wood ████░░░░░░ 42
  Stone ██████░░░░ 63

  Agriculture — "The earth gives willingly."
  Raid — Grey Wolves attacked! Lost 8.
```

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd civilization-engine
npm install

# 2. Configure API keys (optional — fallback mode works without them)
cp .env.example .env
# Edit .env and add your Groq API keys

# 3. Play
npm run play
```

## Features

- **AI Agents** — Five unique personalities debate, research, and discover
- **Interactive Decisions** — Council of Elders every 4 years, crisis responses, tech direction
- **Technology Tree** — 27 technologies across 4 eras with prerequisites
- **Dynamic World** — Procedural terrain, seasons, weather, and enemy tribes
- **Faction Politics** — Agents form clans with rivalries and shifting influence
- **Achievements & Legacy** — 10 achievements, heroes recorded as legends
- **Full Terminal UI** — Color-coded events, progress bars, combat logs, spinners

## Scenarios

| Scenario | Difficulty | Description |
|----------|-----------|-------------|
| peaceful_valley | Easy | Abundant resources, 5 agents |
| rich_valley | Normal | Booming population, 5 agents |
| island_colony | Normal | Isolated island, 3 agents |
| desert_oasis | Hard | Scarce resources, 3 agents |
| volcanic_winter | Hard | Blotted-out sun, 3 agents |
| iron_fist | Extreme | Oppressed start, Iron Age |

## Commands

```bash
npm run play                        # Interactive game with scenario picker
npm run play -- <scenario> <n>     # Direct launch
npm run play -- peaceful_valley 10  # Example: 10 epochs
npm run analyze                     # Multi-run statistical analysis
```

## Configuration

Copy `.env.example` to `.env` and add your API keys. The simulation uses Groq's free tier with automatic load balancing across multiple keys. When all keys are rate-limited, a fallback provider keeps the simulation running.

```env
GROQ_API_KEY=gsk_...
GROQ_API_KEY2=gsk_...
GROQ_API_KEY3=gsk_...
GROQ_API_KEY4=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
```

No API keys are required to run — the simulation works in fallback mode without any configuration.

## Architecture

```
src/
  ui/                     Terminal UI toolkit (ANSI, spinners, boxes)
  game/                   Decision engine, tech tree, win conditions, legacy, chapters
  simulation/             Orchestrator, economy, disasters, debate
  factions/               Faction politics and rivalries
  map/                    Procedural terrain generation
  world/                  Weather, enemy tribes
  scenarios/              6 preset scenarios
  narrative/              Event narration, ASCII portraits
  llm/                    LLM providers (Groq, fallback)
  player-agent.ts         Player advice injection
  multirun.ts             Batch analysis engine
examples/
  play.ts                 Interactive CLI game
  analyze.ts              Multi-run analyzer
```

## Requirements

- Node.js 18+
- npm

## License

MIT
