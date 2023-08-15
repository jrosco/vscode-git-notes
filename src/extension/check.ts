import * as vscode from "vscode";
import { DisposableInstance } from "./instance";

export class DisposableCheck extends DisposableInstance {
  constructor() {
    super();
  }

  public async disposable(): Promise<vscode.Disposable> {
    let disposable = vscode.commands.registerCommand(
      "extension.checkGitNotes",
      async (cmdRepositoryPath?) => {
        this.logger.info("extension.checkGitNotes command called");
        const activeEditor = vscode.window.activeTextEditor;
        const repositoryPath = cmdRepositoryPath
          ? cmdRepositoryPath
          : this.cache.getGitRepositoryPath(activeEditor?.document.uri);
        if (repositoryPath !== undefined) {
          await this.cache
            .clearRepositoryDetails(undefined, repositoryPath)
            .then(async () => {
              await this.cache
                .load(repositoryPath)
                .then(() => {})
                .catch((error) => {
                  this.logger.error(error);
                });
            })
            .finally(() => {
              this.statusBar.notesCount =
                this.cache.getExistingRepositoryDetails(repositoryPath)
                  ?.length || 0;
              this.statusBar.update();
              this.refreshWebView(repositoryPath);
            });
        }
      }
    );
    return disposable;
  }
}
