import { RepositoryManager } from "./manager";
import { GitNotesStatusBar } from "../ui/status";
import { RepositoryDetails, CommitDetails } from "./exports";
import { GitUtils } from "../git/exports";

export class CacheManager extends RepositoryManager {
  private static cacheManager: CacheManager;
  private statusBar: GitNotesStatusBar;
  private gitUtils: GitUtils;

  constructor() {
    super(); // Call the constructor of the parent class
    this.gitUtils = new GitUtils();
    this.statusBar = GitNotesStatusBar.getInstance();
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
    this.statusBar.reset();
    this.gitUtils.setRepositoryPath(repositoryPath);
    const commitDetailsInterface: CommitDetails[] = [];
    const existing = this.getExistingRepositoryDetails(repositoryPath);
    let counter = 0;
    let max = showMax || 0;

    if (existing === undefined) {
      this.logger.debug(`no details found for ${repositoryPath} ... loading`);
      const notes = await this.gitUtils.getGitNotesList();
      for (const note of notes) {
        if (counter < max) {
          // load commit details based off the max number of notes to show
          const commitDetails = await this.gitUtils.getCommitDetails(
            note.commitHash
          );
          const detail: CommitDetails = {
            noteHash: note.noteHash,
            commitHash: note.commitHash,
            date: note.date,
            author: commitDetails[0].author,
            message: commitDetails[0].message,
            note: (
              await this.gitUtils.getGitNoteMessage(note.commitHash)
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
      const repositoryUrl = await this.gitUtils.getGitUrl();
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
                  const commitDetails = await this.gitUtils.getCommitDetails(
                    note.commitHash
                  );
                  const updatedCommitDetails: Partial<CommitDetails> = {
                    author: commitDetails[0].author,
                    message: commitDetails[0].message,
                    note: (
                      await this.gitUtils.getGitNoteMessage(note.commitHash)
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
        const repositoryUrl = await this.gitUtils.getGitUrl();
        this.updateRepositoryDetails(
          repositoryPath,
          repositoryUrl,
          commitDetailsInterface
        );
      }
    }
    this.statusBar.notesCount =
      this.getExistingRepositoryDetails(repositoryPath)?.length || 0;
    this.statusBar.repositoryPath = repositoryPath;
    this.statusBar.update();
    return this.repositoryDetailsInterface;
  }

  // load the repository details from the repositoryPath
  public async loadNoteDetails(
    repositoryPath: string,
    commitHash: string
  ): Promise<RepositoryDetails[]> {
    this.logger.debug(`loadNoteDetails(${repositoryPath}, ${commitHash})`);
    this.gitUtils.setRepositoryPath(repositoryPath);
    this.statusBar.reset();
    const commitDetailsInterface =
      this.getExistingRepositoryDetails(repositoryPath);
    const noteExist = this.noteDetailsExists(repositoryPath, commitHash);

    if (!noteExist) {
      const details = this.getExistingCommitDetails(repositoryPath, commitHash);
      if (details !== undefined) {
        this.logger.debug(
          `commit and note hashes found for commit ${commitHash} ... loading commit details`
        );
        if ((details.author && details.date && details.message) === undefined) {
          const commitDetails = await this.gitUtils.getCommitDetails(
            details.commitHash
          );
          const updatedCommitDetails: Partial<CommitDetails> = {
            author: commitDetails[0].author,
            message: commitDetails[0].message,
            note: (
              await this.gitUtils.getGitNoteMessage(details.commitHash)
            ).toString(),
            fileChanges: commitDetails[0].fileChanges,
          };
          Object.assign(details, updatedCommitDetails);
        }
      } else {
        this.logger.debug(
          `no commit or note hashes details found for commit ${commitHash} ... loading full details`
        );
        const note = await this.gitUtils.getGitNotesList(commitHash);
        const commitDetails = await this.gitUtils.getCommitDetails(commitHash);
        const details: CommitDetails = {
          noteHash: note[0].noteHash,
          commitHash: note[0].commitHash,
          date: note[0].date,
          author: commitDetails[0].author,
          message: commitDetails[0].message,
          note: (
            await this.gitUtils.getGitNoteMessage(note[0].commitHash)
          ).toString(),
          fileChanges: commitDetails[0].fileChanges,
        };
        commitDetailsInterface
          ? commitDetailsInterface.push(details)
          : commitDetailsInterface;
      }

      if (commitDetailsInterface) {
        const repositoryUrl = await this.gitUtils.getGitUrl();
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
