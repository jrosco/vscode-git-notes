import * as vscode from "vscode";

export class NotesOutputChannel {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Git Notes");
  }

  public log(message: string): void {
    this.outputChannel.appendLine(message);
  }

  public show() {
    this.outputChannel.show();
  }

  public hide() {
    this.outputChannel.hide();
  }

  public clear() {
    this.outputChannel.clear();
  }

  public dispose() {
    this.outputChannel.dispose();
  }
}
