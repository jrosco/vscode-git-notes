import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { GitNotesPanel } from './ui/webview';
import { NotesInput } from './ui/input';

import { GitCommands } from './git/cmd';
import { RepositoryManager } from './interface';
import { LoggerService, LogLevel } from './log/service';
import { GitNotesSettings } from './settings';

const notes = new GitCommands();
const manager = RepositoryManager.getInstance();
const input = NotesInput.getInstance();
const settings = new GitNotesSettings();
const logger = LoggerService.getInstance(settings.logLevel);

export function activate(context: vscode.ExtensionContext) {
  logger.info("Your extension 'git-notes' has been activated.");

  // Get the URIs of open files when Visual Studio Code first opens
  // Iterate through the currently open files
  vscode.workspace.textDocuments.forEach(async (document: vscode.TextDocument) => {
    if (document.uri.scheme === "file") {
      notes.repositoryPath = manager.getGitRepositoryPath(document.uri);
      if (settings.autoCheck) {
        await notes.loader(notes.repositoryPath).then(() => {}).catch((error) => {
          logger.error(error);
        });
      }
    }
  });

  // Register the event listener for file open event
  vscode.workspace.onDidOpenTextDocument(async (document: vscode.TextDocument) => {
    if (document.uri.scheme === "file") {
      notes.repositoryPath = manager.getGitRepositoryPath(document.uri);
      if (settings.autoCheck) {
        await notes.loader(notes.repositoryPath).then(() => {}).catch((error) => {
          logger.error(error);
        });
      }
    }
  });

  // Register the event listener for switching between file tabs
  vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (editor && editor.document.uri.scheme) {
      notes.repositoryPath = manager.getGitRepositoryPath(editor.document.uri);
      if (settings.autoCheck) {
        await notes.loader(notes.repositoryPath).then(() => {}).catch((error) => {
          logger.error(error);
        });
      }
    }
  });

  // Register the command for manual Git notes check. Can take optional parameter `cmdRepositoryPath`
  let gitCheckNotesDisposable = vscode.commands.registerCommand("extension.checkGitNotes",
    async (cmdRepositoryPath?, cmdClearRepoCache?: boolean) => {
      logger.info("extension.checkGitNotes command called");
      const activeEditor = vscode.window.activeTextEditor;
      notes.repositoryPath = cmdRepositoryPath ? cmdRepositoryPath: notes.repositoryPath;
      if (notes.repositoryPath !== undefined) {
        cmdClearRepoCache ? await manager.clearRepositoryDetails(undefined, notes.repositoryPath) : false;
        await notes.loader(notes.repositoryPath).then(() => {}).catch((error) => {
          logger.error(error);
        });
      } else if (activeEditor) {
        notes.repositoryPath = manager.getGitRepositoryPath(activeEditor.document.uri);
        cmdClearRepoCache ? await manager.clearRepositoryDetails(activeEditor.document.uri) : false;
        await notes.loader(notes.repositoryPath).then(() => {}).catch((error) => {
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
        notes.repositoryPath = manager.getGitRepositoryPath(activeEditor.document.uri);
        await notes.loader(notes.repositoryPath).then((repositoryDetails) => {
          GitNotesPanel.createOrShow(activeEditor.document.uri, repositoryDetails);
        }).catch((error) => {
          logger.error(error);
        });
      }
    }
  );

  // Register the command for removing git notes on commits.
  // Can take optional parameters `cmdCommitHash` and `cmdRepositoryPath` passing these to the function will
  // bypass the input prompt and use the passed values instead.
  let removeGitNoteDisposable = vscode.commands.registerCommand('extension.removeGitNote',
    async (cmdCommitHash?, cmdRepositoryPath?) => {
      logger.info("extension.removeGitNote command called");
      const activeEditor = vscode.window.activeTextEditor;
      const repositoryPath = cmdRepositoryPath ? cmdRepositoryPath: notes.repositoryPath;
      if (activeEditor !== undefined || repositoryPath !== undefined) {
        cmdCommitHash ? undefined: input.setup('Remove a Git Note', 'Enter the Commit hash of the note to remove....', false);
        const commitHashInput = cmdCommitHash ? cmdCommitHash: await input.showInputBox();
        const commitHash = commitHashInput ? commitHashInput.replace(/\s/g, '') : undefined;
        if (commitHash !== undefined) {
          if (repositoryPath !== undefined) {
            await notes.removeGitNote(commitHash, undefined, repositoryPath);
          } else if (activeEditor) {
            await notes.removeGitNote(commitHash, activeEditor.document.uri);
          }
        }
      }
    }
  );

  // Register the command for pruning git notes from stale commits.
  // Can take optional parameter `cmdRepositoryPath`
  let pruneGitNotesDisposable = vscode.commands.registerCommand('extension.pruneGitNotes',
      async (cmdRepositoryPath?) => {
      logger.info("extension.pruneGitNotes command called");
      notes.repositoryPath = cmdRepositoryPath ? cmdRepositoryPath: notes.repositoryPath;
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor !== undefined || notes.repositoryPath !== undefined) {
        if (notes.repositoryPath !== undefined) {
          await notes.removeGitNote("", undefined, notes.repositoryPath, true);
        } else if (activeEditor) {
          await notes.removeGitNote("", activeEditor.document.uri, notes.repositoryPath, true);
        }
      }
    }
  );

  // Register the command opening a editor for adding git notes to commits
  let gitAddNoteMessageDisposable = vscode.commands.registerCommand('extension.addOrEditGitNote',
    async (cmdCommitHash?, cmdRepositoryPath?) => {
      logger.info("extension.addOrEditGitNote command called");
      cmdCommitHash ? undefined: input.setup('Add/Edit a Git Note', 'Enter the Commit hash or leave blank to apply to last commit ....', false);
      const commitHashInput = cmdCommitHash ? cmdCommitHash: await input.showInputBox();
      let currentNote = '';
      let editNote = false;
      const activeFileRepoPath = cmdRepositoryPath ? cmdRepositoryPath: notes.repositoryPath;
      const commitHash = commitHashInput ? commitHashInput.replace(/\s/g, '') : (await notes.getLatestCommit(undefined, activeFileRepoPath));
      if (commitHash !== undefined && commitHashInput !== false) {
        const existingNote = manager.getGitNoteMessage(manager.getExistingRepositoryDetails(activeFileRepoPath), commitHash);
        if (existingNote !== undefined) {
          currentNote = existingNote;
          editNote = true;
        }
        const tempDir = os.tmpdir(); const filePrefix = commitHash ? commitHash : 'last_commit';
        const tempFilePath = path.join(tempDir, filePrefix + '.vscode-git-notes-autosave_msg.txt');
        fs.writeFileSync(tempFilePath, `${currentNote}`);
        vscode.workspace.openTextDocument(tempFilePath).then((doc) => {
          vscode.window.showTextDocument(doc, { preview: true }).then((editor) => {
            // Define bufferContent outside of the callback functions
            let bufferContent = '';
            // Listen for changes in the document to extract the commit message
            const onDidChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
              let activeEditor = vscode.window.activeTextEditor;
              if (!activeEditor) {
                return;
              }
              const document = activeEditor.document;
              bufferContent = document.getText();
              // Perform any operations you need with the buffer content here
              document.save();
            });
            // Dispose the event listener when the editor is closed
            const onDidChangeActiveDisposable = vscode.window.onDidChangeActiveTextEditor(
              async (editor) => {
              if (!editor) {
                if (bufferContent !== '' && commitHash !== undefined) {
                  await notes.addGitNotes(bufferContent, commitHash, 'add', undefined, activeFileRepoPath, editNote);
                  onDidChangeActiveDisposable.dispose();
                  onDidChangeDisposable.dispose();
                }
                // You can perform any cleanup or handling here
                fs.unlink(tempFilePath, (error) => {
                  if (GitNotesPanel.currentPanel) {
                    logger.debug(`Sending [repoCheck] command [repositoryPath:${activeFileRepoPath}] to webview`);
                    GitNotesPanel.currentPanel.postMessage({ command: 'repoCheck',
                      repositoryPath: activeFileRepoPath });
                  }
                  if (error) {
                    logger.debug(`Error removing the file: ${error}`);
                  }
                });
                return;
              }
            });
            // Store the disposables in the extension context
            context.subscriptions.push(onDidChangeDisposable);
            context.subscriptions.push(onDidChangeActiveDisposable);
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
    gitAddNoteMessageDisposable
  );
}

export function deactivate() {
  logger.info("Your extension 'git-notes' has been deactivated.");
}
