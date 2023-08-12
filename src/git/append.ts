import { GitCommandsInstance } from "./instance";

export interface AppendNoteParameters {
  repositoryPath: string;
  commitHash: string;
  message: string;
}

export class AppendNote extends GitCommandsInstance {
  constructor() {
    super(); // Call the constructor of the parent class
  }

  public async command(parameter: AppendNoteParameters): Promise<void> {
    if (!this.repositoryPath) {
      this.setRepositoryPath(parameter.repositoryPath);
    }
    const existingNote = this.manager.getGitNoteMessage(
      this.manager.getExistingRepositoryDetails(this.repositoryPath),
      parameter.commitHash
    );
    const cmdList = [
      "notes",
      "append",
      "-m",
      parameter.message,
      parameter.commitHash];
    await this.git
      .raw(cmdList)
      .then(async () => {
        const fullNote = `${existingNote}\n\n${parameter.message}`;
        await this.manager.updateNoteMessage(
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
