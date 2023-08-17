import * as vscode from "vscode";
import { DisposableInstance } from "./instance";
import { AddNote, AddNoteParameters } from "../git/add";
import { EditWindow } from "../ui/edit";
import { GitUtils } from "../git/utils";

export class DisposableAdd extends DisposableInstance {
  private add: AddNote;
  private gitUtils;

  constructor() {
    super();
    this.add = new AddNote();
    this.gitUtils = new GitUtils();
  }
  public async disposable(): Promise<vscode.Disposable> {
    let disposable = vscode.commands.registerCommand(
      "extension.addGitNotes",
      async (cmdRepositoryPath?, cmdCommitHash?, force?) => {
        this.logger.info("extension.addGitNotes command called");
        const activeEditor = vscode.window.activeTextEditor;
        const repositoryPath = cmdRepositoryPath
          ? cmdRepositoryPath
          : this.cache.getGitRepositoryPath(activeEditor?.document.uri);
        if (repositoryPath !== undefined) {
          cmdCommitHash
            ? undefined
            : this.input.setup(
                "Add a Git Note",
                "Enter the Commit hash or leave blank to apply to last commit ....",
                false
              );
          const commitHashInput = cmdCommitHash
            ? cmdCommitHash
            : await this.input.showInputBox();
          this.statusBar.message = "Adding Message ...";
          this.statusBar.update();
          const commitHash = commitHashInput
            ? commitHashInput.replace(/\s/g, "")
            : await this.gitUtils.getLatestCommit(undefined, repositoryPath);
          if (commitHashInput === false) {
            return;
          }
          const check = this.cache.getExistingCommitDetails(
            repositoryPath,
            commitHash
          );
          if (check?.commitHash && !force) {
            const messageItem: vscode.MessageItem[] = [
              { title: "Append" },
              { title: "Edit" },
              { title: "Overwrite" },
              { title: "Cancel" },
            ];
            const selected = await this.input.showInputWindowMessage(
              `Git Note already exist for ${commitHash}`,
              messageItem,
              true,
              false
            );
            if (selected?.title === "Append") {
              await vscode.commands.executeCommand(
                "extension.appendGitNotes",
                repositoryPath,
                commitHash
              );
            } else if (selected?.title === "Overwrite") {
              await vscode.commands.executeCommand(
                "extension.addGitNotes",
                repositoryPath,
                commitHash,
                true
              );
            } else if (selected?.title === "Edit") {
              await vscode.commands.executeCommand(
                "extension.editGitNotes",
                repositoryPath,
                commitHash
              );
            }
          } else {
            const editWindow = new EditWindow(commitHash);
            await editWindow.showEditWindow().then(async (message) => {
              const addParameter: AddNoteParameters = {
                repositoryPath: repositoryPath,
                commitHash: commitHash,
                message: message,
                force: force ? force : false,
              };
              addParameter.message !== ""
                ? await this.add
                    .command(addParameter)
                    .then(() => {
                      this.statusBar.showInformationMessage(
                        `Added note for commit ${commitHash} \nPath: ${repositoryPath}`
                      );
                    })
                    .finally(() => {
                      this.refreshWebView(addParameter.repositoryPath);
                    })
                : false;
            });
          }
        }
        this.statusBar.notesCount =
          this.cache.getExistingRepositoryDetails(repositoryPath)?.length || 0;
        this.statusBar.update();
      }
    );
    return disposable;
  }
}
