import simpleGit, { SimpleGit, SimpleGitOptions, LogResult } from 'simple-git';
import * as vscode from 'vscode';
import * as fs from 'fs';

import { GitNotesStatusBar } from '../ui/status';
import { NotesOutputChannel } from '../ui/output';
import { NotesInput } from '../ui/input';
import { LoggerService, LogLevel } from '../log/service';
import { GitNotesSettings } from '../settings';

import {
  RepositoryManager,
  RepositoryDetails,
  CommitDetails,
  FileChanges
} from '../interface';

export class GitCommands {
  public repositoryPath: string;
  private logger: LoggerService;
  private git: SimpleGit;
  private manager: RepositoryManager;
  private statusBar: GitNotesStatusBar;
  private output: NotesOutputChannel;
  private input: NotesInput;
  private settings: GitNotesSettings;

  constructor() {
    this.git = simpleGit();
    this.manager = RepositoryManager.getInstance();
    this.statusBar = GitNotesStatusBar.getInstance();
    this.output = new NotesOutputChannel();
    this.settings = new GitNotesSettings();
    this.logger = LoggerService.getInstance(this.settings.logLevel);
    this.repositoryPath = "";
    this.input = NotesInput.getInstance();

    this.logger.deprecated(`GitCommands constructor: ${Object.getOwnPropertyNames(this)}`);
  }

  /**
  * This function is deprecated. Use GitCommandsInstance() subclasses instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public setRepositoryPath(repositoryPath: string): void {
    this.logger.deprecated(`setRepositoryPath(${repositoryPath})`);
    this.repositoryPath = repositoryPath;

    const gitOptions: SimpleGitOptions = {
    baseDir: repositoryPath, // Change this to the path of the directory where you want to initialize the repository
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: true,
    config: [],
    };

    try {
      this.git = simpleGit(gitOptions);
      this.logger.deprecated(`this.git: ${Object.getOwnPropertyNames(this.git)}`);
    } catch (error) {
      this.logger.deprecated(`error setting repositoryPath: ${error}`);
    }
  }

  public getRepositoryPath() {
    this.logger.deprecated(`getRepositoryPath() return: ${this.repositoryPath}`);
    return this.repositoryPath;
  }

  /**
  * This function is deprecated. Use CacheManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  // load the repository details from the repositoryPath when extension is activated
  public async loader(repositoryPath: string, showMax?: number): Promise<RepositoryDetails[]> {
    this.logger.deprecated(`loader(${repositoryPath})`);
    this.statusBar.reset();
    this.setRepositoryPath(repositoryPath);
    const commitDetailsInterface: CommitDetails[] = [];
    const existing = this.manager.getExistingRepositoryDetails(repositoryPath);
    let counter = 0;
    let max = showMax || 0;

    if (existing === undefined) {
      this.logger.deprecated(`no details found for ${repositoryPath} ... loading`);
      const notes = await this.getGitNotesList();
      for (const note of notes) {
        if (counter < max) {
          // load commit details based off the max number of notes to show
          const commitDetails = await this.getCommitDetails(note.commitHash);
          const detail: CommitDetails = {
            noteHash: note.noteHash,
            commitHash: note.commitHash,
            date: note.date,
            author: commitDetails[0].author,
            message: commitDetails[0].message,
            note: (await this.getGitNoteMessage(note.commitHash)).toString(),
            fileChanges: commitDetails[0].fileChanges
          };
          counter++;
          commitDetailsInterface.push(detail);
        // when limit is reached, only load the commit hash and note hash only, no details
        } else {
          const detail: CommitDetails = {
            noteHash: note.noteHash,
            commitHash: note.commitHash,
            date: note.date,
            fileChanges: []
          };
          commitDetailsInterface.push(detail);
        }
      }
      const repositoryUrl = await this.getGitUrl();
      this.manager.updateRepositoryDetails(repositoryPath, repositoryUrl, commitDetailsInterface);
    } else {
      this.logger.deprecated(`details found for ${repositoryPath} ... loading next ${max} notes`);
      const commitDetailsInterface = this.manager.getExistingRepositoryDetails(repositoryPath);
      if (max > 0) {
        for (const note of existing) {
          this.logger.deprecated(`searching existing notes: ${note}`);
          if (counter < max) {
            const noteExist = this.manager.noteDetailsExists(repositoryPath, note.commitHash);
            if (!noteExist) {
              this.logger.deprecated(`note message not found for commit ${note.commitHash} ... loading`);
              const details = this.manager.getExistingCommitDetails(repositoryPath, note.commitHash);
              if (details !== undefined) {
                this.logger.deprecated(`commit and note hashes found for commit ${note.commitHash} ... loading commit details`);
                if ((details.author && details.date && details.message) === undefined) {
                  const commitDetails = await this.getCommitDetails(note.commitHash);
                  const updatedCommitDetails: Partial<CommitDetails> = {
                    author: commitDetails[0].author,
                    message: commitDetails[0].message,
                    note: (await this.getGitNoteMessage(note.commitHash)).toString(),
                    fileChanges: commitDetails[0].fileChanges
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
        const repositoryUrl = await this.getGitUrl();
        this.manager.updateRepositoryDetails(repositoryPath, repositoryUrl, commitDetailsInterface);
      }
    }
    this.statusBar.notesCount = this.manager.getExistingRepositoryDetails(repositoryPath)?.length || 0;
    this.statusBar.repositoryPath = repositoryPath;
    this.statusBar.update();
    return this.manager.repositoryDetailsInterface;
  }

  /**
  * This function is deprecated. Use CacheManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  // load the repository details from the repositoryPath
  public async loadNoteDetails(repositoryPath: string, commitHash: string): Promise<RepositoryDetails[]> {
    this.logger.deprecated(`loadNoteDetails(${repositoryPath}, ${commitHash})`);
    this.setRepositoryPath(repositoryPath);
    this.statusBar.reset();
    const commitDetailsInterface = this.manager.getExistingRepositoryDetails(repositoryPath);
    const noteExist = this.manager.noteDetailsExists(repositoryPath, commitHash);

    if (!noteExist) {
      const details = this.manager.getExistingCommitDetails(repositoryPath, commitHash);
      if (details !== undefined) {
        this.logger.deprecated(`commit and note hashes found for commit ${commitHash} ... loading commit details`);
        if ((details.author && details.date && details.message) === undefined) {
          const commitDetails = await this.getCommitDetails(details.commitHash);
          const updatedCommitDetails: Partial<CommitDetails> = {
            author: commitDetails[0].author,
            message: commitDetails[0].message,
            note: (await this.getGitNoteMessage(details.commitHash)).toString(),
            fileChanges: commitDetails[0].fileChanges
          };
          Object.assign(details, updatedCommitDetails);
        }
      } else {
        this.logger.deprecated(`no commit or note hashes details found for commit ${commitHash} ... loading full details`);
        const note = await this.getGitNotesList(commitHash);
        const commitDetails = await this.getCommitDetails(commitHash);
        const details: CommitDetails = {
          noteHash: note[0].noteHash,
          commitHash: note[0].commitHash,
          date: note[0].date,
          author: commitDetails[0].author,
          message: commitDetails[0].message,
          note: (await this.getGitNoteMessage(note[0].commitHash)).toString(),
          fileChanges: commitDetails[0].fileChanges
        };
        commitDetailsInterface ? commitDetailsInterface.push(details): commitDetailsInterface;
      }

      if (commitDetailsInterface) {
        const repositoryUrl = await this.getGitUrl();
        this.manager.updateRepositoryDetails(repositoryPath, repositoryUrl, commitDetailsInterface);
      }
    }
    return this.manager.repositoryDetailsInterface;
  }

  /**
  * This function is deprecated. Use GitUtils() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public async getGitNotesList(commitHash?: string): Promise<any[]> {
    this.logger.deprecated("getGitNotesList()");
    try {
      const [commitLog, notesOutput] = await Promise.all([
        new Promise<LogResult>((resolve, reject) => {
          this.git.log(["--date=iso", "--format=%H %cd"], (err, commitLog: LogResult) => {
            if (err) {
              reject(err);
            } else {
              resolve(commitLog);
            }
          });
        }),
        new Promise<string>((resolve, reject) => {
          const cmdList = commitHash ? ['notes', 'list', commitHash] : ['notes', 'list'];
          this.git.raw(cmdList, (err, notesOutput) => {
            if (err) {
              reject(err);
            } else {
              resolve(notesOutput);
            }
          });
        }),
      ]);

      const notes: any[] = [];
      const noteLines = notesOutput.split(/\r?\n/);
      const noteMap = new Map<string, string[]>();

      noteLines.forEach((noteLine) => {
        let [noteHash, noteCommitHash] = noteLine.split(' ');
        const finalCommitHash = commitHash ? commitHash : noteCommitHash;
        if (noteHash && (!commitHash || commitHash === finalCommitHash)) {
          if (!noteMap.has(finalCommitHash)) {
            noteMap.set(finalCommitHash, []);
          }
          noteMap.get(finalCommitHash)?.push(noteHash);
        }
      });

      commitLog.all.map((commitOutput) => {
        const commitLines = commitOutput.hash.split(/\r?\n/);
        commitLines.forEach((commitLine) => {
          const [commitLogHash, date, dateTime, dateUTC] = commitLine.split(' ');
          const noteHashes = noteMap.get(commitLogHash) || [];

          if (noteHashes.length > 0) {
            const note = {
              commitHash: commitLogHash,
              noteHash: noteHashes,
              date: new Date(`${date} ${dateTime} ${dateUTC}`),
            };
            notes.push(note);
          }
        });
      });
      return notes;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
  * This function is deprecated. Use getGitNotesList() instead.
  * @deprecated Since version 0.2.0. Will be removed in version 1.0.0.
  */
  private _getGitNotes(commitHash?: string): Promise<any[]> {
    this.logger.deprecated("_getGitNotes()");
    return new Promise<any[]>(async(resolve, reject) => {
      const cmdList = commitHash ? ["notes", `--ref=${this.settings.localNoteRef}`, "list", commitHash]: ["notes", `--ref=${this.settings.localNoteRef}`, "list"];
      this.git.raw(cmdList, (err, result) => {
        if (err) {
          reject(err);
        } else {
          const output = commitHash ? `${result} ${commitHash}` : result;
          const notes = this._parseGitNotes(output);
          resolve(notes);
        }
      });
    });
  }

  /**
  * This function is deprecated. Use getGitNotesList() instead.
  * @deprecated Since version 0.2.0. Will be removed in version 1.0.0.
  */
  private _parseGitNotes(notesOutput: string): Promise<any[]> {
    this.logger.deprecated(`_parseGitNotes(${notesOutput})`);
    return new Promise<any[]>(async (resolve, reject) => {
      try {
        // Parse the output and extract relevant information
        // Customize this function according to your Git notes format
        const notes: any[] = [];
        const lines = notesOutput.split(/\r?\n/);

        for (const line of lines) {
          if (line.length > 0) {
            const parts = line.split(" ");
            if (parts.length > 0) {
              const note = {
                noteHash: parts[0],
                commitHash: parts[1],
              };
              notes.push(note);
            }
          }
        }
        // Resolve the promise with the notes array
        resolve(notes);
      } catch (error) {
        // Reject the promise with the error message
        reject(new Error(`Error parsing Git notes: ${error}`));
      }
    });
  }

  /**
  * This function is deprecated. Use GitUtils() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public getGitNoteMessage(commitHash: string): Promise<string> {
    this.logger.deprecated(`getGitNoteMessage(${commitHash})`);
    return new Promise<string>(async (resolve, reject) => {
      this.git.raw(
        ["notes", `--ref=${this.settings.localNoteRef}`, "show", commitHash],
        (error, result) => {
          if (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            reject(new Error(`Error retrieving note details: ${errorMessage}`));
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  /**
  * This function is deprecated. Use GitUtils() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public getCommitDetails(commitSHA: string): Promise<any[]> {
    this.logger.deprecated(`getCommitDetails(${commitSHA})`);
    return new Promise<any[]>(async (resolve, reject) => {
      this.git.show(['--stat', commitSHA])
        .then(commitDetails => {
          const parsedDetails = this._parseCommitDetails(commitDetails, commitSHA);
          resolve(parsedDetails);
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          reject(new Error(`Error retrieving commit details: ${errorMessage}`));
          this.statusBar.showErrorMessage(`Git Notes: Error retrieving commit details: ${errorMessage}`);
        });
    });
  }

  /**
  * This function is deprecated. Use GitUtils() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  private _getCommitFileChanges(commitSHA: string): Promise<any[]> {
    this.logger.deprecated(`_getCommitFileChanges(${commitSHA})`);
    return new Promise<any[]>(async (resolve, reject) => {
      this.git.show(["--numstat", "--oneline", commitSHA])
        .then(commitFilesDetails => {
          const parsedDetails = this._parseFileDetails(commitFilesDetails, this.repositoryPath);
          resolve(parsedDetails);
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          reject(new Error(`Error retrieving commit details: ${errorMessage}`));
          this.statusBar.showErrorMessage(`Git Notes: Error retrieving commit details: ${errorMessage}`);
        });
    });
  }

  /**
  * This function is deprecated. Use GitUtils() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  private async _parseFileDetails(gitOutput: string, repositoryPath: string) {
    this.logger.deprecated(`_parseFileDetails(${gitOutput}, ${repositoryPath})`);
    const lines = gitOutput.split('\n').slice(1);
    // if last line is empty, remove it
    if (lines[-1] === undefined || lines[-1] === "") {
      lines.pop();
    }

    const fileChanges: FileChanges[] = lines.map((line) => {
      const [additions, deletions, file] = line.split('\t');
      const changes = Number(additions) + Number(deletions);

      let deleted = false;
      let added = false;
      let renamed = false;

      // no changes, check file exists
      if (changes < 1) {
        // file has been renamed
        if (file.includes("=>")) {
          renamed = true;
        // check if file exists
        } else if (fs.existsSync(repositoryPath+"/"+file)) {
          added = true;
        // file does not exist
        } else {
          deleted = true;
        }
      }

      return {
        file,
        changes: Number(changes),
        deletions: Number(deletions),
        insertions: Number(additions),
        deleted: deleted,
        added: added,
        renamed: renamed,
        };
      });

    return fileChanges;
  }

  /**
  * This function is deprecated. Use GitUtils() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  private async _parseCommitDetails(commitDetails: string, commitSHA: string) {
    this.logger.deprecated(`_parseCommitDetails(${commitDetails}, ${commitSHA})`);
    const commits: any[] = [];

    const lines: string[] = commitDetails.split("\n");

    // Extract commit message
    const messageLine: string | undefined = lines.find((line) =>
      line.startsWith("    ")
    );
    const message: string = messageLine ? messageLine.trim() : "";

    // Extract author and date
    const authorLine: string | undefined = lines.find((line) =>
      line.startsWith("Author:")
    );
    const author: string = authorLine ? authorLine.split(":")[1].trim() : "";

    // Get file changes
    const fileChanges = await this._getCommitFileChanges(commitSHA);

    const commit = {
      author: author,
      message: message,
      fileChanges: fileChanges,
    };

    commits.push(commit);

    this.logger.deprecated(`return ${commits}`);
    return commits;
  }

  /**
  * This function is deprecated. Use GitUtils() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public async getLatestCommit(fileUri?: vscode.Uri, repositoryPath?: string): Promise<string | undefined> {
    this.logger.deprecated(`getLatestCommit(${fileUri}, ${repositoryPath})`);
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this.setRepositoryPath(repositoryPath);
    if (repositoryPath !== undefined) {
      try {
        const commitId = await this.git.log({ n: 1 });
        this.logger.deprecated(`getLatestCommit found ${commitId.latest?.hash}`);
        return commitId.latest?.hash;
      } catch (error) {
        this.logger.deprecated(`error getting latest commit: ${error}`);
      }
    }
    return undefined;
  };

  /**
  * This function is deprecated. Use AddNote() and EditNote() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public async addGitNotes(message: string, commitHash: string, subCmd: string = 'add', fileUri?: vscode.Uri, repositoryPath?: string,
    force?: boolean, append?: boolean): Promise<void> {

    this.logger.deprecated(`addGitNotes(${message}, ${commitHash}, ${fileUri}, ${repositoryPath})`);
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this.setRepositoryPath(repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        this.statusBar.message = "Adding Message ...";
        this.statusBar.update();
        const cmdList = force ? ['notes', subCmd, commitHash, '-m', message, '--force'] : ['notes', subCmd, commitHash, '-m', message];
        await this.git.raw(cmdList)
          .then(() => {
            this.manager.updateNoteMessage(commitHash, message, repositoryPath);
          }
        );
        await this.loadNoteDetails(repositoryPath, commitHash);
      } else {
        this.logger.deprecated("Not a git repository (or any of the parent directories): .git ");
        this.statusBar.showInformationMessage("Git Notes: Not a git repository (or any of the parent directories): .git");
      }
    } catch (error) {
      this.logger.deprecated('An error occurred while adding Git note:'+ error);
      this.statusBar.showErrorMessage(`Git Notes: An error occurred while adding Git note: ${error}`);
      const messageItem: vscode.MessageItem[] = [{title: "Append"}, {title: "Force overwrite"}, {title: "Cancel"}];
      const selected = await this.input.showInputWindowMessage("Failed to Add Git Note", messageItem, true, true);
      if (selected?.title === "Append") {
        await this.addGitNotes(message, commitHash, 'append', undefined, repositoryPath);
      } else if (selected?.title === "Force overwrite") {
        await this.addGitNotes(message, commitHash, 'add', undefined, repositoryPath, true);
      } else {
        this.statusBar.notesCount = this.manager.getExistingRepositoryDetails(repositoryPath)?.length || 0;
        this.statusBar.update();
      }
    }
  }

  public async fetchGitNotes(fileUri?: vscode.Uri, repositoryPath?: string, force?: boolean): Promise<void> {
    this.logger.deprecated(`fetchGitNotes(${fileUri}, ${repositoryPath})`);
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this.setRepositoryPath(repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        this.statusBar.message = "Fetching ...";
        this.statusBar.update();
        const refspec = `${this.settings.localNoteRef}:${this.settings.remoteNoteRef}`;
        const cmdList = force ? ['origin', refspec, '--force'] : ['origin', refspec];
        let confirm = undefined;
        const title = force ? "Confirm Fetch Force" : "Fetch Notes";
        if (this.settings.confirmPushAndFetchCommands) {
          const messageItem: vscode.MessageItem[] = [{ title: title }, {title: "Cancel"}];
          confirm = await this.input.showInputWindowMessage(`Directory: ${repositoryPath}`, messageItem, true, false);
        }
        if (confirm?.title === title || !this.settings.confirmPushAndFetchCommands) {
          await this.git.fetch(cmdList)
          .then((message) => {
            this.logger.deprecated(`message: ${message.raw}`);
            this.statusBar.showInformationMessage("Git Notes: Fetched");
            this.manager.clearRepositoryDetails(undefined, repositoryPath);
          });
        }
        await this.loader(repositoryPath, this.settings.gitNotesLoadLimit);
      } else {
        this.logger.deprecated("Not a git repository (or any of the parent directories): .git ");
        this.statusBar.showInformationMessage("Git Notes: Not a git repository (or any of the parent directories): .git");
      }
    } catch (error) {
      this.output.log('An error occurred while fetching Git notes:'+ error);
      this.statusBar.showErrorMessage(`Git Notes: An error occurred while fetching Git notes: ${error}`);
      const messageItem: vscode.MessageItem[] = [{ title: "Push notes" }, {title: "Force fetch"}, {title: "Cancel"}];
      const selected = await this.input.showInputWindowMessage("Failed to fetch Git Notes", messageItem, true, true);
      if (selected?.title === "Push notes") {
        await this.pushGitNotes(fileUri, repositoryPath);
      } else if (selected?.title === "Force fetch") {
        await this.fetchGitNotes(fileUri, repositoryPath, true);
      } else {
        this.statusBar.notesCount = this.manager.getExistingRepositoryDetails(repositoryPath)?.length || 0;
        this.statusBar.update();
      }
    }
  }

  public async pushGitNotes(fileUri?: vscode.Uri, repositoryPath?: string, force?: boolean): Promise<void> {
    this.logger.deprecated(`pushGitNotes(${fileUri}, ${repositoryPath})`);
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this.setRepositoryPath(this.repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        this.statusBar.message = "Pushing ...";
        this.statusBar.update();
        const refspec = `${this.settings.localNoteRef}:${this.settings.remoteNoteRef}`;
        const cmdList = force ? ['origin', refspec, '--force'] : ['origin', refspec];
        let confirm = undefined;
        const title = force ? "Confirm Push Force" : "Push Notes";
        if (this.settings.confirmPushAndFetchCommands) {
          const messageItem: vscode.MessageItem[] = [{ title: title }, {title: "Cancel"}];
          confirm = await this.input.showInputWindowMessage(`Directory: ${repositoryPath}`, messageItem, true, false);
        }
        if (confirm?.title === title || !this.settings.confirmPushAndFetchCommands) {
          await this.git.push(cmdList)
          .then((message) => {
            const showMsg = message.pushed.length > 0 ? "Everything up-to-date": `Pushed ${message.update?.hash.from} -> ${message.update?.hash.to}`;
            this.statusBar.showInformationMessage(`Git Notes: ${showMsg}`);
          });
        }
        await this.loader(repositoryPath);
      } else {
        this.logger.deprecated("Not a git repository (or any of the parent directories): .git");
        this.statusBar.showInformationMessage("Git Notes: Not a git repository (or any of the parent directories): .git");
      }
    } catch (error) {
      this.logger.deprecated(`An error occurred while pushing Git notes: ${error}`);
      this.statusBar.showErrorMessage(`Git Notes: An error occurred while pushing Git notes: ${error}`);
      const messageItem: vscode.MessageItem[] = [{ title: "Fetch notes" }, {title: "Force push"}, {title: "Cancel"}];
      const selected = await this.input.showInputWindowMessage("Failed to push Git Notes", messageItem, true, true);
      if (selected?.title === "Fetch notes") {
        await this.fetchGitNotes(fileUri, repositoryPath);
      } else if (selected?.title === "Force push") {
        await this.pushGitNotes(fileUri, repositoryPath, true);
      } else {
        this.statusBar.notesCount = this.manager.getExistingRepositoryDetails(repositoryPath)?.length || 0;
        this.statusBar.update();
      }
    }
  }

  public async removeGitNote(commitHash: string, fileUri?: vscode.Uri, repositoryPath?: string, prune?: boolean): Promise<void> {
    this.logger.deprecated(`removeGitNote(${commitHash}, ${fileUri}, ${repositoryPath}, ${prune})`);
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this.setRepositoryPath(repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        this.statusBar.message = "Removing ...";
        this.statusBar.update();
        const cmdList = prune ? ['notes', 'prune'] : ['notes', 'remove', commitHash];
        this.logger.deprecated(`cmdList: ${cmdList} for ${repositoryPath}`);
        let confirm = undefined;
        const title = prune ? "Confirm Prune" : "Confirm Note Removal";
        const messageItemTitle = prune ? `Prune Directory ${repositoryPath}` : `Note Commit Removal: ${commitHash}`;
        const messageItem: vscode.MessageItem[] = [{ title: title }, {title: "Cancel"}];
        if ((prune && this.settings.confirmPruneCommands) || (!prune && this.settings.confirmRemovalCommands)) {
          confirm = await this.input.showInputWindowMessage(`${messageItemTitle}`, messageItem, true, false);
        }
        if (confirm?.title === title || (prune && !this.settings.confirmPruneCommands) || (!prune && !this.settings.confirmRemovalCommands)) {
          await this.git.raw(cmdList)
          .then(() => {
            const showMsg = prune ? "Pruned notes" : `Removed note for commit ${commitHash} \nPath: ${repositoryPath}`;
            this.statusBar.showInformationMessage(`Git Notes: ${showMsg}`);
            this.manager.removeCommitByHash(commitHash, repositoryPath);
          });
          await this.loader(repositoryPath);
        }
      } else {
        this.logger.deprecated("Not a git repository (or any of the parent directories): .git");
        this.statusBar.showInformationMessage("Git Notes: Not a git repository (or any of the parent directories): .git");
      }
    } catch (error) {
      this.logger.deprecated(`An error occurred while pushing Git notes: ${error}`);
      this.statusBar.showErrorMessage(`Git Notes: An error occurred while pushing Git notes: ${error}`);
      const messageItem: vscode.MessageItem[] = [ { title: "Prune notes" }, {title: "Cancel"} ];
      const selected = await this.input.showInputWindowMessage("Failed to remove Git note", messageItem, true, true);
      if (selected?.title === "Prune notes") {
        await this.removeGitNote(commitHash, fileUri, repositoryPath, true);
      } else {
        this.statusBar.notesCount = this.manager.getExistingRepositoryDetails(repositoryPath)?.length || 0;
        this.statusBar.update();
      }
    }
  }

  /**
  * This function is deprecated. Use GitUtils() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public async getGitUrl(): Promise<string> {
    this.logger.deprecated("getGitUrl()");
    try {
      const result = await new Promise<string>((resolve, reject) => {
        this.git.remote(["get-url", "origin"], (err, result) => {
          if (err) {
            reject("Error retrieving Git URL");
          } else {
            resolve(result as string);
          }
        });
      });

      let gitUrl = result.trim();
      const regex = /^(?:git:\/\/|git@|git\/\/\/)(.+)$/i;
      // Convert SSH URL to HTTPS URL if necessary
      if (gitUrl.match(regex)) {
        this.logger.deprecated(`ssh git url found: ${gitUrl}`);
        gitUrl = gitUrl.replace(/:/, "/").replace(/.git$/, "");
        gitUrl = gitUrl.replace(regex, "https://$1");
      } else {
        this.logger.deprecated(`https git url found: ${gitUrl}`);
        gitUrl = gitUrl.replace(/.git$/, "");
      }

      this.logger.deprecated(`return ${gitUrl}`);
      return gitUrl;
    } catch (error) {
      this.logger.deprecated(`Failed to retrieve Git URL:', ${error}`);
      return "";
    }
  }
}
