import * as vscode from 'vscode';
import { GitNotesPanel } from './ui/webview';
import { NotesInput } from './ui/input';

import { GitCommands } from './git/cmd';
import { RepositoryManager } from './interface';

const notes = new GitCommands();
const manager = RepositoryManager.getInstance();
const input = NotesInput.getInstance();

export function activate(context: vscode.ExtensionContext) {
  console.log('Your extension "git-notes" has been activated.');

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
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor !== undefined) {
        notes.repositoryPath = manager.getGitRepositoryPath(activeEditor.document.uri);
        const repositoryDetails = await notes.getNotes(notes.repositoryPath);
        GitNotesPanel.createOrShow(activeEditor.document.uri, repositoryDetails);
      }
    }
  );

  let removeGitNotePromptDisposable = vscode.commands.registerCommand('extension.removeGitNotePrompt',
    async () => {
      const activeEditor = vscode.window.activeTextEditor;
      const repositoryPath = notes.repositoryPath;
      if (activeEditor !== undefined || repositoryPath !== undefined) {
        input.setup('Remove a Git Note', 'Enter the Commit hash of the note to remove....', true);
        const commitHashInput = await input.showInputBox();
        if (commitHashInput !== undefined && commitHashInput !== "") {
          if (repositoryPath !== undefined) {
            await notes.removeGitNote(commitHashInput, undefined, repositoryPath);
          } else if (activeEditor) {
            await notes.removeGitNote(commitHashInput, activeEditor.document.uri);
          }
        }
      }
    }
  );

  let pruneGitNotePromptDisposable = vscode.commands.registerCommand('extension.pruneGitNotePrompt',
    async () => {
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

  context.subscriptions.push(gitCheckNotesDisposable,
    gitFetchNoteRefDisposable,
    gitPushNoteRefDisposable,
    runWebviewDisposable,
    removeGitNotePromptDisposable,
    pruneGitNotePromptDisposable
  );
}

export function deactivate() {
  console.log('Your extension "git-notes" has been deactivated.');
}
