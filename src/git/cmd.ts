import simpleGit, { SimpleGit } from 'simple-git';
import * as vscode from 'vscode';
import * as fs from 'fs';

// debug simple-git
// const debug = require('debug');
// debug.enable('simple-git:task:push:*');

import { GitNotesStatusBar } from '../ui/status';
import { NotesOutputChannel } from '../ui/output';

import {
  RepositoryManager,
  RepositoryDetails,
  CommitDetails,
  FileChanges
} from '../interface';

export class GitCommands {

  public repositoryPath: string;
  private git: SimpleGit;
  private manager: RepositoryManager;
  private statusBar: GitNotesStatusBar;
  private output: NotesOutputChannel;

  constructor() {
    this.git = simpleGit();
    this.manager = RepositoryManager.getInstance();
    this.statusBar = GitNotesStatusBar.getInstance();
    this.output = new NotesOutputChannel();
    this.repositoryPath = "";
  }

  private _setRepositoryPath(repositoryPath: string): void {
    this.repositoryPath = repositoryPath;
    try {
      this.git = simpleGit(repositoryPath);
    } catch (error) {
      console.log(error);
    }
  }

  public getRepositoryPath() {
    return this.repositoryPath;
  }

  public async getNotes(repositoryPath?: string): Promise<RepositoryDetails[]> {
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
      console.error(error);
    }
    return this.manager.repositoryDetailsInterface;
  }

  private _getGitNotes(): Promise<any[]> {
    console.log("_getGitNotes()");
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
        reject(new Error("Error parsing Git notes: " + error));
      }
    });
  }

  private _getGitNoteMessage(commitHash: string): Promise<string> {
    console.log("_getGitNoteMessage("+commitHash+")");
    return new Promise<string>(async (resolve, reject) => {
      this.git.raw(
        ["notes", "--ref=refs/notes/commits", "show", commitHash],
        (err, result) => {
          if (err) {
            reject(new Error("Error retrieving note details: " + err));
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  private _getCommitDetails(commitSHA: string): Promise<any[]> {
    console.log(`_getCommitDetails(${commitSHA})`);
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
    console.log(`_getCommitDetails(${commitSHA})`);
    return new Promise<any[]>(async (resolve, reject) => {
      this.git.show(['--numstat', '--oneline', commitSHA])
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

    return commits;
  }

  public async fetchGitNotes(fileUri?: vscode.Uri, repositoryPath?: string): Promise<void> {
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this._setRepositoryPath(repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        this.statusBar.message = "Fetching ...";
        this.statusBar.update();
        const refspec = 'refs/notes/commits:refs/notes/commits'; // Set the refspec to fetch the Git notes. Make this a setting
        await this.git.fetch('origin', refspec)
        .then((message) => {
          this.output.log(message.raw);
          this.statusBar.showInformationMessage("Git Notes: Fetched");
          this.manager.clearRepositoryDetails(undefined, repositoryPath);
        }).catch((error) => {
          this.output.log(error);
          this.statusBar.showErrorMessage("Git Notes:" + error);
        });
        this.getNotes(repositoryPath);
      } else {
        this.output.log("Not a git repository (or any of the parent directories): .git ");
        this.statusBar.showInformationMessage("Git Notes: Not a git repository (or any of the parent directories): .git");
      }
    } catch (error) {
      this.output.log('An error occurred while fetching Git notes:'+ error);
      this.statusBar.showErrorMessage("Git Notes: An error occurred while fetching Git notes:" + error);
    }
  }
  public async pushGitNotes(fileUri?: vscode.Uri, repositoryPath?: string): Promise<void> {
    console.log("pushGitNotes("+fileUri+","+repositoryPath+")");
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this._setRepositoryPath(this.repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        this.statusBar.message = "Pushing ...";
        this.statusBar.update();
        const refspec = 'refs/notes/commits'; // Set the refspec to fetch the Git notes. Make this a setting
        await this.git.push('origin', refspec)
        .then((message) => {
          if (message.pushed.length > 0) {
            this.statusBar.showInformationMessage("Git Notes: Everything up-to-date");
          } else {
            this.statusBar.showInformationMessage("Git Notes: Pushed " + message.update?.hash.from + " -> " + message.update?.hash.to);
          }
          this.manager.clearRepositoryDetails(undefined, repositoryPath);
        }).catch((error) => {
          this.output.log(error);
          this.statusBar.showErrorMessage("Git Notes:" + error);
        });
        this.getNotes(this.repositoryPath);
      } else {
        this.output.log("Not a git repository (or any of the parent directories): .git");
        this.statusBar.showInformationMessage("Git Notes: Not a git repository (or any of the parent directories): .git");
      }
    } catch (error) {
      this.output.log('An error occurred while pushing Git notes: ' + error);
      this.statusBar.showErrorMessage('Git Notes: An error occurred while pushing Git notes: ' + error);
    }
  }

  public async removeGitNote(commitHash: string, fileUri?: vscode.Uri, repositoryPath?: string, prune?: boolean): Promise<void> {
    this.output.log("Running removeGitNote() command for commit " + commitHash);
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this._setRepositoryPath(repositoryPath);
    this.statusBar.reset();
    try {
      if (repositoryPath !== undefined) {
        this.statusBar.message = "Removing ...";
        this.statusBar.update();
        const cmdList = prune ? ['notes', 'prune'] : ['notes', 'remove', commitHash];
        console.log("cmdList: " + cmdList + "for " + repositoryPath);
        await this.git.raw(cmdList)
        .then(() => {
          const showMsg = prune ? "Git Notes: Pruned notes" : "Git Notes: Removed note for commit " + commitHash + "\nPath: " + repositoryPath;
          this.statusBar.showInformationMessage(showMsg);
          this.manager.clearRepositoryDetails(undefined, repositoryPath);
        }).catch((error) => {
          this.output.log(error);
          this.statusBar.showErrorMessage("Git Notes:" + error);
        });
        this.getNotes(repositoryPath);
      } else {
        this.output.log("Not a git repository (or any of the parent directories): .git");
        this.statusBar.showInformationMessage("Git Notes: Not a git repository (or any of the parent directories): .git");
      }
    } catch (error) {
      this.output.log('An error occurred while pushing Git notes: ' + error);
      this.statusBar.showErrorMessage('Git Notes: An error occurred while pushing Git notes: ' + error);
    }
  }

  private async _getGitUrl(): Promise<string> {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        this.git.remote(['get-url', 'origin'], (err, result) => {
          if (err) {
            reject('Error retrieving Git URL');
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

      return gitUrl;
    } catch (error) {
      console.error('Failed to retrieve Git URL:', error);
      return "";
    }
  }
}
