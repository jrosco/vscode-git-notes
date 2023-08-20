import * as vscode from "vscode";
import { DisposableInstance } from "./instance";
import { EditNote, EditNoteParameters } from "../git/edit";
import { EditWindow } from "../ui/edit";
import { GitUtils } from "../git/utils";

export class DisposableEdit extends DisposableInstance {
  private edit: EditNote;
  private gitUtils;

  constructor() {
    super();
    this.edit = new EditNote();
    this.gitUtils = new GitUtils();
  }
  public async disposable(): Promise<vscode.Disposable> {
    let disposable = vscode.commands.registerCommand(
      "extension.editGitNotes",
      async (cmdRepositoryPath?, cmdCommitHash?) => {
        this.logger.info("extension.editGitNotes command called");
        const activeEditor = vscode.window.activeTextEditor;
        const repositoryPath = cmdRepositoryPath
          ? cmdRepositoryPath
          : this.cache.getGitRepositoryPath(activeEditor?.document.uri);
        if (repositoryPath !== undefined) {
          cmdCommitHash
            ? undefined
            : this.input.setup(
                "Edit a Git Note",
                "Enter the Commit hash or leave blank to apply to last commit ....",
                false
              );
          const commitHashInput = cmdCommitHash
            ? cmdCommitHash
            : await this.input.showInputBox();
          const commitHash = commitHashInput
            ? commitHashInput.replace(/\s/g, "")
            : await this.gitUtils.getLatestCommit(undefined, repositoryPath);
          if (commitHashInput === false) {
            return;
          }
          let existingNote;
          // load details and wait before checking for existing notes
          await this.cache
            .loadNoteDetails(repositoryPath, commitHash)
            .then(() => {
              existingNote = this.cache.getGitNoteMessage(
                this.cache.getExistingRepositoryDetails(repositoryPath),
                commitHash
              );
            })
            .catch((error) => {
              this.logger.error(`loading details error: ${error}`);
            });
          const editWindow = new EditWindow(commitHash, existingNote);
          await editWindow.showEditWindow().then(async (message) => {
            const editParameter: EditNoteParameters = {
              repositoryPath: repositoryPath,
              commitHash: commitHash,
              message: message,
            };
            editParameter.message !== ""
              ? await this.edit
                  .command(editParameter)
                  .then(() => {
                    this.statusBar.showInformationMessage(
                      `Edited note for commit ${commitHash} \nPath: ${repositoryPath}`
                    );
                  })
                  .catch((error) => {
                    this.statusBar.showErrorMessage(
                      `An error occurred while editing Git note: ${error}`
                    );
                  })
                  .finally(() => {
                    this.statusBar.notesCount =
                      this.cache.getExistingRepositoryDetails(
                        editParameter.repositoryPath
                      )?.length || 0;
                    this.statusBar.update();
                    this.refreshWebView(editParameter.repositoryPath);
                  })
              : false;
          });
        }
      }
    );
    return disposable;
  }
}
