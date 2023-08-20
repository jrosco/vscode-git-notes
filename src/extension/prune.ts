import * as vscode from "vscode";
import { DisposableInstance } from "./instance";
import { RemoveNote, RemoveNoteParameters } from "../git/exports";

export class DisposablePrune extends DisposableInstance {
  private remove: RemoveNote;

  constructor() {
    super();
    this.remove = new RemoveNote();
  }
  public async disposable(): Promise<vscode.Disposable> {
    let disposable = vscode.commands.registerCommand(
      "extension.pruneGitNotes",
      async (cmdRepositoryPath?) => {
        this.logger.info("extension.pruneGitNotes command called");
        const activeEditor = vscode.window.activeTextEditor;
        const repositoryPath = cmdRepositoryPath
          ? cmdRepositoryPath
          : this.cache.getGitRepositoryPath(activeEditor?.document.uri);
        const removeParameter: RemoveNoteParameters = {
          repositoryPath: repositoryPath
            ? repositoryPath
            : activeEditor?.document.uri,
          commitHash: "",
          prune: true,
        };
        if (removeParameter.repositoryPath !== undefined) {
          let confirm = undefined;
          const title = "Confirm Prune";
          if (this.settings.confirmPruneCommands) {
            const messageItem: vscode.MessageItem[] = [
              { title: "Confirm Prune" },
              { title: "Cancel" },
            ];
            confirm = await this.input.showInputWindowMessage(
              `Prune Directory ${repositoryPath}`,
              messageItem,
              true,
              false
            );
          }
          if (
            confirm?.title === title ||
            !this.settings.confirmPushAndFetchCommands
          ) {
            await this.remove
              .command(removeParameter)
              .then(() => {})
              .catch((error) => {
                this.statusBar.showErrorMessage(error.message);
              })
              .finally(() => {
                this.statusBar.showInformationMessage(
                  `Pruned notes`
                );
                this.statusBar.notesCount =
                  this.cache.getExistingRepositoryDetails(
                    removeParameter.repositoryPath
                  )?.length || 0;
                this.statusBar.update();
                this.refreshWebView(removeParameter.repositoryPath);
              });
          }
        }
      }
    );
    return disposable;
  }
}
