import { GitCommandsInstance } from "./instance";
import { CacheManager } from "../manager/exports";
export interface EditNoteParameters {
  repositoryPath: string;
  commitHash: string;
  message: string;
}

export class EditNote extends GitCommandsInstance {
  private cache: CacheManager;

  constructor() {
    super(); // Call the constructor of the parent class
    this.cache = CacheManager.getInstance();
  }

  public async command(parameter: EditNoteParameters): Promise<void> {
    this.setRepositoryPath(parameter.repositoryPath);
    const cmdList = [
      "notes",
      "edit",
      "-m",
      parameter.message,
      parameter.commitHash,
    ];
    await this.git
      .raw(cmdList)
      .then(async () => {
        await this.cache.updateNoteMessage(
          parameter.commitHash,
          parameter.message,
          parameter.repositoryPath
        );
      })
      .catch((error) => {
        this.logger.error(`command error editing note: ${error}`);
        throw new Error(`Edit ${error}`);
      });
  }
}
