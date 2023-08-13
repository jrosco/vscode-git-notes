import { GitCommandsInstance } from "./instance";
import { CacheManager } from "../manager/exports";
export interface RemoveNoteParameters {
  repositoryPath: string;
  commitHash: string;
  prune?: boolean | false;
}

export class RemoveNote extends GitCommandsInstance {
  private cache: CacheManager;

  constructor() {
    super(); // Call the constructor of the parent class
    this.cache = CacheManager.getInstance();
  }

  public async command(parameter: RemoveNoteParameters): Promise<void> {
    this.setRepositoryPath(parameter.repositoryPath);
    const cmdList = parameter.prune
      ? ["notes", "prune"]
      : ["notes", "remove", parameter.commitHash];
    await this.git
      .raw(cmdList)
      .then(async () => {
        !parameter.prune
          ? await this.cache.removeCommitByHash(
              parameter.commitHash,
              parameter.repositoryPath
            )
          : await this.cache.load(parameter.repositoryPath);
      })
      .catch((error) => {
        this.logger.error(`command error removing note: ${error}`);
        throw new Error(`Remove ${error}`);
      });
  }
}
