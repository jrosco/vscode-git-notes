import * as vscode from "vscode";
import { DisposableInstance } from "./instance";
import { FetchNotes, FetchNotesParameters } from "../git/exports";

export class DisposableFetch extends DisposableInstance {
  private fetch: FetchNotes;

  constructor() {
    super();
    this.fetch = new FetchNotes();
  }

  public async disposable(): Promise<vscode.Disposable> {
    let disposable = vscode.commands.registerCommand(
      "extension.fetchGitNotes",
      async (cmdRepositoryPath?, force?) => {
        this.logger.info("extension.fetchGitNotes command called");
        const activeEditor = vscode.window.activeTextEditor;
        const repositoryPath = cmdRepositoryPath
          ? cmdRepositoryPath
          : this.cache.getGitRepositoryPath(activeEditor?.document.uri);
        const fetchParameter: FetchNotesParameters = {
          repositoryPath: repositoryPath
            ? repositoryPath
            : activeEditor?.document.uri,
          force: force ? force : false,
        };
        if (fetchParameter.repositoryPath !== undefined) {
          this.statusBar.message = "Fetching ...";
          this.statusBar.update();
          let confirm;
          const title = fetchParameter.force
            ? "Confirm Fetch Force"
            : "Fetch Notes";
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
            await this.fetch
              .command(fetchParameter)
              .then(() => {
                this.statusBar.showInformationMessage("Git Notes: Fetched");
              })
              .catch(async () => {
                const messageItem: vscode.MessageItem[] = [
                  { title: "Push notes" },
                  { title: "Force fetch" },
                  { title: "Cancel" },
                ];
                const selected = await this.input.showInputWindowMessage(
                  "Failed to fetch Git Notes",
                  messageItem,
                  true,
                  true
                );
                if (selected?.title === "Push notes") {
                  await vscode.commands.executeCommand(
                    "extension.pushGitNotes",
                    fetchParameter.repositoryPath
                  );
                } else if (selected?.title === "Force fetch") {
                  await vscode.commands.executeCommand(
                    "extension.fetchGitNotes",
                    fetchParameter.repositoryPath,
                    true
                  );
                }
              })
              .finally(() => {
                this.statusBar.notesCount =
                  this.cache.getExistingRepositoryDetails(repositoryPath)
                    ?.length || 0;
                this.statusBar.update();
                this.refreshWebView(fetchParameter.repositoryPath);
              });
          }
        }
      }
    );
    return disposable;
  }
}
