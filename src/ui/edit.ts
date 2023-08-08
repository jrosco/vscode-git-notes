import * as vscode from "vscode";
import * as fs from "fs/promises"; // Using promises version of fs
import * as os from "os";
import * as path from "path";

import { LoggerService, LogLevel } from "../log/service";
import { GitNotesSettings } from "../settings";

export class EditWindow {
  private existingMessage: string;
  private commitHash: string;
  private settings: GitNotesSettings;
  private logger: LoggerService;

  constructor(commitHash: string, existingMessage?: string) {
    this.existingMessage = existingMessage || "";
    this.commitHash = commitHash;
    this.settings = new GitNotesSettings();
    this.logger = LoggerService.getInstance(this.settings.logLevel);
  }

  private async _createTemporaryFile(): Promise<string> {
    this.logger.debug(`_createTemporaryFile()`);
    const tempDir = os.tmpdir();
    const tempFilePrefix = this.commitHash ? this.commitHash : "last_commit";
    const tempFileSuffix: string = ".vscode-git-notes-autosave_msg.txt";
    const tempFilePath = path.join(tempDir, tempFilePrefix + tempFileSuffix);

    await fs.writeFile(tempFilePath, this.existingMessage);
    this.logger.debug(`_createTemporaryFile() tempFilePath: ${tempFilePath}`);

    return tempFilePath;
  }

  private async _handleTextChanges(
    document: vscode.TextDocument
  ): Promise<string> {
    this.logger.debug(`_handleTextChanges()`);
    let bufferContent = "";

    const onDidChangeDisposable = vscode.workspace.onDidChangeTextDocument(
      async (event) => {
        const activeEditor = vscode.window.activeTextEditor;

        if (!activeEditor) {
          this.logger.debug(`_handleTextChanges() no active editor`);
          return;
        }

        if (activeEditor.document === document) {
          bufferContent = activeEditor.document.getText();
          // Perform any operations you need with the buffer content here
          await activeEditor.document.save();
        }
      }
    );

    return new Promise<string>((resolve) => {
      // Resolve the promise when the editor window is closed
      const documentCloseDisposable = vscode.window.onDidChangeActiveTextEditor(
        (editor) => {
          if (!editor) {
            // Dispose the event listeners
            onDidChangeDisposable.dispose();
            documentCloseDisposable.dispose();
            this.logger.debug(`_handleTextChanges() resolve: ${bufferContent}`);
            // Remove the temporary file before resolving
            fs.unlink(document.fileName)
              .then(() => {
                this.logger.debug(
                  `_handleTextChanges() Removed temp file: ${document.fileName}`
                );
                resolve(bufferContent);
              })
              .catch((error) => {
                this.logger.error(
                  `_handleTextChanges() Error removing temp file: ${error}`
                );
                resolve(bufferContent); // Resolve even if removal fails
              });
          }
        }
      );
    });
  }

  public async showEditWindow(): Promise<string> {
    this.logger.debug(`showEditWindow()`);

    const tempFilePath = await this._createTemporaryFile();

    const doc = await vscode.workspace.openTextDocument(tempFilePath);
    const editor = await vscode.window.showTextDocument(doc, { preview: true });
    this.logger.debug(
      `showEditWindow() using doc: ${doc.uri.path} editor: ${editor.document.uri.path}`
    );
    editor.edit((edit) => {
      edit.insert(new vscode.Position(0, 0), this.existingMessage);
    });

    const bufferContent = await this._handleTextChanges(doc);

    this.logger.info(`showEditWindow() return bufferContent`);
    return bufferContent;
  }
}
