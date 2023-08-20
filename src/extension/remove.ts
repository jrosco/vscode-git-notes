import * as vscode from "vscode";
import { DisposableInstance } from "./instance";
import { RemoveNote, RemoveNoteParameters } from "../git/exports";

export class DisposableRemove extends DisposableInstance {
  private remove: RemoveNote;

  constructor() {
    super();
    this.remove = new RemoveNote();
  }
  public async disposable(): Promise<vscode.Disposable> {
    let disposable = vscode.commands.registerCommand(
      "extension.removeGitNote",
      async (cmdCommitHash?, cmdRepositoryPath?) => {
        this.logger.info("extension.removeGitNote command called");
        const activeEditor = vscode.window.activeTextEditor;
        const repositoryPath = cmdRepositoryPath
          ? cmdRepositoryPath
          : this.cache.getGitRepositoryPath(activeEditor?.document.uri);
        if (repositoryPath !== undefined) {
          cmdCommitHash
            ? undefined
            : this.input.setup(
                "Remove a Git Note",
                "Enter the Commit hash of the note to remove....",
                false
              );
          const commitHashInput = cmdCommitHash
            ? cmdCommitHash
            : await this.input.showInputBox();
          const commitHash = commitHashInput
            ? commitHashInput.replace(/\s/g, "")
            : undefined;
          const removeParameter: RemoveNoteParameters = {
            repositoryPath: repositoryPath
              ? repositoryPath
              : activeEditor?.document.uri,
            commitHash: commitHash,
          };
          if (removeParameter.commitHash !== undefined) {
            let confirm = undefined;
            const title = "Confirm Note Removal";
            const messageItem: vscode.MessageItem[] = [
              { title: title },
              { title: "Cancel" },
            ];
            if (this.settings.confirmRemovalCommands) {
              confirm = await this.input.showInputWindowMessage(
                `Note Commit Removal: ${commitHash}`,
                messageItem,
                true,
                false
              );
            }
            if (
              confirm?.title === title ||
              !this.settings.confirmRemovalCommands
            ) {
              await this.remove
                .command(removeParameter)
                .then(() => {
                  this.statusBar.showInformationMessage(
                    `Removed note for commit ${commitHash} \nPath: ${repositoryPath}`
                  );
                })
                .finally(() => {
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
      }
    );
    return disposable;
  }
}
