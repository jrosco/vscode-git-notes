import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import {
  Git,
  AddNote,
  AddNoteParameters,
  AppendNote,
  AppendNoteParameters,
  EditNote,
  EditNoteParameters,
  GitUtils,
  RemoveNote,
  RemoveNoteParameters
} from "./git/exports";
import { CacheManager} from "./manager/exports";
import { EditWindow } from './ui/edit';
import { GitCommands } from './git/cmd';
import { GitNotesPanel } from './ui/webview';
import { GitNotesSettings } from './settings';
import { GitNotesStatusBar } from './ui/status';
import { LoggerService } from './log/service';
import { NotesInput } from './ui/input';
import { RepositoryManager } from './interface';

const git = new Git();
const add = new AddNote();
const edit = new EditNote();
const remove = new RemoveNote();
const append = new AppendNote();
const gitUtils = new GitUtils();
const cache = CacheManager.getInstance();
const notes = new GitCommands();
const manager = RepositoryManager.getInstance();
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
        git.repositoryPath = cache.getGitRepositoryPath(
          editor.document.uri
        );
        await cache
          .load(git.repositoryPath)
          .then(() => {})
          .catch((error) => {
            logger.error(error);
          });
      }
    }
  });

  // Register the command for manual Git notes check. Can take optional parameter `cmdRepositoryPath`
  let gitCheckNotesDisposable = vscode.commands.registerCommand(
    "extension.checkGitNotes",
    async (cmdRepositoryPath?, cmdClearRepoCache?: boolean) => {
      logger.info("extension.checkGitNotes command called");
      const activeEditor = vscode.window.activeTextEditor;
      git.repositoryPath = cmdRepositoryPath
        ? cmdRepositoryPath
        : cache.getGitRepositoryPath(activeEditor?.document.uri);
      if (git.repositoryPath !== undefined) {
        cmdClearRepoCache
          ? await cache.clearRepositoryDetails(undefined, git.repositoryPath)
          : false;
        await cache
          .load(git.repositoryPath)
          .then(() => {})
          .catch((error) => {
            logger.error(error);
          });
      } else if (activeEditor) {
        const repositoryPath = cache.getGitRepositoryPath(
          activeEditor.document.uri
        );
        cmdClearRepoCache
          ? await cache.clearRepositoryDetails(activeEditor.document.uri)
          : false;
        await cache
          .load(repositoryPath)
          .then(() => {})
          .catch((error) => {
            logger.error(error);
          });
      }
    }
  );

  // Register the command for manual Fetch notes. Can take optional parameter `cmdRepositoryPath`
  let gitFetchNoteRefDisposable = vscode.commands.registerCommand("extension.fetchGitNotes",
    async (cmdRepositoryPath?) => {
      logger.info("extension.fetchGitNotes command called");
      const activeEditor = vscode.window.activeTextEditor;
      notes.repositoryPath = cmdRepositoryPath ? cmdRepositoryPath: notes.repositoryPath;
      if (notes.repositoryPath !== undefined) {
        await notes.fetchGitNotes(undefined,notes.repositoryPath);
       } else if (activeEditor) {
        await notes.fetchGitNotes(activeEditor.document.uri);
      }
    }
  );

  // Register the command for manual Push notes. Can take optional parameter `cmdRepositoryPath`
  let gitPushNoteRefDisposable = vscode.commands.registerCommand("extension.pushGitNotes",
    async (cmdRepositoryPath?) => {
      logger.info("extension.pushGitNotes command called");
      const activeEditor = vscode.window.activeTextEditor;
      notes.repositoryPath = cmdRepositoryPath ? cmdRepositoryPath: notes.repositoryPath;
      if (notes.repositoryPath !== undefined) {
        await notes.pushGitNotes(undefined,notes.repositoryPath);
       } else if (activeEditor) {
        await notes.pushGitNotes(activeEditor.document.uri);
      }
    }
  );

  // Register the command handler for the status bar item onclick event
  let runWebviewDisposable = vscode.commands.registerCommand(
    "extension.runWebview",
    async () => {
      logger.info("extension.runWebview command called");
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor !== undefined) {
        git.repositoryPath = cache.getGitRepositoryPath(activeEditor.document.uri);
        await cache.load(git.repositoryPath, settings.gitNotesLoadLimit).then((repositoryDetails) => {
          GitNotesPanel.createOrShow(activeEditor.document.uri, repositoryDetails);
        }).catch((error) => {
          logger.error(error);
        });
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
        if (commitHash !== undefined) {
          await remove.command(removeParameter);
        }
      }
    }
  );

  // Register the command for pruning git notes from stale commits.
  // Can take optional parameter `cmdRepositoryPath`
  let pruneGitNotesDisposable = vscode.commands.registerCommand(
    'extension.pruneGitNotes',
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
        commitHash: '',
        prune: true,
      };
      if (removeParameter.repositoryPath) {
        await remove.command(removeParameter);
      }
    }
  );

  // Register the command for adding git notes.
  let addGitNotesDisposable = vscode.commands.registerCommand(
    "extension.addGitNotes",
    async (cmdRepositoryPath?, cmdCommitHash?) => {
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
        const commitHash = commitHashInput
          ? commitHashInput.replace(/\s/g, "")
          : await gitUtils.getLatestCommit(undefined, activeFileRepoPath);
        if (commitHashInput === false) {
          return;
        }
        const editWindow = new EditWindow(commitHash);
        await editWindow.showEditWindow().then(async (message) => {
          const addParameter: AddNoteParameters = {
            repositoryPath: activeFileRepoPath,
            commitHash: commitHash,
            message: message,
          };
          addParameter.message !== '' ? await add
            .command(addParameter)
            .then(() => {
              refreshWebView(addParameter.repositoryPath);
            })
            .catch((error) => {
              statusBar.showErrorMessage(
                `Git Notes: An error occurred while adding Git note: ${error}`
              );
            }): false;
        });
      }
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
        await cache.loadNoteDetails(activeFileRepoPath, commitHash).then(() => {
          existingNote = cache.getGitNoteMessage(
            cache.getExistingRepositoryDetails(activeFileRepoPath),
            commitHash
          );
        }).catch((error) => {
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
                  refreshWebView(editParameter.repositoryPath);
                })
                .catch((error) => {
                  statusBar.showErrorMessage(
                    `Git Notes: An error occurred while editing Git note: ${error}`
                  );
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
      if (activeFileRepoPath !== undefined) {
        cmdCommitHash
          ? undefined
          : input.setup(
              "Append a Git Note",
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
        const editWindow = new EditWindow(commitHash);
        await editWindow.showEditWindow().then(async (message) => {
          const appendParameter: AppendNoteParameters = {
            repositoryPath: activeFileRepoPath,
            commitHash: commitHash,
            message: message,
          };
          await append
            .command(appendParameter)
            .then(() => {
              refreshWebView(appendParameter.repositoryPath);
            })
            .catch((error) => {
              statusBar.showErrorMessage(
                `Git Notes: An error occurred while appending Git note: ${error}`
              );
            });
        });
      }
    }
  );

  context.subscriptions.push(gitCheckNotesDisposable,
    gitFetchNoteRefDisposable,
    gitPushNoteRefDisposable,
    runWebviewDisposable,
    removeGitNoteDisposable,
    pruneGitNotesDisposable,
    addGitNotesDisposable,
    editGitNotesDisposable,
    appendGitNotesDisposable,
  );

  // Refresh the webview after a git note has been updated
  function refreshWebView(repositoryPath: string) {
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
