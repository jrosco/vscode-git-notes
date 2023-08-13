import { GitCommandsInstance } from "./instance";
import { CacheManager } from "../manager/exports";
export interface FetchNotesParameters {
  repositoryPath: string;
  force?: boolean | false;
}

export class FetchNotes extends GitCommandsInstance {
  private cache: CacheManager;

  constructor() {
    super(); // Call the constructor of the parent class
    this.cache = CacheManager.getInstance();
  }

  public async command(parameter: FetchNotesParameters): Promise<void> {
    this.setRepositoryPath(parameter.repositoryPath);
    const refspec = `${this.settings.localNoteRef}:${this.settings.remoteNoteRef}`;
    const cmdList = parameter.force
      ? ["origin", refspec, "--force"]
      : ["origin", refspec];
    await this.git
      .fetch(cmdList)
      .then( async() => {
        await this.cache.clearRepositoryDetails(
          undefined,
          parameter.repositoryPath
        ).then(async () => {
          await this.cache.load(
            parameter.repositoryPath
          );
        });
    })
    .catch((error) => {
      this.logger.error(`command error fetching notes: ${error}`);
      throw new Error(`Fetch ${error}`);
    });
  }
}
