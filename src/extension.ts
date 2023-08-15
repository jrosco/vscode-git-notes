import * as vscode from "vscode";

import {
  Git,
  AddNote,
  AddNoteParameters,
  AppendNote,
  AppendNoteParameters,
  EditNote,
  EditNoteParameters,
  FetchNotes,
  FetchNotesParameters,
  PushNotes,
  PushNotesParameters,
  GitUtils,
  RemoveNote,
  RemoveNoteParameters,
} from "./git/exports";
import { CacheManager } from "./manager/exports";
import { EditWindow } from "./ui/edit";
import { GitNotesPanel } from "./ui/webview";
import { GitNotesSettings } from "./settings";
import { GitNotesStatusBar } from "./ui/status";
import { LoggerService } from "./log/service";
import { NotesInput } from "./ui/input";

const git = new Git();
const add = new AddNote();
const edit = new EditNote();
const remove = new RemoveNote();
const append = new AppendNote();
const fetch = new FetchNotes();
const push = new PushNotes();
const gitUtils = new GitUtils();
const cache = CacheManager.getInstance();
const input = NotesInput.getInstance();
const settings = new GitNotesSettings();
const logger = LoggerService.getInstance(settings.logLevel);
const statusBar = GitNotesStatusBar.getInstance();

const tempFileSuffixPath = settings.tempFileSuffixPath;

export function activate(context: vscode.ExtensionContext) {
  logger.info("Your extension 'git-notes' has been activated.");

  // Get the URIs of open files when Visual Studio Code first opens
  // Iterate through the currently open files
  vscode.workspace.textDocuments.forEach(
    async (document: vscode.TextDocument) => {
      if (document.uri.scheme === "file") {
        git.repositoryPath = cache.getGitRepositoryPath(document.uri);
        if (settings.autoCheck) {
          await cache
            .load(git.repositoryPath)
            .then(() => {})
            .catch((error) => {
              logger.error(error);
            });
        }
      }
    }
  );

  // Register the event listener for file open event
  vscode.workspace.onDidOpenTextDocument(
    async (document: vscode.TextDocument) => {
      if (document.uri.scheme === "file") {
        // If `autoCheck` is enabled and the file is not a Git Notes temp edit file
        if (
          settings.autoCheck &&
          !document.uri.path.endsWith(tempFileSuffixPath)
        ) {
          git.repositoryPath = cache.getGitRepositoryPath(document.uri);
          await cache
            .load(git.repositoryPath)
            .then(() => {})
            .catch((error) => {
              logger.error(error);
            });
        }
      }
    }
  );

  // Register the event listener for switching between file tabs
  vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (editor && editor.document.uri.scheme) {
      // If `autoCheck` is enabled and the file is not a Git Notes temp edit file
      if (
        settings.autoCheck &&
        !editor.document.uri.path.endsWith(tempFileSuffixPath)
      ) {
        git.repositoryPath = cache.getGitRepositoryPath(editor.document.uri);
        await cache
          .load(git.repositoryPath)
          .then(() => {})
          .catch((error) => {
            logger.error(error);
          });
      }
    }
  });

  // Register the command handler for the status bar item onclick event
  let runWebviewDisposable = vscode.commands.registerCommand(
    "extension.runWebview",
    async () => {
      logger.info("extension.runWebview command called");
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor !== undefined) {
        const repositoryPath = cache.getGitRepositoryPath(
          activeEditor.document.uri
        );
        await cache
          .load(repositoryPath)
          .then((repositoryDetails) => {
            GitNotesPanel.createOrShow(
              activeEditor.document.uri,
              repositoryDetails
            );
          })
          .catch((error) => {
            logger.error(error);
          });
      }
    }
  );

  // Register the command for manual Git notes check. Can take optional parameter `cmdRepositoryPath`
  let gitCheckNotesDisposable = vscode.commands.registerCommand(
    "extension.checkGitNotes",
    async (cmdRepositoryPath?) => {
      logger.info("extension.checkGitNotes command called");
      const activeEditor = vscode.window.activeTextEditor;
      const repositoryPath = cmdRepositoryPath
        ? cmdRepositoryPath
        : cache.getGitRepositoryPath(activeEditor?.document.uri);
      if (repositoryPath !== undefined) {
        await cache
          .clearRepositoryDetails(undefined, repositoryPath)
          .then(async () => {
            await cache
              .load(repositoryPath)
              .then(() => {})
              .catch((error) => {
                logger.error(error);
              });
          })
          .finally(() => {
            statusBar.notesCount =
              cache.getExistingRepositoryDetails(repositoryPath)?.length || 0;
            statusBar.update();
            refreshWebView(repositoryPath);
          });
      }
    }
  );

  // Register the command for manual Fetch notes. Can take optional parameter
  // `cmdRepositoryPath` and `force` to force the fetch
  let gitFetchNoteRefDisposable = vscode.commands.registerCommand(
    "extension.fetchGitNotes",
    async (cmdRepositoryPath?, force?) => {
      logger.info("extension.fetchGitNotes command called");
      const activeEditor = vscode.window.activeTextEditor;
      const repositoryPath = cmdRepositoryPath
        ? cmdRepositoryPath
        : git.repositoryPath;
      const fetchParameter: FetchNotesParameters = {
        repositoryPath: repositoryPath
          ? repositoryPath
          : activeEditor?.document.uri,
        force: force ? force : false,
      };
      if (fetchParameter.repositoryPath !== undefined) {
        statusBar.message = "Fetching ...";
        statusBar.update();
        let confirm;
        const title = fetchParameter.force
          ? "Confirm Fetch Force"
          : "Fetch Notes";
        if (settings.confirmPushAndFetchCommands) {
          const messageItem: vscode.MessageItem[] = [
            { title: title },
            { title: "Cancel" },
          ];
          confirm = await input.showInputWindowMessage(
            `Directory: ${repositoryPath}`,
            messageItem,
            true,
            false
          );
        }
        if (confirm?.title === title || !settings.confirmPushAndFetchCommands) {
          await fetch
            .command(fetchParameter)
            .then(() => {
              statusBar.showInformationMessage("Git Notes: Fetched");
            })
            .catch(async () => {
              const messageItem: vscode.MessageItem[] = [
                { title: "Push notes" },
                { title: "Force fetch" },
                { title: "Cancel" },
              ];
              const selected = await input.showInputWindowMessage(
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
              statusBar.notesCount =
                cache.getExistingRepositoryDetails(repositoryPath)?.length || 0;
              statusBar.update();
              refreshWebView(fetchParameter.repositoryPath);
            });
        }
      }
    }
  );

  // Register the command for manual Push notes. Can take optional parameter
  // `cmdRepositoryPath` and `force` to force the push
  let gitPushNoteRefDisposable = vscode.commands.registerCommand(
    "extension.pushGitNotes",
    async (cmdRepositoryPath?, force?) => {
      logger.info("extension.pushGitNotes command called");
      statusBar.reset();
      const activeEditor = vscode.window.activeTextEditor;
      const repositoryPath = cmdRepositoryPath
        ? cmdRepositoryPath
        : git.repositoryPath;
      const pushParameter: PushNotesParameters = {
        repositoryPath: repositoryPath
          ? repositoryPath
          : activeEditor?.document.uri,
        force: force ? force : false,
      };
      if (pushParameter.repositoryPath !== undefined) {
        statusBar.message = "Pushing ...";
        statusBar.update();
        let confirm;
        const title = pushParameter.force ? "Confirm Push Force" : "Push Notes";
        if (settings.confirmPushAndFetchCommands) {
          const messageItem: vscode.MessageItem[] = [
            { title: title },
            { title: "Cancel" },
          ];
          confirm = await input.showInputWindowMessage(
            `Directory: ${repositoryPath}`,
            messageItem,
            true,
            false
          );
        }
        if (confirm?.title === title || !settings.confirmPushAndFetchCommands) {
          await push
            .command(pushParameter)
            .then(() => {
              statusBar.showInformationMessage("Git Notes: Pushed");
            })
            .catch(async () => {
              const messageItem: vscode.MessageItem[] = [
                { title: "Fetch notes" },
                { title: "Force push" },
                { title: "Cancel" },
              ];
              const selected = await input.showInputWindowMessage(
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
              statusBar.notesCount =
                cache.getExistingRepositoryDetails(repositoryPath)?.length || 0;
              statusBar.update();
              refreshWebView(pushParameter.repositoryPath);
            });
        }
      }
    }
  );

  // Register the command for removing git notes on commits.
  // Can take optional parameters `cmdCommitHash` and `cmdRepositoryPath`
  // passing these to the function will bypass the input prompt and use the
  // passed values instead.
  let removeGitNoteDisposable = vscode.commands.registerCommand(
    "extension.removeGitNote",
    async (cmdCommitHash?, cmdRepositoryPath?) => {
      logger.info("extension.removeGitNote command called");
      const activeEditor = vscode.window.activeTextEditor;
      const repositoryPath = cmdRepositoryPath
        ? cmdRepositoryPath
        : git.repositoryPath;
      if (activeEditor !== undefined || repositoryPath !== undefined) {
        cmdCommitHash
          ? undefined
          : input.setup(
              "Remove a Git Note",
              "Enter the Commit hash of the note to remove....",
              false
            );
        const commitHashInput = cmdCommitHash
          ? cmdCommitHash
          : await input.showInputBox();
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
          if (settings.confirmRemovalCommands) {
            confirm = await input.showInputWindowMessage(
              `Note Commit Removal: ${commitHash}`,
              messageItem,
              true,
              false
            );
          }
          if (confirm?.title === title || !settings.confirmRemovalCommands) {
            await remove
              .command(removeParameter)
              .then(() => {
                statusBar.showInformationMessage(
                  `Git Notes: Removed note for commit ${commitHash} \nPath: ${repositoryPath}`
                );
              })
              .finally(() => {
                statusBar.notesCount =
                  cache.getExistingRepositoryDetails(
                    removeParameter.repositoryPath
                  )?.length || 0;
                statusBar.update();
                refreshWebView(removeParameter.repositoryPath);
              });
          }
        }
      }
    }
  );

  // Register the command for pruning git notes from stale commits.
  // Can take optional parameter `cmdRepositoryPath`
  let pruneGitNotesDisposable = vscode.commands.registerCommand(
    "extension.pruneGitNotes",
    async (cmdRepositoryPath?) => {
      logger.info("extension.pruneGitNotes command called");
      const repositoryPath = cmdRepositoryPath
        ? cmdRepositoryPath
        : git.repositoryPath;
      const activeEditor = vscode.window.activeTextEditor;
      const removeParameter: RemoveNoteParameters = {
        repositoryPath: repositoryPath
          ? repositoryPath
          : activeEditor?.document.uri,
        commitHash: "",
        prune: true,
      };
      if (removeParameter.repositoryPath) {
        let confirm = undefined;
        const title = "Confirm Prune";
        if (settings.confirmPruneCommands) {
          const messageItem: vscode.MessageItem[] = [
            { title: "Confirm Prune" },
            { title: "Cancel" },
          ];
          confirm = await input.showInputWindowMessage(
            `Prune Directory ${repositoryPath}`,
            messageItem,
            true,
            false
          );
        }
        if (confirm?.title === title || !settings.confirmPushAndFetchCommands) {
          await remove
            .command(removeParameter)
            .then(() => {})
            .finally(() => {
              statusBar.showInformationMessage(`Git Notes: Pruned notes`);
              statusBar.notesCount =
                cache.getExistingRepositoryDetails(
                  removeParameter.repositoryPath
                )?.length || 0;
              statusBar.update();
              refreshWebView(removeParameter.repositoryPath);
            });
        }
      }
    }
  );

  // Register the command for adding git notes.
  let addGitNotesDisposable = vscode.commands.registerCommand(
    "extension.addGitNotes",
    async (cmdRepositoryPath?, cmdCommitHash?, force?) => {
      logger.info("extension.addGitNotes command called");
      const activeFileRepoPath = cmdRepositoryPath
        ? cmdRepositoryPath
        : git.repositoryPath;
      if (activeFileRepoPath !== undefined) {
        cmdCommitHash
          ? undefined
          : input.setup(
              "Add a Git Note",
              "Enter the Commit hash or leave blank to apply to last commit ....",
              false
            );
        const commitHashInput = cmdCommitHash
          ? cmdCommitHash
          : await input.showInputBox();
        statusBar.message = "Adding Message ...";
        statusBar.update();
        const commitHash = commitHashInput
          ? commitHashInput.replace(/\s/g, "")
          : await gitUtils.getLatestCommit(undefined, activeFileRepoPath);
        if (commitHashInput === false) {
          return;
        }
        const check = cache.getExistingCommitDetails(
          activeFileRepoPath,
          commitHash
        );
        if (check?.commitHash && !force) {
          const messageItem: vscode.MessageItem[] = [
            { title: "Append" },
            { title: "Edit" },
            { title: "Overwrite" },
            { title: "Cancel" },
          ];
          const selected = await input.showInputWindowMessage(
            "Git Note Already Exists",
            messageItem,
            true,
            false
          );
          if (selected?.title === "Append") {
            await vscode.commands.executeCommand(
              "extension.appendGitNotes",
              activeFileRepoPath,
              commitHash
            );
          } else if (selected?.title === "Overwrite") {
            await vscode.commands.executeCommand(
              "extension.addGitNotes",
              activeFileRepoPath,
              commitHash,
              true
            );
          } else if (selected?.title === "Edit") {
            await vscode.commands.executeCommand(
              "extension.editGitNotes",
              activeFileRepoPath,
              commitHash
            );
          }
        } else {
          const editWindow = new EditWindow(commitHash);
          await editWindow.showEditWindow().then(async (message) => {
            const addParameter: AddNoteParameters = {
              repositoryPath: activeFileRepoPath,
              commitHash: commitHash,
              message: message,
              force: force ? force : false,
            };
            addParameter.message !== ""
              ? await add
                  .command(addParameter)
                  .then(() => {
                    statusBar.showInformationMessage(
                      `Git Notes: Added note for commit ${commitHash} \nPath: ${activeFileRepoPath}`
                    );
                  })
                  .finally(() => {
                    refreshWebView(addParameter.repositoryPath);
                  })
              : false;
          });
        }
      }
      statusBar.notesCount =
        cache.getExistingRepositoryDetails(activeFileRepoPath)?.length || 0;
      statusBar.update();
    }
  );

  // Register the command for editing git notes.
  let editGitNotesDisposable = vscode.commands.registerCommand(
    "extension.editGitNotes",
    async (cmdRepositoryPath?, cmdCommitHash?) => {
      logger.info("extension.editGitNotes command called");
      const activeFileRepoPath = cmdRepositoryPath
        ? cmdRepositoryPath
        : git.repositoryPath;
      if (activeFileRepoPath !== undefined) {
        cmdCommitHash
          ? undefined
          : input.setup(
              "Edit a Git Note",
              "Enter the Commit hash or leave blank to apply to last commit ....",
              false
            );
        const commitHashInput = cmdCommitHash
          ? cmdCommitHash
          : await input.showInputBox();
        const commitHash = commitHashInput
          ? commitHashInput.replace(/\s/g, "")
          : await gitUtils.getLatestCommit(undefined, activeFileRepoPath);
        if (commitHashInput === false) {
          return;
        }
        let existingNote;
        // load details and wait before checking for existing notes
        await cache
          .loadNoteDetails(activeFileRepoPath, commitHash)
          .then(() => {
            existingNote = cache.getGitNoteMessage(
              cache.getExistingRepositoryDetails(activeFileRepoPath),
              commitHash
            );
          })
          .catch((error) => {
            logger.error(`loading details error: ${error}`);
          });
        const editWindow = new EditWindow(commitHash, existingNote);
        await editWindow.showEditWindow().then(async (message) => {
          const editParameter: EditNoteParameters = {
            repositoryPath: activeFileRepoPath,
            commitHash: commitHash,
            message: message,
          };
          editParameter.message !== ""
            ? await edit
                .command(editParameter)
                .then(() => {
                  statusBar.showInformationMessage(
                    `Git Notes: Edited note for commit ${commitHash} \nPath: ${activeFileRepoPath}`
                  );
                })
                .catch((error) => {
                  statusBar.showErrorMessage(
                    `Git Notes: An error occurred while editing Git note: ${error}`
                  );
                })
                .finally(() => {
                  statusBar.notesCount =
                    cache.getExistingRepositoryDetails(
                      editParameter.repositoryPath
                    )?.length || 0;
                  statusBar.update();
                  refreshWebView(editParameter.repositoryPath);
                })
            : false;
        });
      }
    }
  );

  // Register the command for appending git notes.
  let appendGitNotesDisposable = vscode.commands.registerCommand(
    "extension.appendGitNotes",
    async (cmdRepositoryPath?, cmdCommitHash?) => {
      logger.info("extension.appendGitNotes command called");
      const activeFileRepoPath = cmdRepositoryPath
        ? cmdRepositoryPath
        : git.repositoryPath;
      let commitHash = "";
      let inputCommitHash;
      if (cmdCommitHash === undefined) {
        input.setup(
          "Append a Git Note",
          "Enter the Commit hash or leave blank to apply to last commit ....",
          false
        );
        inputCommitHash =
          (await input.showInputBox()) ||
          (await gitUtils.getLatestCommit(undefined, activeFileRepoPath));
      }
      if (activeFileRepoPath !== undefined) {
        commitHash = cmdCommitHash ? cmdCommitHash : inputCommitHash;
        if (!commitHash) {
          return;
        }
        commitHash = commitHash.replace(/\s/g, "");
        const editWindow = new EditWindow(commitHash);
        await editWindow.showEditWindow().then(async (message) => {
          const appendParameter: AppendNoteParameters = {
            repositoryPath: activeFileRepoPath,
            commitHash: commitHash,
            message: message,
          };
          appendParameter.message !== ""
            ? await append
                .command(appendParameter)
                .then(() => {
                  statusBar.showInformationMessage(
                    `Git Notes: Appended note for commit ${commitHash} \nPath: ${activeFileRepoPath}`
                  );
                })
                .catch((error) => {
                  statusBar.showErrorMessage(
                    `Git Notes: An error occurred while appending Git note: ${error}`
                  );
                })
                .finally(() => {
                  statusBar.notesCount =
                    cache.getExistingRepositoryDetails(
                      appendParameter.repositoryPath
                    )?.length || 0;
                  statusBar.update();
                  refreshWebView(appendParameter.repositoryPath);
                })
            : false;
        });
      }
    }
  );

  context.subscriptions.push(
    gitCheckNotesDisposable,
    gitFetchNoteRefDisposable,
    gitPushNoteRefDisposable,
    runWebviewDisposable,
    removeGitNoteDisposable,
    pruneGitNotesDisposable,
    addGitNotesDisposable,
    editGitNotesDisposable,
    appendGitNotesDisposable
  );

  // Refresh the webview after a git note has been updated
  function refreshWebView(repositoryPath: string) {
    logger.debug(`refreshWebView called [repositoryPath:${repositoryPath}]`);
    if (GitNotesPanel.currentPanel) {
      logger.debug(
        `Sending [refresh] command [repositoryPath:${repositoryPath}] to webview`
      );
      GitNotesPanel.currentPanel.postMessage({
        command: "refresh",
        repositoryPath: repositoryPath,
      });
    }
  }
}

export function deactivate() {
  logger.info("Your extension 'git-notes' has been deactivated.");
}
