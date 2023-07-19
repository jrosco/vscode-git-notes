import * as vscode from 'vscode';
import * as fs from 'fs';

export interface RepositoryDetails {
  repositoryPath: string | undefined;
  repositoryUrl: string | undefined
  commitDetails: CommitDetails[];
}

export interface CommitDetails {
  commitHash: string;
  notesHash: string;
  note: string;
  author: string;
  date: string;
  message: string;
  fileChanges: FileChanges[];
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

  private static instance: RepositoryManager;

  constructor() {
    this.repositoryDetailsInterface = [];
    this.commitDetailsInterface = [];
    this.fileChangeInterface = [];
  }

  public static getInstance(): RepositoryManager {
    if (!RepositoryManager.instance) {
      RepositoryManager.instance = new RepositoryManager();
    }
    return RepositoryManager.instance;
  }

  public getExistingRepositoryDetails(repositoryPath: string | undefined) {
    console.log("getExistingRepositoryDetails("+repositoryPath+")");
    const repository = this.repositoryDetailsInterface.find(
      repo => repo.repositoryPath?.trim() === repositoryPath?.trim()
    );
    return repository ? repository.commitDetails : undefined;
  }

  public getFileChangeFile(commitDetails: CommitDetails[], commitHash: string): string | undefined {
    const commit = commitDetails.find(commit => commit.commitHash === commitHash);
    if (commit) {
      const fileChange = commit.fileChanges[0]; // Assuming you want the first file change
      if (fileChange) {
        console.log("getFileChangeFile("+commitHash+") = "+fileChange.file);
        return fileChange.file;
      }
    }
    return undefined; // Return undefined if commit or file change is not found
  }

  public updateRepositoryDetails(repositoryPath: string | undefined, repositoryUrl: string, notes: CommitDetails[]): void {
    const index = this.repositoryDetailsInterface.findIndex(
      repo => repo.repositoryPath === repositoryPath
    );

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

  public async clearRepositoryDetails(document?: vscode.Uri | undefined, repositoryPath?: string | undefined): Promise<void> {
    repositoryPath = this.getGitRepositoryPath(document, repositoryPath);
    const index = this.repositoryDetailsInterface.findIndex(
      repo => repo.repositoryPath === repositoryPath
    );

    if (index !== -1) {
      this.repositoryDetailsInterface.splice(index, 1);
    }
  }

  public getGitRepositoryPath(fileUri?: vscode.Uri | undefined, repositoryPath?: string | undefined): string {
    console.log("getGitRepositoryPath("+fileUri+", "+repositoryPath+")");
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

  public getRepositoryDetailsInterface() {
    return this.repositoryDetailsInterface;
  }
}
