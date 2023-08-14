import * as vscode from "vscode";

import {
  CacheManager,
  RepositoryManager,
  RepositoryDetails,
} from "../manager/exports";
import { GitNotesStatusBar } from "../ui/status";
import { GitNotesSettings } from "../settings";
import { LoggerService } from "../log/service";
import { GitUtils } from "../git/exports";
export class GitNotesPanel {
  public static currentPanel: GitNotesPanel | undefined;
  private static readonly viewType = "gitNotesPanel";

  private statusBar: GitNotesStatusBar;

  private cache: CacheManager;
  private repositoryPath: string | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _document: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private settings: GitNotesSettings;
  private logger: LoggerService;

  private constructor(
    panel: vscode.WebviewPanel,
    document: vscode.Uri,
    repositoryDetails: RepositoryDetails[]
  ) {
    this._panel = panel;
    this._document = document;
    this.settings = new GitNotesSettings();
    this.logger = LoggerService.getInstance(this.settings.logLevel);
    this.cache = CacheManager.getInstance();
    this.statusBar = GitNotesStatusBar.getInstance();
    repositoryDetails = this.cache.getRepositoryDetailsInterface();

    // Set up the webview panel
    this.repositoryPath = this.cache.getGitRepositoryPath(document);
    this._panel.webview.html = this._getWebviewContent(
      this.repositoryPath,
      repositoryDetails
    );
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(
    document: vscode.Uri,
    repositoryDetails: RepositoryDetails[]
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel already exists, dispose it so we get a fresh new panel
    if (GitNotesPanel.currentPanel) {
      GitNotesPanel.currentPanel._panel.dispose();
    }

    const panel = vscode.window.createWebviewPanel(
      GitNotesPanel.viewType,
      "Git Notes",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [document],
      }
    );

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage(async (message) => {
      const cache = CacheManager.getInstance();
      const settings = new GitNotesSettings();
      const logger = LoggerService.getInstance(settings.logLevel);
      logger.debug(
        `webview onDidReceiveMessage: ${message.command}, ${message.repositoryPath}`
      );
      const utils = new GitUtils();
      switch (message.command) {
        case "repoOpen":
          await vscode.env.openExternal(
            vscode.Uri.parse(message.repositoryUrl)
          );
          break;
        case "repoAdd":
          await vscode.commands.executeCommand(
            "extension.addGitNotes",
            message.repositoryPath,
            undefined
          );
          break;
        case "repoPrune":
          await vscode.commands.executeCommand(
            "extension.pruneGitNotes",
            message.repositoryPath
          );
          break;
        case "repoPush":
          await vscode.commands.executeCommand(
            "extension.pushGitNotes",
            message.repositoryPath
          );
          break;
        case "repoFetch":
          await vscode.commands.executeCommand(
            "extension.fetchGitNotes",
            message.repositoryPath
          );
          break;
        case "commitOpen":
          const url = utils.convertGitUrlSCMProvider(
            message.commitUrl,
            message.commitHash
          );
          console.log("commitOpen: ", url);
          url !== undefined
            ? await vscode.env.openExternal(vscode.Uri.parse(url))
            : false;
          break;
        case "commitAppend":
          logger.debug(
            `webview commitAppend: ${message.repositoryPath}, ${message.commitHash}`
          );
          await vscode.commands.executeCommand(
            "extension.appendGitNotes",
            message.repositoryPath,
            message.commitHash
          );
          break;
        case "commitEdit":
          logger.debug(
            `webview commitEdit: ${message.repositoryPath}, ${message.commitHash}`
          );
          await vscode.commands.executeCommand(
            "extension.editGitNotes",
            message.repositoryPath,
            message.commitHash
          );
          break;
        case "commitRemove":
          logger.debug(
            `webview commitRemove: ${message.commitHash}, ${message.repositoryPath}`
          );
          await vscode.commands.executeCommand(
            "extension.removeGitNote",
            message.commitHash,
            message.repositoryPath
          );
          break;
        case "repoLoadMore":
          await cache.load(message.repositoryPath);
          break;
        case "repoClearCache":
          await vscode.commands.executeCommand(
            "extension.checkGitNotes",
            message.repositoryPath
          );
          break;
        case "commitLoad":
          await cache.loadNoteDetails(
            message.repositoryPath,
            message.commitHash
          );
        case "refresh":
          break;
        default:
          console.warn("Unknown command:", message.command);
          break;
      }
      // Update the content of the webview panel, if `message.repositoryPath` is set
      if (
        GitNotesPanel.currentPanel &&
        (message.refresh || message.command === "refresh")
      ) {
        GitNotesPanel.currentPanel.refreshWebViewContent(
          message.repositoryPath
        );
      }
    });

    // let webViewTab = vscode.window.onDidChangeActiveTextEditor((editor) => {
    //   // Check if the WebView panel is not active and close / dispose of panel
    //   if (editor?.document !== undefined) {
    //     GitNotesPanel.currentPanel?._panel.dispose();
    //     webViewTab.dispose();
    //   }
    // });
    GitNotesPanel.currentPanel = new GitNotesPanel(
      panel,
      document,
      repositoryDetails
    );
  }

  public postMessage(message: any) {
    if (this._panel) {
      this.logger.debug(
        `postMessage: ${message.command} ${message.repositoryPath}`
      );
      this._panel.webview.postMessage({ message });
    } else {
      return;
    }
  }

  public refreshWebViewContent(repositoryPath: string) {
    // Your logic to update the WebView content here
    const repositoryDetails = this.cache.getRepositoryDetailsInterface();
    this.logger.debug(
      `refreshWebViewContent(${repositoryPath}, ${repositoryDetails})`
    );
    if (this._panel && repositoryDetails !== undefined) {
      this.logger.debug(`refreshWebViewContent _panel: ${this._panel}`);
      const webViewContent = this._getWebviewContent(
        repositoryPath,
        repositoryDetails
      );
      this._panel.webview.html = webViewContent;
    }
  }

  public dispose() {
    GitNotesPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _getWebviewContent(
    repositoryPath: string | undefined,
    repositoryDetails: RepositoryDetails[]
  ) {
    // Filter repositoryDetails based on exact match of repositoryPath
    if (repositoryPath !== undefined) {
      const filteredRepositoryDetails = repositoryDetails.filter(
        (details) => details.repositoryPath === repositoryPath
      );
      this.statusBar.message = "Close Tab";
      this.statusBar.command = "workbench.action.closeActiveEditor";
      this.statusBar.update();

      // Use the passed variable value in the HTML content
      const isDarkTheme = this.settings.isDarkThemeEnabled;
      // heading colors
      const headingColor = isDarkTheme ? "black" : "black";
      const headingBgColor = isDarkTheme ? "LightGray" : "LightGray";
      // commit hash colors
      const commitHashColor = isDarkTheme ? "white" : "black";
      const commitHashBgColor = isDarkTheme ? "#92a8d1" : "#92a8d1";
      // note hash colors
      const noteHashColor = isDarkTheme ? "white" : "white";
      const noteHashBgColor = isDarkTheme ? "#034f84" : "#034f84";
      // text colors
      const color = isDarkTheme ? "white" : "black";
      // const bgColor = isDarkTheme ? 'LightGray': 'LightGray';

      const vscodeScript: string = `
        function initWebview() {
          const vscode = acquireVsCodeApi();
      `;
      const eventListenersScript: string = filteredRepositoryDetails
        .map(
          (details) => `
        // Handle the message inside the webview
        window.addEventListener('message', event => {
          const message = event.data.message; // The JSON data our extension sent
          console.log('command:' + message.command + ' repositoryPath:' + message.repositoryPath);
          vscode.postMessage({ command: message.command, repositoryPath: message.repositoryPath, refresh: true });
        });
        document.getElementById('repoOpen').addEventListener('click', () => {
          // When the button is clicked, call the extension method to perform the task
          vscode.postMessage({ command: 'repoOpen', repositoryUrl: '${
            details.repositoryUrl
          }' });
        });
        document.getElementById('repoAdd').addEventListener('click', () => {
          // When the button is clicked, call the extension method to perform the task
          vscode.postMessage({ command: 'repoAdd', repositoryPath: '${details.repositoryPath?.replace(
            /\\/g,
            "\\\\"
          )}', refresh: true });
        });
        document.getElementById('repoPrune').addEventListener('click', () => {
          // When the button is clicked, call the extension method to perform the task
          vscode.postMessage({ command: 'repoPrune', repositoryPath: '${details.repositoryPath?.replace(
            /\\/g,
            "\\\\"
          )}'});
        });
        document.getElementById('repoPush').addEventListener('click', () => {
          // When the button is clicked, call the extension method to perform the task
          vscode.postMessage({ command: 'repoPush', repositoryPath: '${details.repositoryPath?.replace(
            /\\/g,
            "\\\\"
          )}', refresh: true });
        });
        document.getElementById('repoFetch').addEventListener('click', () => {
          // When the button is clicked, call the extension method to perform the task
          vscode.postMessage({ command: 'repoFetch', repositoryPath: '${details.repositoryPath?.replace(
            /\\/g,
            "\\\\"
          )}', refresh: true });
        });
         document.getElementById('repoLoadMore').addEventListener('click', () => {
          // When the button is clicked, call the extension method to perform the task
          vscode.postMessage({ command: 'repoLoadMore', repositoryPath: '${details.repositoryPath?.replace(
            /\\/g,
            "\\\\"
          )}', refresh: true });
        });
         document.getElementById('repoClearCache').addEventListener('click', () => {
          // When the button is clicked, call the extension method to perform the task
          vscode.postMessage({ command: 'repoClearCache', repositoryPath: '${details.repositoryPath?.replace(
            /\\/g,
            "\\\\"
          )}', refresh: true });
        });
        ${details.commitDetails
          .map(
            (commit) => `
        if (document.getElementById('open-${commit.commitHash}')) {
          document.getElementById('open-${
            commit.commitHash
          }').addEventListener('click', () => {
            vscode.postMessage({ command: 'commitOpen', commitUrl: '${
              details.repositoryUrl
            }', commitHash: '${commit.commitHash}' });
          });
        }
        if (document.getElementById('append-${commit.commitHash}')) {
          document.getElementById('append-${
            commit.commitHash
          }').addEventListener('click', () => {
            vscode.postMessage({ command: 'commitAppend', commitHash: '${
              commit.commitHash
            }', repositoryPath: '${details.repositoryPath?.replace(
              /\\/g,
              "\\\\"
            )}', refresh: true });
          });
        }
        if (document.getElementById('edit-${commit.commitHash}')) {
          document.getElementById('edit-${
            commit.commitHash
          }').addEventListener('click', () => {
            vscode.postMessage({ command: 'commitEdit', commitHash: '${
              commit.commitHash
            }', repositoryPath: '${details.repositoryPath?.replace(
              /\\/g,
              "\\\\"
            )}', refresh: true });
          });
        }
        if (document.getElementById('remove-${commit.commitHash}')) {
          document.getElementById('remove-${
            commit.commitHash
          }').addEventListener('click', () => {
            vscode.postMessage({ command: 'commitRemove', commitHash: '${
              commit.commitHash
            }', repositoryPath: '${details.repositoryPath?.replace(
              /\\/g,
              "\\\\"
            )}', refresh: true });
          });
        }
        if (document.getElementById('load-${commit.commitHash}')) {
          document.getElementById('load-${
            commit.commitHash
          }').addEventListener('click', () => {
            vscode.postMessage({ command: 'commitLoad', commitHash: '${
              commit.commitHash
            }', repositoryPath: '${details.repositoryPath?.replace(
              /\\/g,
              "\\\\"
            )}', refresh: true });
          });
        }
        `
          )
          .join("\n")}
      `
        )
        .join("\n");
      const endScript: string = `
        };
        // Wait for the DOM to be fully loaded before initializing the Webview
        document.addEventListener('DOMContentLoaded', initWebview);
      `;
      // Combine all scripts into one string
      const combinedScript: string =
        vscodeScript + eventListenersScript + endScript;

      const repositoryInfo = filteredRepositoryDetails
        .map(
          (details) => `
        <div>
          <header>
          <p><h3 style="color:${headingColor};background-color: ${headingBgColor};">Repository Path: ${
            details.repositoryPath
          }</h3></p>
          <p><h4 style="color:${headingColor};background-color:${headingBgColor};">Notes Found: ${
            details.commitDetails.length
          }</h4></p>
          <p><button id="repoOpen">Open Repo</button>
          <button id="repoAdd">Add Note</button>
          <button id="repoPrune">Prune Notes</button>
          <button id="repoPush">Push Notes</button>
          <button id="repoFetch">Fetch Notes</button>
          <button id="repoLoadMore">Load More (${
            this.settings.gitNotesLoadLimit
          })</button>
          <button id="repoClearCache">Refresh</button></p>
        </header>
        </div>
        ${details.commitDetails
          .map(
            (commit) => `
          <hr>
          <div class="content">
          <p style="color:${commitHashColor};background-color:${commitHashBgColor};"><b>Commit Hash: </b>${
              commit.commitHash
            }</p>
          <p style="color:${noteHashColor};background-color:${noteHashBgColor};"><b>Note Hash: </b>${
              commit.noteHash
            }</p>
          <p><button id="open-${commit.commitHash}">Open Commit</button>
          <button id="append-${commit.commitHash}" style="display: ${
              commit.note ? "inline-block" : "none"
            }">Append</button>
          <button id="edit-${commit.commitHash}" style="display: ${
              commit.note ? "inline-block" : "none"
            }">Edit</button>
          <button id="remove-${commit.commitHash}">Remove</button>
          <button id="load-${commit.commitHash}" style="display: ${
              commit.note ? "none" : "inline-block"
            }">Load Details</button></p>
          <p><b>Date: </b>${commit.date}</p>
          </div>
          <div class="contentDetails" id="contentDetails-${
            commit.commitHash
          }" style="display: ${commit.note ? "inline-block" : "none"}">
          <p><strong>Author:</strong> ${commit.author}</p>
          <!-- <p><strong>Date:</strong> ${commit.date}</p> -->
          <p><strong>Commit Message:</strong> ${commit.message}</p>
          <p><strong>Note:</strong><pre>${commit.note}</pre></p>
          ${
            commit.fileChanges.length > 0
              ? "<p><strong>File Changes:</strong></p>"
              : "<p><strong>No File Changes</strong></p>"
          }
          <ul>
            ${commit.fileChanges
              .map((fileChange) => {
                const insertionsColor = "green";
                const deletionsColor = "red";
                const addedColor = "blue";
                const deletedColor = "red";
                const renamedColor = "yellow";

                const insertionsStatus = fileChange.insertions
                  ? `<span style="color: ${insertionsColor}">(+${fileChange.insertions})</span>`
                  : "";
                const deletionsStatus = fileChange.deletions
                  ? `<span style="color: ${deletionsColor}">(-${fileChange.deletions})</span>`
                  : "";
                const addedStatus = fileChange.added
                  ? `<span style="color: ${addedColor}">(Added)</span>`
                  : "";
                const deletedStatus = fileChange.deleted
                  ? `<span style="color: ${deletedColor}">(Deleted)</span>`
                  : "";
                const renamedStatus = fileChange.renamed
                  ? `<span style="color: ${renamedColor}">(Renamed)</span>`
                  : "";

                return `<li style="color: ${color}">${fileChange.file} ${insertionsStatus} ${deletionsStatus} ${addedStatus} ${deletedStatus} ${renamedStatus}</li>`;
              })
              .join("")}
          </ul>
          </div>
        `
          )
          .join("")}
      `
        )
        .join("");
      return `
        <html>
          <body>
            <head>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                }
                header {
                  background-color: ${headingBgColor};
                  padding: 10px;
                  position: fixed;
                  top: 0;
                  left: 10;
                  right: 10;
                  width: 100%;
                }
                /* Optional styles for the content to create space below the fixed header */
                .content {
                  style: ${color};
                  margin-top: 50px;
                  margin-bottom: 0px;
                  padding: 20px;
                  padding-bottom: 0px;
                }
                .contentDetails {
                  style: ${color};
                  margin-top: 0px;
                  padding: 20px;
                  padding-top: 0px;
                  padding-bottom: 0px;
                }
                .hidden {
                  display: none;
                }
              </style>
              <script>
                ${combinedScript}
              </script>
            </head>
            <h1>Git Notes</h1>
            ${repositoryInfo}
          </body>
        </html>
      `;
    } else {
      return "No Git notes ref found";
    }
  }
}
