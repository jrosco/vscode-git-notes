import * as vscode from 'vscode';
import { LoggerService, LogLevel } from './log/service';

export class GitNotesSettings {

	private _config: vscode.WorkspaceConfiguration;
	private _onDidChangeConfig: vscode.EventEmitter<vscode.ConfigurationChangeEvent>;
	private logger: LoggerService;

	constructor() {
		this._config = vscode.workspace.getConfiguration('git-notes');
		this.logger = LoggerService.getInstance(this._config.get('logLevel', LogLevel.info));
		this.logger.debug("GitNotesSettings constructor called");
		this._onDidChangeConfig = new vscode.EventEmitter<vscode.ConfigurationChangeEvent>();
		// Listen for configuration changes and trigger the event emitter
		vscode.workspace.onDidChangeConfiguration(this.onDidChangeConfiguration, this);
	}

	private onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent) {
		this.logger.debug("GitNotesSettings onDidChangeConfiguration called");
		if (event.affectsConfiguration('git-notes')) {
			// Reload the configuration when changes are detected
			this._config = vscode.workspace.getConfiguration('git-notes');
			// Optionally, you can apply the changes immediately here
			// this.applySettings();
			// Emit the event to notify any listeners about the changes
			this._onDidChangeConfig.fire(event);
		}
	}

	public get autoCheck(): boolean {
		this.logger.debug("GitNotesSettings get autoCheck called");
		return this._config.get('autoCheck', true);
	}

	public get logLevel(): LogLevel {
		this.logger.debug("GitNotesSettings get logLevel called");
		return this._config.get<LogLevel>('logLevel', LogLevel.info);
  	}

	public get localNoteRef(): string {
		this.logger.debug("GitNotesSettings get localNoteRef called");
		return this._config.get('localNoteRef', 'refs/notes/commits');
	}

	public get remoteNoteRef(): string {
		this.logger.debug("GitNotesSettings get remoteNoteRef called");
		return this._config.get('remoteNoteRef', 'refs/notes/commits');
	}

	public get enableNotifications(): boolean {
		this.logger.debug("GitNotesSettings get enableNotifications called");
		return this._config.get('enableNotifications', true);
	}

	public get enableNotificationsWhenNotesFound(): boolean {
		this.logger.debug("GitNotesSettings get enableNotificationsWhenNotesFound called");
		return this._config.get('enableNotificationsWhenNotesFound', false);
	}

	public get confirmPushAndFetchCommands(): boolean {
		this.logger.debug("GitNotesSettings get confirmPushAndFetchCommands called");
		return this._config.get('confirmPushAndFetchCommands', true);
	}

	public get confirmRemovalCommands(): boolean {
		this.logger.debug("GitNotesSettings get confirmRemovalCommands called");
		return this._config.get('confirmRemovalCommands', true);
	}

	public get confirmPruneCommands(): boolean {
		this.logger.debug("GitNotesSettings get confirmPruneCommands called");
		return this._config.get('confirmPruneCommands', true);
	}

	public get sortDateNewestFirst(): boolean {
		this.logger.debug("GitNotesSettings get sortDateNewestFirst called");
		return this._config.get('sortDateNewestFirst', true);
	}

	public get gitNotesLoadLimit(): number {
		this.logger.debug("GitNotesSettings get gitNotesLoadLimit called");
		return this._config.get('gitNotesLoadLimit', 3);
	}

	public get gitUrlSCMProvider(): string[] {
		this.logger.debug("GitNotesSettings get gitUrlSCMProvider called");
		return this._config.get("gitUrlSCMProvider", [
      "github.com/{path1}/{path2}/commit/{commitId}",
      "bitbucket.org/{path1}/{path2}/commits/{commitId}",
      "gitlab.com/{path1}/{path2}/commit/{commitId}",
      "git.launchpad.net/{path1}/commit/?id={commitId}",
    ]);
	}

	public get onDidChangeConfig(): vscode.Event<vscode.ConfigurationChangeEvent> {
		this.logger.debug("GitNotesSettings get onDidChangeConfig called");
		return this._onDidChangeConfig.event;
	}

	public get isDarkThemeEnabled(): boolean {
		const config = vscode.workspace.getConfiguration('workbench');
		const theme = config.get<string>('colorTheme', 'default');
		// You can check for specific dark themes if needed, but the default dark theme is usually 'Default Dark+'
		this.logger.debug(`GitNotesSettings isDarkThemeEnabled ${theme.includes('Dark')}`);
		return theme.includes('Dark');
	}

	public get tempFileSuffixPath(): string {
        return '.vscode-git-notes-autosave_msg.txt';
    }
	// Optionally, you can create a method to apply the settings when needed
	// public applySettings(): void {
	//     // Apply your settings logic here
	//     console.log('Settings applied');
	// }

}

// export default GitNotesSettings;
