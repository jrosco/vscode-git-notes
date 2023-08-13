import { GitCommandsInstance } from "./instance";
import { CacheManager } from "../manager/exports";
export interface AppendNoteParameters {
  repositoryPath: string;
  commitHash: string;
  message: string;
}

export class AppendNote extends GitCommandsInstance {
  private cache: CacheManager;

  constructor() {
    super(); // Call the constructor of the parent class
    this.cache = CacheManager.getInstance();
  }

  public async command(parameter: AppendNoteParameters): Promise<void> {
    this.setRepositoryPath(parameter.repositoryPath);
    // load details and wait before checking for existing notes
    await this.cache.loadNoteDetails(
      parameter.repositoryPath,
      parameter.commitHash
    );
    const existingNote = this.cache.getGitNoteMessage(
      this.cache.getExistingRepositoryDetails(parameter.repositoryPath),
      parameter.commitHash
    );
    const cmdList = [
      "notes",
      "append",
      "-m",
      parameter.message,
      parameter.commitHash,
    ];
    await this.git
      .raw(cmdList)
      .then(async () => {
        const fullNote = `${existingNote}\n\n${parameter.message}`;
        await this.cache.updateNoteMessage(
          parameter.commitHash,
          fullNote,
          parameter.repositoryPath
        );
      })
      .catch((error) => {
        this.logger.error(`command error appending note: ${error}`);
        throw new Error(`Append ${error}`);
      });
  }
}
