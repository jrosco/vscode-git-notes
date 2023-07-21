import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { GitNotesPanel } from './ui/webview';
import { NotesInput } from './ui/input';

import { GitCommands } from './git/cmd';
import { RepositoryManager } from './interface';
import { LoggerService, LogLevel } from './log/service';

const notes = new GitCommands();
const manager = RepositoryManager.getInstance();
const input = NotesInput.getInstance();
const logger = LoggerService.getInstance();

export function activate(context: vscode.ExtensionContext) {
  logger.info("Your extension 'git-notes' has been activated.");

  // Get the URIs of open files when Visual Studio Code first opens
  // Iterate through the currently open files
  vscode.workspace.textDocuments.forEach(async (document: vscode.TextDocument) => {
    if (document.uri.scheme === "file") {
      notes.repositoryPath = manager.getGitRepositoryPath(document.uri);
      await notes.getNotes(notes.repositoryPath);
    }
  });

  // Register the event listener for file open event
  vscode.workspace.onDidOpenTextDocument(async (document: vscode.TextDocument) => {
    if (document.uri.scheme === "file") {
      notes.repositoryPath = manager.getGitRepositoryPath(document.uri);
      await notes.getNotes(notes.repositoryPath);
    }
  });

  // Register the event listener for switching between file tabs
  vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (editor && editor.document.uri.scheme === "file") {
      notes.repositoryPath = manager.getGitRepositoryPath(editor.document.uri);
      await notes.getNotes(notes.repositoryPath);
    }
  });

  // Register the command for manual Git notes check
  let gitCheckNotesDisposable = vscode.commands.registerCommand(
    "extension.checkGitNotes",
    async () => {
      logger.info("extension.checkGitNotes command called");
      const activeEditor = vscode.window.activeTextEditor;
      if (notes.repositoryPath !== undefined) {
        await manager.clearRepositoryDetails(undefined, notes.repositoryPath);
        await notes.getNotes(notes.repositoryPath);
      } else if (activeEditor) {
        await manager.clearRepositoryDetails(activeEditor.document.uri);
        notes.repositoryPath = manager.getGitRepositoryPath(activeEditor.document.uri);
        await notes.getNotes(notes.repositoryPath);
      }
    }
  );

  // Register the command for manual Fetch notes
  let gitFetchNoteRefDisposable = vscode.commands.registerCommand(
    "extension.fetchGitNotes",
    async () => {
      logger.info("extension.fetchGitNotes command called");
      const activeEditor = vscode.window.activeTextEditor;
      if (notes.repositoryPath !== undefined) {
        await notes.fetchGitNotes(undefined,notes.repositoryPath);
       } else if (activeEditor) {
        await notes.fetchGitNotes(activeEditor.document.uri);
      }
    }
  );

  // Register the command for manual Push notes
  let gitPushNoteRefDisposable = vscode.commands.registerCommand(
    "extension.pushGitNotes",
    async () => {
      logger.info("extension.pushGitNotes command called");
      const activeEditor = vscode.window.activeTextEditor;
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
        const repositoryDetails = await notes.getNotes(notes.repositoryPath);
        GitNotesPanel.createOrShow(activeEditor.document.uri, repositoryDetails);
      }
    }
  );

  // Register the command for removing git notes on commits
  let removeGitNotePromptDisposable = vscode.commands.registerCommand('extension.removeGitNotePrompt',
    async () => {
      logger.info("extension.removeGitNotePrompt command called");
      const activeEditor = vscode.window.activeTextEditor;
      const repositoryPath = notes.repositoryPath;
      if (activeEditor !== undefined || repositoryPath !== undefined) {
        input.setup('Remove a Git Note', 'Enter the Commit hash of the note to remove....', true);
        const commitHashInput = await input.showInputBox();
        if (commitHashInput !== undefined && commitHashInput !== "") {
          const commitHash = commitHashInput.replace(/\s/g, '');
          if (repositoryPath !== undefined) {
            await notes.removeGitNote(commitHash, undefined, repositoryPath);
          } else if (activeEditor) {
            await notes.removeGitNote(commitHash, activeEditor.document.uri);
          }
        }
      }
    }
  );

  // Register the command for pruning git notes from stale commits
  let pruneGitNotePromptDisposable = vscode.commands.registerCommand('extension.pruneGitNotePrompt',
    async () => {
      logger.info("extension.pruneGitNotePrompt command called");
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
  let gitAddNoteMessageDisposable = vscode.commands.registerCommand('extension.addGitNoteMessage', async () => {
    logger.info("extension.addGitNoteMessage command called");
    input.setup('Add a Git Note', 'Enter the Commit hash add a message to....', false);
    const commitHashInput = await input.showInputBox();
    const activeFileRepoPath = notes.repositoryPath;
    // TODO: If not commitHashInput, then use last commit message details
    if (commitHashInput !== undefined && commitHashInput !== "") {
      const commitHash = commitHashInput.replace(/\s/g, '');
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, commitHash + '.vscode-git-notes-autosave_msg.txt');
      fs.writeFileSync(tempFilePath, '');
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
          const onDidChangeActiveDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (!editor) {
              if (bufferContent !== '') {
                notes.addGitNotes(bufferContent, commitHash, 'add', undefined, activeFileRepoPath);
                onDidChangeActiveDisposable.dispose();
                onDidChangeDisposable.dispose();
              }
              // You can perform any cleanup or handling here
              fs.unlink(tempFilePath, (error) => {
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
  });

  context.subscriptions.push(gitCheckNotesDisposable,
    gitFetchNoteRefDisposable,
    gitPushNoteRefDisposable,
    runWebviewDisposable,
    removeGitNotePromptDisposable,
    pruneGitNotePromptDisposable,
    gitAddNoteMessageDisposable
  );
}

export function deactivate() {
  logger.info("Your extension 'git-notes' has been deactivated.");
}
