import { GitCommandsInstance } from "./instance";
import { CacheManager } from "../manager/exports";
export interface AddNoteParameters {
  repositoryPath: string;
  commitHash: string;
  message: string;
  force?: boolean;
}

export class AddNote extends GitCommandsInstance {
  private cache: CacheManager;

  constructor() {
    super(); // Call the constructor of the parent class
    this.cache = CacheManager.getInstance();
  }

  public async command(parameter: AddNoteParameters): Promise<void> {
    this.setRepositoryPath(parameter.repositoryPath);
    const cmdList = parameter.force
      ? ["notes", "add", "-m", parameter.message, parameter.commitHash, "-f"]
      : ["notes", "add", "-m", parameter.message, parameter.commitHash];
    await this.git
      .raw(cmdList)
      .then(async () => {
        await this.cache.loadNoteDetails(
          parameter.repositoryPath,
          parameter.commitHash
        );
      })
      .catch((error) => {
        this.logger.error(`command error adding note: ${error}`);
        throw new Error(`Add ${error}`);
      });
  }
}
