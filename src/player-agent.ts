import * as readline from 'node:readline';

export interface PlayerAdvice {
  agentId: string;
  message: string;
  action: string;
  targetResource?: string;
}

export class PlayerAgent {
  private rl: readline.Interface | null = null;
  private agentId: string | null = null;
  private agentName: string = '';

  enable(name: string, id: string): void {
    this.agentName = name;
    this.agentId = id;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  disable(): void {
    this.rl?.close();
    this.rl = null;
    this.agentId = null;
  }

  get isActive(): boolean {
    return this.rl !== null && this.agentId !== null;
  }

  get controlledAgentId(): string | null {
    return this.agentId;
  }

  async ask(epoch: number, context: string, options: string[]): Promise<PlayerAdvice | null> {
    if (!this.rl || !this.agentId) return null;

    const opts = options.map((o, i) => `  ${i + 1}. ${o}`).join('\n');
    const question = `\n\x1b[43m\x1b[1m\x1b[30m ⚡ YOUR ADVICE NEEDED — Epoch ${epoch} ⚡ \x1b[0m
You are advising ${this.agentName}.
\x1b[90m${context}\x1b[0m

What should ${this.agentName} do?

${opts}

Your choice (1-${options.length}) or type your own: `;

    return new Promise((resolve) => {
      this.rl!.question(question, (answer) => {
        const num = parseInt(answer.trim(), 10);
        let action: string;
        if (num >= 1 && num <= options.length) {
          action = options[num - 1]!;
        } else {
          action = answer.trim();
        }
        resolve({
          agentId: this.agentId!,
          message: action,
          action,
        });
      });
    });
  }

  async promptAny(epoch: number, agentName: string): Promise<string | null> {
    if (!this.rl || this.agentId === null) return null;
    return new Promise((resolve) => {
      this.rl!.question(`\n\x1b[36m[You → ${agentName}]\x1b[0m `, (answer) => {
        resolve(answer.trim() || null);
      });
    });
  }
}
