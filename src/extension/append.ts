import * as vscode from "vscode";
import { DisposableInstance } from "./instance";
import { AppendNote, AppendNoteParameters } from "../git/append";
import { EditWindow } from "../ui/edit";
import { GitUtils } from "../git/utils";

export class DisposableAppend extends DisposableInstance {
  private append: AppendNote;
  private gitUtils;

  constructor() {
    super();
    this.append = new AppendNote();
    this.gitUtils = new GitUtils();
  }
  public async disposable(): Promise<vscode.Disposable> {
    let disposable = vscode.commands.registerCommand(
      "extension.appendGitNotes",
      async (cmdRepositoryPath?, cmdCommitHash?) => {
        this.logger.info("extension.appendGitNotes command called");
        const activeEditor = vscode.window.activeTextEditor;
        const repositoryPath = cmdRepositoryPath
          ? cmdRepositoryPath
          : this.cache.getGitRepositoryPath(activeEditor?.document.uri);
        let commitHash = "";
        let inputCommitHash;
        if (cmdCommitHash === undefined) {
          this.input.setup(
            "Append a Git Note",
            "Enter the Commit hash or leave blank to apply to last commit ....",
            false
          );
          inputCommitHash =
            (await this.input.showInputBox()) ||
            (await this.gitUtils.getLatestCommit(undefined, repositoryPath));
        }
        if (repositoryPath !== undefined) {
          commitHash = cmdCommitHash ? cmdCommitHash : inputCommitHash;
          if (!commitHash) {
            return;
          }
          commitHash = commitHash.replace(/\s/g, "");
          const editWindow = new EditWindow(commitHash);
          await editWindow.showEditWindow().then(async (message) => {
            const appendParameter: AppendNoteParameters = {
              repositoryPath: repositoryPath,
              commitHash: commitHash,
              message: message,
            };
            appendParameter.message !== ""
              ? await this.append
                  .command(appendParameter)
                  .then(() => {
                    this.statusBar.showInformationMessage(
                      `Git Notes: Appended note for commit ${commitHash} \nPath: ${repositoryPath}`
                    );
                  })
                  .catch((error) => {
                    this.statusBar.showErrorMessage(
                      `Git Notes: An error occurred while appending Git note: ${error}`
                    );
                  })
                  .finally(() => {
                    this.statusBar.notesCount =
                      this.cache.getExistingRepositoryDetails(
                        appendParameter.repositoryPath
                      )?.length || 0;
                    this.statusBar.update();
                    this.refreshWebView(appendParameter.repositoryPath);
                  })
              : false;
          });
        }
      }
    );
    return disposable;
  }
}
