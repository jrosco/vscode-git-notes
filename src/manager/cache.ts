import { RepositoryManager } from "./manager";
import { GitCommands } from "../git/cmd";

import { RepositoryDetails, CommitDetails } from "./manager";

export class CacheManager extends RepositoryManager {
  private static cacheManager: CacheManager;
  private cmd: GitCommands;

  constructor() {
    super(); // Call the constructor of the parent class
    this.cmd = new GitCommands();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.cacheManager) {
      CacheManager.cacheManager = new CacheManager();
    }
    return CacheManager.cacheManager;
  }

  // load the repository details from the repositoryPath when extension is activated
  public async load(
    repositoryPath: string,
    showMax?: number
  ): Promise<RepositoryDetails[]> {
    this.logger.debug(`load(${repositoryPath})`);
    // this.statusBar.reset();
    this.cmd.setRepositoryPath(repositoryPath);
    const commitDetailsInterface: CommitDetails[] = [];
    const existing = this.getExistingRepositoryDetails(repositoryPath);
    let counter = 0;
    let max = showMax || 0;

    if (existing === undefined) {
      this.logger.debug(`no details found for ${repositoryPath} ... loading`);
      const notes = await this.cmd.getGitNotesList();
      for (const note of notes) {
        if (counter < max) {
          // load commit details based off the max number of notes to show
          const commitDetails = await this.cmd.getCommitDetails(
            note.commitHash
          );
          const detail: CommitDetails = {
            noteHash: note.noteHash,
            commitHash: note.commitHash,
            date: note.date,
            author: commitDetails[0].author,
            message: commitDetails[0].message,
            note: (
              await this.cmd.getGitNoteMessage(note.commitHash)
            ).toString(),
            fileChanges: commitDetails[0].fileChanges,
          };
          counter++;
          commitDetailsInterface.push(detail);
          // when limit is reached, only load the commit hash and note hash only, no details
        } else {
          const detail: CommitDetails = {
            noteHash: note.noteHash,
            commitHash: note.commitHash,
            date: note.date,
            fileChanges: [],
          };
          commitDetailsInterface.push(detail);
        }
      }
      const repositoryUrl = await this.cmd.getGitUrl();
      this.updateRepositoryDetails(
        repositoryPath,
        repositoryUrl,
        commitDetailsInterface
      );
    } else {
      this.logger.debug(
        `details found for ${repositoryPath} ... loading next ${max} notes`
      );
      const commitDetailsInterface =
        this.getExistingRepositoryDetails(repositoryPath);
      if (max > 0) {
        for (const note of existing) {
          this.logger.debug(`searching existing notes: ${note}`);
          if (counter < max) {
            const noteExist = this.noteDetailsExists(
              repositoryPath,
              note.commitHash
            );
            if (!noteExist) {
              this.logger.debug(
                `note message not found for commit ${note.commitHash} ... loading`
              );
              const details = this.getExistingCommitDetails(
                repositoryPath,
                note.commitHash
              );
              if (details !== undefined) {
                this.logger.debug(
                  `commit and note hashes found for commit ${note.commitHash} ... loading commit details`
                );
                if (
                  (details.author && details.date && details.message) ===
                  undefined
                ) {
                  const commitDetails = await this.cmd.getCommitDetails(
                    note.commitHash
                  );
                  const updatedCommitDetails: Partial<CommitDetails> = {
                    author: commitDetails[0].author,
                    message: commitDetails[0].message,
                    note: (
                      await this.cmd.getGitNoteMessage(note.commitHash)
                    ).toString(),
                    fileChanges: commitDetails[0].fileChanges,
                  };
                  Object.assign(details, updatedCommitDetails);
                }
                counter++;
              }
            }
          } else {
            break;
          }
        }
      }
      if (commitDetailsInterface) {
        const repositoryUrl = await this.cmd.getGitUrl();
        this.updateRepositoryDetails(
          repositoryPath,
          repositoryUrl,
          commitDetailsInterface
        );
      }
    }
    // this.statusBar.notesCount = this.getExistingRepositoryDetails(repositoryPath)?.length || 0;
    // this.statusBar.repositoryPath = repositoryPath;
    // this.statusBar.update();
    return this.repositoryDetailsInterface;
  }

  // load the repository details from the repositoryPath
  public async loadNoteDetails(
    repositoryPath: string,
    commitHash: string
  ): Promise<RepositoryDetails[]> {
    this.logger.debug(`loadNoteDetails(${repositoryPath}, ${commitHash})`);
    this.cmd.setRepositoryPath(repositoryPath);
    // this.statusBar.reset();
    const commitDetailsInterface =
      this.getExistingRepositoryDetails(repositoryPath);
    const noteExist = this.noteDetailsExists(
      repositoryPath,
      commitHash
    );

    if (!noteExist) {
      const details = this.getExistingCommitDetails(
        repositoryPath,
        commitHash
      );
      if (details !== undefined) {
        this.logger.debug(
          `commit and note hashes found for commit ${commitHash} ... loading commit details`
        );
        if ((details.author && details.date && details.message) === undefined) {
          const commitDetails = await this.cmd.getCommitDetails(
            details.commitHash
          );
          const updatedCommitDetails: Partial<CommitDetails> = {
            author: commitDetails[0].author,
            message: commitDetails[0].message,
            note: (
              await this.cmd.getGitNoteMessage(details.commitHash)
            ).toString(),
            fileChanges: commitDetails[0].fileChanges,
          };
          Object.assign(details, updatedCommitDetails);
        }
      } else {
        this.logger.debug(
          `no commit or note hashes details found for commit ${commitHash} ... loading full details`
        );
        const note = await this.cmd.getGitNotesList(commitHash);
        const commitDetails = await this.cmd.getCommitDetails(commitHash);
        const details: CommitDetails = {
          noteHash: note[0].noteHash,
          commitHash: note[0].commitHash,
          date: note[0].date,
          author: commitDetails[0].author,
          message: commitDetails[0].message,
          note: (await this.cmd.getGitNoteMessage(note[0].commitHash)).toString(),
          fileChanges: commitDetails[0].fileChanges,
        };
        commitDetailsInterface
          ? commitDetailsInterface.push(details)
          : commitDetailsInterface;
      }

      if (commitDetailsInterface) {
        const repositoryUrl = await this.cmd.getGitUrl();
        this.updateRepositoryDetails(
          repositoryPath,
          repositoryUrl,
          commitDetailsInterface
        );
      }
    }
    return this.repositoryDetailsInterface;
  }
}
