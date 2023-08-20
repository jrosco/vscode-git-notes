import * as vscode from "vscode";
import { DisposableInstance } from "./instance";
import { PushNotes, PushNotesParameters } from "../git/exports";

export class DisposablePush extends DisposableInstance {
  
	private push: PushNotes;

  constructor() {
    super();
		this.push = new PushNotes();
  }

  public async disposable(): Promise<vscode.Disposable> {
    let disposable = vscode.commands.registerCommand(
      "extension.pushGitNotes",
      async (cmdRepositoryPath?, force?) => {
        this.logger.info("extension.pushGitNotes command called");
        this.statusBar.reset();
        const activeEditor = vscode.window.activeTextEditor;
        const repositoryPath = cmdRepositoryPath
          ? cmdRepositoryPath
          : this.cache.getGitRepositoryPath(activeEditor?.document.uri);
        const pushParameter: PushNotesParameters = {
          repositoryPath: repositoryPath
            ? repositoryPath
            : activeEditor?.document.uri,
          force: force ? force : false,
        };
        if (pushParameter.repositoryPath !== undefined) {
          this.statusBar.message = "Pushing ...";
          this.statusBar.update();
          let confirm;
          const title = pushParameter.force
            ? "Confirm Push Force"
            : "Push Notes";
          if (this.settings.confirmPushAndFetchCommands) {
            const messageItem: vscode.MessageItem[] = [
              { title: title },
              { title: "Cancel" },
            ];
            confirm = await this.input.showInputWindowMessage(
              `Directory: ${repositoryPath}`,
              messageItem,
              true,
              false
            );
          }
          if (
            confirm?.title === title ||
            !this.settings.confirmPushAndFetchCommands
          ) {
            await this.push
              .command(pushParameter)
              .then(() => {
                this.statusBar.showInformationMessage("Pushed");
              })
              .catch(async (error) => {
                this.statusBar.showErrorMessage(error.message);
                const messageItem: vscode.MessageItem[] = [
                  { title: "Fetch notes" },
                  { title: "Force push" },
                  { title: "Cancel" },
                ];
                const selected = await this.input.showInputWindowMessage(
                  "Failed to push Git Notes",
                  messageItem,
                  true,
                  true
                );
                if (selected?.title === "Fetch notes") {
                  await vscode.commands.executeCommand(
                    "extension.fetchGitNotes",
                    pushParameter.repositoryPath
                  );
                } else if (selected?.title === "Force push") {
                  await vscode.commands.executeCommand(
                    "extension.pushGitNotes",
                    pushParameter.repositoryPath,
                    true
                  );
                }
              })
              .finally(() => {
                this.statusBar.notesCount =
                  this.cache.getExistingRepositoryDetails(repositoryPath)?.length ||
                  0;
                this.statusBar.update();
                this.refreshWebView(pushParameter.repositoryPath);
              });
          }
        }
      }
    );
    return disposable;
  }
}
