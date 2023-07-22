import * as vscode from 'vscode';

import { RepositoryManager, RepositoryDetails } from '../interface';
import { GitNotesStatusBar } from '../ui/status';

export class GitNotesPanel {
  public static currentPanel: GitNotesPanel | undefined;
  private static readonly viewType = 'gitNotesPanel';

  private statusBar: GitNotesStatusBar;

  private manager: RepositoryManager;
  private repositoryPath: string | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _document: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, document: vscode.Uri, repositoryDetails: RepositoryDetails[]) {
    this._panel = panel;
    this._document = document;
    this.manager = RepositoryManager.getInstance();
    this.statusBar = GitNotesStatusBar.getInstance();
    repositoryDetails = this.manager.getRepositoryDetailsInterface();

    // Set up the webview panel
    this.repositoryPath = this.manager.getGitRepositoryPath(document);
    this._panel.webview.html = this._getWebviewContent(this.repositoryPath, repositoryDetails);
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(document: vscode.Uri,
    repositoryDetails: RepositoryDetails[]) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    // If panel already exists, dispose it so we get a fresh new panel
    if (GitNotesPanel.currentPanel) {
      GitNotesPanel.currentPanel._panel.dispose();
    }

    const panel = vscode.window.createWebviewPanel(
      GitNotesPanel.viewType,
      'Git Notes',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [document],
      }
    );
    GitNotesPanel.currentPanel = new GitNotesPanel(panel, document, repositoryDetails);
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

  private _getWebviewContent(repositoryPath: string | undefined, repositoryDetails: RepositoryDetails[]) {
    // Filter repositoryDetails based on exact match of repositoryPath
    if (this.repositoryPath !== undefined) {
      const filteredRepositoryDetails = repositoryDetails.filter(details =>
        details.repositoryPath === this.repositoryPath
      );
      this.statusBar.message = "Close Tab";
      this.statusBar.command = "workbench.action.closeActiveEditor";
      this.statusBar.update();

      // Use the passed variable value in the HTML content
      const repositoryInfo = filteredRepositoryDetails.map(details => `
        <p><h3 style="color:Black;background-color:LightGray;">Repository Path: ${details.repositoryPath}</h3></p>
        <style>
          <hr {width: 10px;}>
        </style>
        ${details.commitDetails.map(commit => `
          <p style="color:#f0efef;background-color:#92a8d1;"><b>Commit Hash: </b><a style="color:white" href="${details.repositoryUrl}/commit/${commit.commitHash}">${commit.commitHash}</a></p>
          <p style="color:#f0efef;background-color:#034f84;"><b>Note Hash: </b>${commit.notesHash}</p>
          <div style="color:#f0efef;">
          <p><strong>Author:</strong> ${commit.author}</p>
          <p><strong>Date:</strong> ${commit.date}</p>
          <p><strong>Commit Message:</strong> ${commit.message}</p>
          <p><strong>Note:</strong><pre>${commit.note}</pre></p>
          <p><strong>Files:</strong></p>
          <ul>
            ${commit.fileChanges.map(fileChange => {
                const color = 'white';
                const insertionsColor = 'green';
                const deletionsColor = 'red';
                const addedColor = 'blue';
                const deletedColor = 'red';
                const renamedColor = 'yellow';

                const insertionsStatus = fileChange.insertions ? `<span style="color: ${insertionsColor}">(+${fileChange.insertions})</span>` : '';
                const deletionsStatus = fileChange.deletions ? `<span style="color: ${deletionsColor}">(-${fileChange.deletions})</span>` : '';
                const addedStatus = fileChange.added ? `<span style="color: ${addedColor}">(Added)</span>` : '';
                const deletedStatus = fileChange.deleted ? `<span style="color: ${deletedColor}">(Deleted)</span>` : '';
                const renamedStatus = fileChange.renamed ? `<span style="color: ${renamedColor}">(Renamed)</span>` : '';

                return `<li style="color: ${color}">${fileChange.file} ${insertionsStatus} ${deletionsStatus} ${addedStatus} ${deletedStatus} ${renamedStatus}</li>`;
            }).join('')}
        </ul>
          </div>
        `).join('')}
      `).join('');
      return `
        <html>
          <body>
            <h1>Git Notes</h1>
            ${repositoryInfo}
          </body>
        </html>
      `;
    } else {
    return "Path not found";
    }
  }
}
