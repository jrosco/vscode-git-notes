import * as vscode from "vscode";
import { DisposableInstance } from "./instance";

export class DisposableWebView extends DisposableInstance {
  constructor() {
    super();
  }

  public async disposable(): Promise<vscode.Disposable> {
    let disposable = vscode.commands.registerCommand(
      "extension.runWebview",
      async () => {
        this.logger.info("extension.runWebview command called");
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor !== undefined) {
          const repositoryPath = this.cache.getGitRepositoryPath(
            activeEditor.document.uri
          );
          await this.cache
            .load(repositoryPath)
            .then((repositoryDetails) => {
              this.gitNotesPanel.createOrShow(
                activeEditor.document.uri,
                repositoryDetails
              );
            })
            .catch((error) => {
              this.logger.error(error);
            });
        }
      }
    );
    return disposable;
  }
}
