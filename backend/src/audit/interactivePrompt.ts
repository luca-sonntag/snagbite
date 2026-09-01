import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export type InteractiveDecision = 'accept' | 'skip' | 'abort';

export class AbortPipelineError extends Error {
  constructor(message = 'Pipeline manually aborted by user.') {
    super(message);
    this.name = 'AbortPipelineError';
  }
}

export async function promptForComparison(params: {
  mappingKey: string;
  oldPath: string | null;
  candidatePath: string;
}): Promise<InteractiveDecision> {
  const rl = readline.createInterface({ input, output });

  try {
    console.log(`\n======================================================`);
    console.log(`🔎 [INTERACTIVE DEBUG] Vergleich für: "${params.mappingKey}"`);
    console.log(`======================================================`);
    if (params.oldPath) {
      console.log(`📁 Alt: ${params.oldPath}`);
    } else {
      console.log(`📁 Alt: (Noch kein vorheriges Icon vorhanden)`);
    }
    console.log(`✨ Neu: ${params.candidatePath}`);
    console.log(`------------------------------------------------------`);

    const answer = await rl.question(
      `👉 Bild übernehmen? [ENTER / y = Übernehmen, s = Überspringen (alt behalten), q = Abbrechen]: `
    );

    const trimmed = answer.trim().toLowerCase();
    if (trimmed === 's' || trimmed === 'n') {
      console.log(`⏭️  Übersprungen: Altes Bild wird beibehalten.\n`);
      return 'skip';
    }
    if (trimmed === 'q') {
      console.log(`🛑 Pipeline wird durch Benutzer abgebrochen.\n`);
      return 'abort';
    }

    console.log(`✅ Übernommen: Neues Bild wird als aktives Icon gespeichert.\n`);
    return 'accept';
  } finally {
    rl.close();
  }
}
