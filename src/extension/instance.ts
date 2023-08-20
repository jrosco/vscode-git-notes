import { LoggerService } from "../log/service";
import { CacheManager } from "../manager/exports";
import { GitNotesPanel } from "../ui/webview";
import { GitNotesSettings } from "../settings";
import { GitNotesStatusBar } from "../ui/status";
import { NotesInput } from "../ui/input";

export class DisposableInstance {
  settings = new GitNotesSettings();
  logger = LoggerService.getInstance(this.settings.logLevel);
  cache = CacheManager.getInstance();
  statusBar = GitNotesStatusBar.getInstance();
  input = NotesInput.getInstance();
  gitNotesPanel = GitNotesPanel;

  // Refresh the webview after a git note has been updated
  public refreshWebView(repositoryPath: string) {
    this.logger.debug(
      `refreshWebView called [repositoryPath:${repositoryPath}]`
    );
    if (GitNotesPanel.currentPanel) {
      this.logger.debug(
        `Sending [refresh] command [repositoryPath:${repositoryPath}] to webview`
      );
      GitNotesPanel.currentPanel.postMessage({
        command: "refresh",
        repositoryPath: repositoryPath,
      });
    }
  }
}

// // Default Sub Class ////////////////////////////////////////////////////////
// import * as vscode from "vscode";
// import { DisposableInstance } from "./instance";

// export class DisposableExample extends DisposableInstance {
//   constructor() {
//     super();
//   }
//   public async disposable(): Promise<vscode.Disposable> {
//     let disposable = vscode.commands.registerCommand(
//       "extension.example",
//       async () => {});
//     return disposable;
//   }
// }
// /////////////////////////////////////////////////////////////////////////////

// // Import this in extension.ts //////////////////////////////////////////////
// import { DisposableExample } from "./extension/exports";
// const disposablePush = new DisposableExample();
// // Create the disposable
// const example = disposablePush.disposable();
// example.then((disposable) => {
//   context.subscriptions.push(disposable);
// });
// /////////////////////////////////////////////////////////////////////////////

