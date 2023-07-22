import * as vscode from 'vscode';

import { LoggerService, LogLevel } from '../log/service';
import { GitNotesSettings } from '../settings';
export class GitNotesStatusBar {

  private static instance: GitNotesStatusBar;
  private statusBarItem: vscode.StatusBarItem | undefined;
  private logger: LoggerService;
  private settings: GitNotesSettings;

  public notesCount: number;
  public message;
  public repositoryPath;
  public command;

  constructor(notesCount: number = 0, message?: string, repositoryPath?: string | undefined, command?: string) {
    this.notesCount = notesCount;
    this.message = message;
    this.repositoryPath = repositoryPath;
    this.command = command;
    this.logger = LoggerService.getInstance();
    this.settings = new GitNotesSettings();
  }

  public static getInstance(): GitNotesStatusBar {
    if (!GitNotesStatusBar.instance) {
      GitNotesStatusBar.instance = new GitNotesStatusBar();
    }
    return GitNotesStatusBar.instance;
  }

  public update(): void {
    this.logger.debug(`statusBar.update(${this.notesCount}, ${this.repositoryPath})`);
    if (!this.statusBarItem) {
      this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    }
    if (this.notesCount > 0 && this.command === undefined) {
      this.statusBarItem.text = `Git Notes: ${this.notesCount}`;
      this.statusBarItem.command = this.command ? this.command: "extension.runWebview";
      this.statusBarItem.show();
    } else if (this.message !== undefined) {
        this.statusBarItem.text = `Git Notes: ${this.message}`;
        this.statusBarItem.command = this.command ? this.command: "extension.runWebview";
        this.statusBarItem.show();
    } else {
      this.statusBarItem?.hide();
    }
  }

  public reset(): void {
    this.notesCount = 0;
    this.message = undefined;
    this.repositoryPath = undefined;
    this.command = undefined;
    this.update();
  }

  // TODO: Need to prove this works
  public async showTimedInformationMessage(message: string, duration: number): Promise<void> {
    if (this.settings.enableNotifications) {
      const promise = vscode.window.showInformationMessage(message);
      setTimeout(async () => {
        const choice = await promise;
        if (choice) {
          this.logger.debug(`User selected ${choice}`);
        }
      }, duration);
    }
  }

  public showInformationMessage(message: string) {
    if (this.settings.enableNotifications) {
      vscode.window.showInformationMessage(message);
    }
  }

  public showErrorMessage(message: string) {
    vscode.window.showErrorMessage(message);
  }

}
