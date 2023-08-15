import * as vscode from "vscode";

import { Git } from "./git/exports";
import { CacheManager } from "./manager/exports";
import { GitNotesSettings } from "./settings";
import { LoggerService } from "./log/service";
import {
  DisposableAdd,
  DisposableAppend,
  DisposableCheck,
  DisposableEdit,
  DisposableFetch,
  DisposablePrune,
  DisposablePush,
  DisposableRemove,
  DisposableWebView,
} from "./extension/exports";

const git = new Git();
const cache = CacheManager.getInstance();
const settings = new GitNotesSettings();
const logger = LoggerService.getInstance(settings.logLevel);
const disposableAdd = new DisposableAdd();
const disposableAppend = new DisposableAppend();
const disposableEdit = new DisposableEdit();
const disposableWebView = new DisposableWebView();
const disposableCheck = new DisposableCheck();
const disposableFetch = new DisposableFetch();
const disposablePush = new DisposablePush();
const disposableRemove = new DisposableRemove();
const disposablePrune = new DisposablePrune();

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

  // This section of code retrieves a disposable object and ensures that it's 
  // properly managed by VSCode's subscription system. Disposing of resources
  // when they are no longer needed helps prevent memory leaks and ensures a 
  // clean extension shutdown.
  const runWebviewDisposable = disposableWebView.disposable();
  runWebviewDisposable.then((disposable) => {
    context.subscriptions.push(disposable);
  });

  // Manage Disposable for Git Check Notes Feature
  const gitCheckNotesDisposable = disposableCheck.disposable();
  gitCheckNotesDisposable.then((disposable) => {
    context.subscriptions.push(disposable);
  });

  // Manage Disposable for Git Fetch Notes Feature
  const gitFetchNoteRefDisposable = disposableFetch.disposable();
  gitFetchNoteRefDisposable.then((disposable) => {
    context.subscriptions.push(disposable);
  });

  // Manage Disposable for Git Push Notes Feature
  const gitPushNoteRefDisposable = disposablePush.disposable();
  gitPushNoteRefDisposable.then((disposable) => {
    context.subscriptions.push(disposable);
  });

  // Manage Disposable for Git Remove Notes Feature
  const removeGitNoteDisposable = disposableRemove.disposable();
  removeGitNoteDisposable.then((disposable) => {
    context.subscriptions.push(disposable);
  });

  // Manage Disposable for Git Prune Notes Feature
  const pruneGitNotesDisposable = disposablePrune.disposable();
  pruneGitNotesDisposable.then((disposable) => {
    context.subscriptions.push(disposable);
  });

  // Manage Disposable for Git Add Notes Feature
  const addGitNotesDisposable = disposableAdd.disposable();
  addGitNotesDisposable.then((disposable) => {
    context.subscriptions.push(disposable);
  });

  // Manage Disposable for Git Edit Notes Feature
  const editGitNotesDisposable = disposableEdit.disposable();
  editGitNotesDisposable.then((disposable) => {
    context.subscriptions.push(disposable);
  });

  // Manage Disposable for Git Append Notes Feature
  const appendGitNotesDisposable = disposableAppend.disposable();
  appendGitNotesDisposable.then((disposable) => {
    context.subscriptions.push(disposable);
  });
}

export function deactivate() {
  logger.info("Your extension 'git-notes' has been deactivated.");
}
