import * as vscode from 'vscode';
import { LogResult } from 'simple-git';
import * as fs from 'fs';

import { GitCommandsInstance } from "./instance";
import { LoggerService } from "../log/service";
import { FileChanges } from "../manager/exports";

export class GitUtils extends GitCommandsInstance {
  private gitUrlSCMProvider: string[];

  constructor() {
    super(); // Call the constructor of the GitCommandsInstance class
    this.gitUrlSCMProvider = this.settings.gitUrlSCMProvider;
  }

  public convertGitUrlSCMProvider(
    gitUrl: string,
    commitHash: string
  ): string | undefined {
    this.logger.info(
      `GitNotes: convertGitUrlSCMProvider called with ${gitUrl} and commitHash ${commitHash}`
    );
    for (const gitSCMProvider of this.gitUrlSCMProvider) {
      this.logger.debug(`GitNotes: gitUrlSCMProvider is ${gitSCMProvider}`);
      // Extract the parts of the URL
      const parsedUrl = new URL(gitUrl);
      const protocol = parsedUrl.protocol;
      const domain = parsedUrl.hostname;
      const pathname = parsedUrl.pathname;
      // Extract slash(/) paths from pathname
      const pathParts = pathname.split("/").filter((part) => part !== ""); // Split pathname and remove empty parts
      // Check for a match between gitUrl and gitUrlSCMProvider entries
      const getMatch = gitSCMProvider.includes(domain);
      const isValidCommitHash =
        commitHash !== undefined && commitHash.trim() !== "";
      // Check if the gitUrlSCMProvider is in the gitUrl
      if (getMatch && isValidCommitHash) {
        this.logger.debug(`GitNotes: ${gitUrl} is supported`);
        // Define a regular expression to match values inside curly brackets
        const regex = /\{([^{}]+)\}/g;
        // Initialize an array to store the names and index numbers of placeholders
        const placeholders: {
          position: number;
          name: string;
          placeholder: string;
        }[] = [];
        let match;
        let index = 0;
        while ((match = regex.exec(gitSCMProvider)) !== null) {
          const [fullMatch, name] = match; // fullMatch is the full matched string, name is the value inside curly brackets
          // Ignore the commitId placeholder
          if (name !== "commitId") {
            placeholders.push({
              position: index,
              name: name,
              placeholder: fullMatch,
            });
            index++;
          }
        }
        // handle path# placeholders
        const regexPaths = /{path\d+}/g;
        const pathMatch = gitSCMProvider.match(regexPaths);
        let gitCommitUrl = gitSCMProvider;
        for (const path of pathMatch ?? []) {
          const index = placeholders.findIndex(
            (placeholder) => placeholder.placeholder === path
          );
          const position = placeholders[index].position;
          gitCommitUrl = gitCommitUrl.replace(path, pathParts[position]);
        }
        const fullGitCommitUrl = `${protocol}//${gitCommitUrl
          .replace("{commitId}", commitHash)
          .replace(/\/\//g, "/")}`;
        // Return the new URL
        if (fullGitCommitUrl) {
          this.logger.debug(`GitNotes: gitCommitUrl is ${fullGitCommitUrl}`);
          return fullGitCommitUrl;
        }
      }
    }
    this.logger.debug(
      `GitNotes: ${gitUrl} is not supported returning default URL`
    );
    return `${gitUrl}/commit/${commitHash}`;
  }

  // Getters
  public get getGitUrlSCMProvider() {
    return this.gitUrlSCMProvider;
  }
  public async getLatestCommit(fileUri?: vscode.Uri, repositoryPath?: string): Promise<string | undefined> {
    this.logger.debug(`getLatestCommit(${fileUri}, ${repositoryPath})`);
    repositoryPath = this.manager.getGitRepositoryPath(fileUri, repositoryPath);
    this.setRepositoryPath(repositoryPath);
    if (repositoryPath !== undefined) {
      try {
        const commitId = await this.git.log({ n: 1 });
        this.logger.debug(`getLatestCommit found ${commitId.latest?.hash}`);
        return commitId.latest?.hash;
      } catch (error) {
        this.logger.error(`error getting latest commit: ${error}`);
      }
    }
    return undefined;
  };

  public async getGitUrl(): Promise<string> {
    this.logger.debug("getGitUrl()");
    this.setRepositoryPath(this.repositoryPath);
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
        this.logger.debug(`ssh git url found: ${gitUrl}`);
        gitUrl = gitUrl.replace(/:/, "/").replace(/.git$/, "");
        gitUrl = gitUrl.replace(regex, "https://$1");
      } else {
        this.logger.debug(`https git url found: ${gitUrl}`);
        gitUrl = gitUrl.replace(/.git$/, "");
      }

      this.logger.debug(`return ${gitUrl}`);
      return gitUrl;
    } catch (error) {
      this.logger.error(`Failed to retrieve Git URL:', ${error}`);
      return "";
    }
  }

  public async getGitNotesList(commitHash?: string): Promise<any[]> {
    this.logger.debug("getGitNotesList()");
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

  public getGitNoteMessage(commitHash: string): Promise<string> {
    this.logger.debug(`getGitNoteMessage(${commitHash})`);
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

  public getCommitDetails(commitSHA: string): Promise<any[]> {
    this.logger.debug(`getCommitDetails(${commitSHA})`);
    return new Promise<any[]>(async (resolve, reject) => {
      this.git.show(['--stat', commitSHA])
        .then(commitDetails => {
          const parsedDetails = this._parseCommitDetails(commitDetails, commitSHA);
          resolve(parsedDetails);
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          reject(new Error(`Error retrieving commit details: ${errorMessage}`));
          // this.statusBar.showErrorMessage(`Git Notes: Error retrieving commit details: ${errorMessage}`);
        });
    });
  }

  private async _parseCommitDetails(commitDetails: string, commitSHA: string) {
    this.logger.debug(`_parseCommitDetails(${commitDetails}, ${commitSHA})`);
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

    this.logger.debug(`return ${commits}`);
    return commits;
  }

  private _getCommitFileChanges(commitSHA: string): Promise<any[]> {
    this.logger.debug(`_getCommitFileChanges(${commitSHA})`);
    return new Promise<any[]>(async (resolve, reject) => {
      this.git.show(["--numstat", "--oneline", commitSHA])
        .then(commitFilesDetails => {
          const parsedDetails = this._parseFileDetails(commitFilesDetails, this.repositoryPath);
          resolve(parsedDetails);
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          reject(new Error(`Error retrieving commit details: ${errorMessage}`));
          // this.statusBar.showErrorMessage(`Git Notes: Error retrieving commit details: ${errorMessage}`);
        });
    });
  }

  private async _parseFileDetails(gitOutput: string, repositoryPath: string) {
    this.logger.debug(`_parseFileDetails(${gitOutput}, ${repositoryPath})`);
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
}
