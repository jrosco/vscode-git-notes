import simpleGit, { SimpleGit } from 'simple-git';
import * as vscode from 'vscode';
import * as fs from 'fs';

// debug simple-git
// const debug = require('debug');
// debug.enable('simple-git:task:push:*');

import { GitNotesStatusBar } from '../ui/status';
import { NotesOutputChannel } from '../ui/output';
import { NotesInput } from '../ui/input';
import { LoggerService, LogLevel } from '../log/service';

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

  constructor() {
    this.git = simpleGit();
    this.manager = RepositoryManager.getInstance();
    this.statusBar = GitNotesStatusBar.getInstance();
    this.output = new NotesOutputChannel();
    this.logger = LoggerService.getInstance();
    this.repositoryPath = "";
    this.input = NotesInput.getInstance();

    this.logger.debug(`GitCommands constructor: ${Object.getOwnPropertyNames(this)}`);
  }

  private _setRepositoryPath(repositoryPath: string): void {
    this.logger.trace(`_setRepositoryPath(${repositoryPath})`);
    this.repositoryPath = repositoryPath;
    try {
      this.git = simpleGit(repositoryPath);
      this.logger.debug(`this.git: ${Object.getOwnPropertyNames(this.git)}`);
    } catch (error) {
      this.logger.error(`error setting repositoryPath: ${error}`);
    }
  }

  public getRepositoryPath() {
    this.logger.debug(`getRepositoryPath() return: ${this.repositoryPath}`);
    return this.repositoryPath;
  }

  public async getNotes(repositoryPath?: string): Promise<RepositoryDetails[]> {
    this.logger.debug(`getNotes(${repositoryPath})`);
    repositoryPath = repositoryPath || vscode.workspace.workspaceFolders?.toString() || "";
    this._setRepositoryPath(repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        const existing = this.manager.getExistingRepositoryDetails(repositoryPath);
        if (existing === undefined) {
          const commitDetailsInterface: CommitDetails[] = [];
          const notes = await this._getGitNotes();
          for (const note of notes) {
            const commitDetails = await this._getCommitDetails(note.commitHash);
            const detail: CommitDetails = {
              notesHash: note.notesHash,
              commitHash: note.commitHash,
              note: note.note,
              author: commitDetails[0].author,
              date: commitDetails[0].date,
              message: commitDetails[0].message,
              fileChanges: commitDetails[0].fileChanges,
            };
            commitDetailsInterface.push(detail);
          }
          const repositoryUrl = await this._getGitUrl();
          this.manager.updateRepositoryDetails(repositoryPath, repositoryUrl, commitDetailsInterface);
        }
      }
      this.statusBar.notesCount = this.manager.getExistingRepositoryDetails(repositoryPath)?.length || 0;
      this.statusBar.repositoryPath = repositoryPath;
      this.statusBar.update();
    } catch (error) {
      this.logger.error(`error getting notes: ${error}`);
    }
    return this.manager.repositoryDetailsInterface;
  }

  private _getGitNotes(): Promise<any[]> {
    this.logger.trace("_getGitNotes()");
    return new Promise<any[]>(async(resolve, reject) => {
      this.git.raw(["notes", "--ref=refs/notes/commits", "list"], (err, result) => {
        if (err) {
          reject(err);
        } else {
          const notes = this._parseGitNotes(result);
          resolve(notes);
        }
      });
    });
  }

  private _parseGitNotes(notesOutput: string): Promise<any[]> {
    this.logger.trace(`_parseGitNotes(${notesOutput})`);
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
              const message = await this._getGitNoteMessage(parts[1]);
              const note = {
                notesHash: parts[0],
                commitHash: parts[1],
                note: message,
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

  private _getGitNoteMessage(commitHash: string): Promise<string> {
    this.logger.trace(`_getGitNoteMessage(${commitHash})`);
    return new Promise<string>(async (resolve, reject) => {
      this.git.raw(
        ["notes", "--ref=refs/notes/commits", "show", commitHash],
        (error, result) => {
          if (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            reject(new Error(`Error retrieving note details: ${errorMessage}`));
            this.statusBar.showErrorMessage(`Git Notes: Error retrieving note: ${errorMessage}`);
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  private _getCommitDetails(commitSHA: string): Promise<any[]> {
    this.logger.trace(`_getCommitDetails(${commitSHA})`);
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

  private _getCommitFileChanges(commitSHA: string): Promise<any[]> {
    this.logger.trace(`_getCommitFileChanges(${commitSHA})`);
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

  private async _parseFileDetails(gitOutput: string, repositoryPath: string) {
    this.logger.trace(`_parseFileDetails(${gitOutput}, ${repositoryPath})`);
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

  private async _parseCommitDetails(commitDetails: string, commitSHA: string) {
    this.logger.trace(`_parseCommitDetails(${commitDetails}, ${commitSHA})`);
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

    const dateLine: string | undefined = lines.find((line) =>
      line.startsWith("Date:")
    );
    const date: string = dateLine ? dateLine.replace("Date:", "").trim() : "";

    // Get file changes
    const fileChanges = await this._getCommitFileChanges(commitSHA);

    const commit = {
      author: author,
      date: date,
      message: message,
      fileChanges: fileChanges,
    };

    commits.push(commit);

    this.logger.info(`return ${commits}`);
    return commits;
  }

  public async fetchGitNotes(fileUri?: vscode.Uri, repositoryPath?: string, force?: boolean): Promise<void> {
    this.logger.debug(`fetchGitNotes(${fileUri}, ${repositoryPath})`);
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this._setRepositoryPath(repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        this.statusBar.message = "Fetching ...";
        this.statusBar.update();
        const refspec = 'refs/notes/commits:refs/notes/commits'; // Set the refspec to fetch the Git notes. Make this a setting
        const cmdList = force ? ['origin', refspec, '--force'] : ['origin', refspec];
        await this.git.fetch(cmdList)
        .then((message) => {
          this.logger.debug(`message: ${message.raw}`);
          this.statusBar.showInformationMessage("Git Notes: Fetched");
          this.manager.clearRepositoryDetails(undefined, repositoryPath);
        });
        this.getNotes(repositoryPath);
      } else {
        this.logger.debug("Not a git repository (or any of the parent directories): .git ");
        this.statusBar.showInformationMessage("Git Notes: Not a git repository (or any of the parent directories): .git");
      }
    } catch (error) {
      this.output.log('An error occurred while fetching Git notes:'+ error);
      this.statusBar.showErrorMessage("Git Notes: An error occurred while fetching Git notes:" + error);
      const messageItem: vscode.MessageItem[] = [{ title: "Push notes" }, {title: "Force fetch"}, {title: "Cancel"}];
      const selected = await this.input.showInputWindowMessage("Failed to fetch Git Notes", messageItem, true, true);
      if (selected?.title === "Push notes") {
        await this.pushGitNotes(fileUri, repositoryPath);
      } else if (selected?.title === "Force fetch") {
        await this.fetchGitNotes(fileUri, repositoryPath, true);
      }
    }
  }

  public async pushGitNotes(fileUri?: vscode.Uri, repositoryPath?: string, force?: boolean): Promise<void> {
    this.logger.debug(`pushGitNotes(${fileUri}, ${repositoryPath})`);
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this._setRepositoryPath(this.repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        this.statusBar.message = "Pushing ...";
        this.statusBar.update();
        const refspec = 'refs/notes/commits'; // Set the refspec to fetch the Git notes. Make this a setting
        const cmdList = force ? ['origin', refspec, '--force'] : ['origin', refspec];
        await this.git.push(cmdList)
        .then((message) => {
          const showMsg = message.pushed.length > 0 ? "Everything up-to-date": "Pushed " + message.update?.hash.from + " -> " + message.update?.hash.to;
          this.statusBar.showInformationMessage(`Git Notes: ${showMsg}`);
          this.manager.clearRepositoryDetails(undefined, repositoryPath);

        });
        this.getNotes(this.repositoryPath);
      } else {
        this.logger.debug("Not a git repository (or any of the parent directories): .git");
        this.statusBar.showInformationMessage("Git Notes: Not a git repository (or any of the parent directories): .git");
      }
    } catch (error) {
      this.logger.error(`An error occurred while pushing Git notes: ${error}`);
      this.statusBar.showErrorMessage('Git Notes: An error occurred while pushing Git notes: ' + error);
      const messageItem: vscode.MessageItem[] = [{ title: "Fetch notes" }, {title: "Force push"}, {title: "Cancel"}];
      const selected = await this.input.showInputWindowMessage("Failed to push Git Notes", messageItem, true, true);
      if (selected?.title === "Fetch notes") {
        await this.fetchGitNotes(fileUri, repositoryPath);
      } else if (selected?.title === "Force push") {
        await this.pushGitNotes(fileUri, repositoryPath, true);
      }
    }
  }

  public async removeGitNote(commitHash: string, fileUri?: vscode.Uri, repositoryPath?: string, prune?: boolean): Promise<void> {
    this.logger.debug(`removeGitNote(${commitHash}, ${fileUri}, ${repositoryPath}, ${prune})`);
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this._setRepositoryPath(repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        this.statusBar.message = "Removing ...";
        this.statusBar.update();
        const cmdList = prune ? ['notes', 'prune'] : ['notes', 'remove', commitHash];
        this.logger.debug(`cmdList: ${cmdList} for ${repositoryPath}`);
        await this.git.raw(cmdList)
        .then(() => {
          const showMsg = prune ? "Pruned notes" : "Removed note for commit " + commitHash + "\nPath: " + repositoryPath;
          this.statusBar.showInformationMessage(`Git Notes: ${showMsg}`);
          this.manager.clearRepositoryDetails(undefined, repositoryPath);
        });
        this.getNotes(repositoryPath);
      } else {
        this.logger.debug("Not a git repository (or any of the parent directories): .git");
        this.statusBar.showInformationMessage("Git Notes: Not a git repository (or any of the parent directories): .git");
      }
    } catch (error) {
      this.logger.error(`An error occurred while pushing Git notes: ${error}`);
      this.statusBar.showErrorMessage(`Git Notes: An error occurred while pushing Git notes: ${error}`);
      const messageItem: vscode.MessageItem[] = [ { title: "Prune notes" }, {title: "Cancel"} ];
      const selected = await this.input.showInputWindowMessage("Failed to remove Git note", messageItem, true, true);
      if (selected?.title === "Prune notes") {
        await this.removeGitNote(commitHash, fileUri, repositoryPath, true);
      }
    }
  }

  private async _getGitUrl(): Promise<string> {
    this.logger.trace("_getGitUrl()");
    try {
      const result = await new Promise<string>((resolve, reject) => {
        this.git.remote(['get-url', 'origin'], (err, result) => {
          if (err) {
            reject("Error retrieving Git URL");
          } else {
            resolve(result as string);
          }
        });
      });

      let gitUrl = result.trim();

      // Convert SSH URL to HTTPS URL if necessary
      if (gitUrl.startsWith('git@')) {
        gitUrl = gitUrl.replace(/:/, '/').replace(/.git$/, '').replace(/^git@/, 'https://');
      }

      this.logger.info(`return ${gitUrl}`);
      return gitUrl;
    } catch (error) {
      this.logger.error(`Failed to retrieve Git URL:', ${error}`);
      return "";
    }
  }
}
