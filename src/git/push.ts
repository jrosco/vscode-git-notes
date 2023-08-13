import { GitCommandsInstance } from "./instance";
import { CacheManager } from "../manager/exports";
export interface PushNotesParameters {
  repositoryPath: string;
  force?: boolean | false;
}

export class PushNotes extends GitCommandsInstance {
  private cache: CacheManager;

  constructor() {
    super(); // Call the constructor of the parent class
    this.cache = CacheManager.getInstance();
  }

  public async command(parameter: PushNotesParameters): Promise<void> {
    this.setRepositoryPath(parameter.repositoryPath);
    const refspec = `${this.settings.localNoteRef}:${this.settings.remoteNoteRef}`;
    const cmdList = parameter.force
      ? ["origin", refspec, "--force"]
      : ["origin", refspec];
    await this.git
      .push(cmdList)
      .then(async () => {
        await this.cache.load(parameter.repositoryPath);
      })
      .catch((error) => {
        this.logger.error(`command error pushing notes: ${error}`);
        throw new Error(`Push ${error}`);
      });
  }
}
