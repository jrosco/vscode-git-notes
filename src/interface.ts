import * as vscode from 'vscode';
import * as fs from 'fs';

import { LoggerService, LogLevel } from './log/service';
import { GitNotesSettings } from './settings';

export interface RepositoryDetails {
  repositoryPath: string | undefined;
  repositoryUrl: string | undefined
  commitDetails: CommitDetails[];
}

export interface CommitDetails {
  commitHash: string;
  noteHash: string;
  date: Date;
  note?: string | undefined;
  author?: string | undefined;
  message?: string | undefined;
  fileChanges: FileChanges[] | [];
}

export interface FileChanges {
  file: string;
  changes: number;
  deletions: number;
  insertions: number;
  deleted?: boolean | false;
  added?: boolean | false;
  renamed?: boolean | false;
}

export class RepositoryManager {
  public repositoryDetailsInterface: RepositoryDetails[];
  public commitDetailsInterface?: CommitDetails[];
  public fileChangeInterface?: FileChanges[];
  
  private logger: LoggerService;
  private static instance: RepositoryManager;
  private settings: GitNotesSettings;

  constructor() {
    this.repositoryDetailsInterface = [];
    this.commitDetailsInterface = [];
    this.fileChangeInterface = [];
    this.settings = new GitNotesSettings();
    this.logger = LoggerService.getInstance(this.settings.logLevel);
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public static getInstance(): RepositoryManager {
    if (!RepositoryManager.instance) {
      RepositoryManager.instance = new RepositoryManager();
    }
    return RepositoryManager.instance;
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public getExistingRepositoryDetails(repositoryPath: string | undefined) {
    this.logger.deprecated(`getExistingRepositoryDetails(${repositoryPath})`);
    const repository = this.repositoryDetailsInterface.find(
      repo => repo.repositoryPath?.trim() === repositoryPath?.trim()
    );
    return repository ? repository.commitDetails : undefined;
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public getFileChangeFile(commitDetails: CommitDetails[], commitHash: string): string | undefined {
    this.logger.deprecated(`getFileChangeFile(${commitHash})`);
    const commit = commitDetails.find(commit => commit.commitHash === commitHash);
    if (commit) {
      const fileChange = commit.fileChanges ? commit.fileChanges[0]: undefined; // Assuming you want the first file change
      if (fileChange) {
        this.logger.deprecated(`getFileChangeFile(${commitHash}) = ${fileChange.file}`);
        return fileChange.file;
      }
    }
    return undefined; // Return undefined if commit or file change is not found
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public getExistingCommitDetails(repositoryPath: string, commitHash: string): CommitDetails | undefined {
    this.logger.deprecated(`getExistingCommitDetails(${repositoryPath}, ${commitHash})`);
    const commitDetails = this.getExistingRepositoryDetails(repositoryPath);
    const commit = commitDetails?.find(commit => commit.commitHash === commitHash);
    if (commit) {
      this.logger.deprecated(`getExistingCommitDetails(${commitHash}) found ${commit}`);
      return commit;
    } else {
      this.logger.deprecated(`getExistingCommitDetails(${commitHash}) returned false`);
      return undefined; // Return false if commit is not found
    }
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public noteDetailsExists(repositoryPath: string, commitHash: string): boolean {
    this.logger.deprecated(`noteExists(${commitHash})`);
    const commitDetails = this.getExistingRepositoryDetails(repositoryPath);
    const commit = commitDetails?.find(commit => commit.commitHash === commitHash);
    if (commit) {
      const note = commit.note;
      if (note) {
        this.logger.deprecated(`A note was found for commit ${commitHash}`);
        return true;
      }
    }
    this.logger.deprecated(`noteExists(${commitHash}) = false`);
    return false; // Return false if commit or note is not found
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public getGitNoteMessage(commitDetails?: CommitDetails[], commitHash?: string): string | undefined {
    this.logger.deprecated(`getGitNoteMessage(${commitHash})`);
    const commit = commitDetails?.find(commit => commit.commitHash === commitHash);
    if (commit) {
      const note = commit.note;
      if (note) {
        this.logger.deprecated(`getGitNoteMessage(${commitHash}) = ${note}`);
        return note;
      }
    }
    return undefined; // Return undefined if commit or note is not found
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public updateRepositoryDetails(repositoryPath: string | undefined, repositoryUrl: string, notes: CommitDetails[]): void {
    this.logger.deprecated(`updateRepositoryDetails(${repositoryPath}, ${repositoryUrl}, notes found ${notes.length})`);
    const index = this.repositoryDetailsInterface.findIndex(
      repo => repo.repositoryPath === repositoryPath
    );
    // Sort the notes array by date before assigning
    if (!this.settings.sortDateNewestFirst) {
      notes.sort((a, b) => a.date.getTime() - b.date.getTime());
    } else {
      notes.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    if (index !== -1) {
      this.repositoryDetailsInterface[index].commitDetails = notes;
      this.repositoryDetailsInterface[index].repositoryUrl = repositoryUrl;
    } else {
      this.repositoryDetailsInterface.push({ repositoryPath: repositoryPath,
        repositoryUrl: repositoryUrl,
        commitDetails: notes
      });
    }
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public async updateNoteMessage(commitHashToUpdate: string, newNote: string, repositoryPath?: string | undefined) {
    this.logger.deprecated(`updateNoteMessage(${commitHashToUpdate}, ${newNote})`);
    const repoDetails = this.repositoryDetailsInterface.find(
      repo => repo.repositoryPath === repositoryPath
      );
    if (repoDetails) {
      const index = repoDetails.commitDetails.findIndex(commit => commit.commitHash === commitHashToUpdate);
      if (index !== -1) {
        this.logger.deprecated(`Note updated successfully for commit with hash ${commitHashToUpdate}`);
        repoDetails.commitDetails[index].note = newNote;
      } else {
        this.logger.deprecated(`Commit with hash ${commitHashToUpdate} not found. Note update failed.`);
      }
    }
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public async clearRepositoryDetails(document?: vscode.Uri | undefined, repositoryPath?: string | undefined): Promise<void> {
    this.logger.deprecated(`clearRepositoryDetails(${document}, ${repositoryPath})`);
    repositoryPath = this.getGitRepositoryPath(document, repositoryPath);
    const index = this.repositoryDetailsInterface.findIndex(
      repo => repo.repositoryPath === repositoryPath
    );

    if (index !== -1) {
      this.repositoryDetailsInterface.splice(index, 1);
    }
  }

  public async removeCommitByHash(commitHashToRemove: string, repositoryPath?: string | undefined) {
    this.logger.deprecated(`removeCommitByHash(${commitHashToRemove})`);
    const index = this.repositoryDetailsInterface.findIndex(
      repo => repo.repositoryPath === repositoryPath
    );

    if (index !== -1) {
      this.repositoryDetailsInterface[index].commitDetails = this.repositoryDetailsInterface[index].commitDetails.filter(
        (commit) => commit.commitHash !== commitHashToRemove
      );
    }
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public getGitRepositoryPath(fileUri?: vscode.Uri | undefined, repositoryPath?: string | undefined): string {
    this.logger.deprecated(`getGitRepositoryPath(${fileUri}, ${repositoryPath})`);
    let workspaceFolder;
    if (fileUri !== undefined) {
      workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
    } else if (repositoryPath !== undefined) {
      workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(repositoryPath!));
    } else {
      workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    }

    if (workspaceFolder) {
      const gitDirPath = `${workspaceFolder.uri.fsPath}/.git`;
      try {
        const stats = fs.statSync(gitDirPath);
        if (stats.isDirectory()) {
          return workspaceFolder.uri.fsPath;
        }
      } catch (err) {
        // The .git directory doesn't exist or an error occurred
        return "";
      }
    }
    return "";
  }

  /**
  * This function is deprecated. Use RepositoryManager() instead.
  * @deprecated Since version 0.2.2. Will be removed in version 1.0.0.
  */
  public getRepositoryDetailsInterface() {
    this.logger.deprecated(`getRepositoryDetailsInterface(${this.repositoryDetailsInterface})`);
    return this.repositoryDetailsInterface;
  }
}
