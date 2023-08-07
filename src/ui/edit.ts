import * as vscode from "vscode";
import * as fs from "fs";
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

  public async showEditWindow(): Promise<void> {
    this.logger.info(`showEditWindow()`);
    const tempDir = os.tmpdir();
    const tempFilePrefix = this.commitHash ? this.commitHash : "last_commit";
    const tempFileSuffix: string = ".vscode-git-notes-autosave_msg.txt";
    const tempFilePath = path.join(tempDir, tempFilePrefix + tempFileSuffix);

    fs.writeFileSync(tempFilePath, this.existingMessage);
    this.logger.info(`showEditWindow() tempFilePath: ${tempFilePath}`);

    vscode.workspace.openTextDocument(tempFilePath).then((doc) => {
      vscode.window.showTextDocument(doc, { preview: true }).then((editor) => {
        editor.edit((edit) => {
          edit.insert(new vscode.Position(0, 0), this.existingMessage);
          let bufferContent = "";
          let document: vscode.TextDocument;
          let message = "";
          const onDidChangeDisposable =
            vscode.workspace.onDidChangeTextDocument((event) => {
              let activeEditor = vscode.window.activeTextEditor;
              if (!activeEditor) {
                this.logger.info(
                  `showEditWindow() no active editor: ${activeEditor}`
                );
                return;
              }
              document = activeEditor.document;
              // Check if the document is the temporary git edit file and get the content buffer
              document.uri.path.match(tempFilePath)
                ? (bufferContent = document.getText())
                : "";
              console.log(bufferContent);
              // Perform any operations you need with the buffer content here
              document.save();

              // Dispose the event listener when the editor is closed
              const onDidChangeActiveDisposable =
                vscode.window.onDidChangeActiveTextEditor(async (editor) => {
                  if (!editor) {
                    if (bufferContent !== "" && this.commitHash !== undefined) {
                      message = bufferContent;
                    }
                    // You can perform any cleanup or handling here
                    fs.unlink(tempFilePath, (error) => {
                      // if (error) {
                      //   this.logger.error(`Error removing the file: ${error}`);
                      // }
                      // // Dispose the event listeners
                      // onDidChangeActiveDisposable.dispose();
                      // onDidChangeDisposable.dispose();
                    });
                    return message;
                  }
                });
            });
        });
      });
    });
  }
}
