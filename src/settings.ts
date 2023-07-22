import * as vscode from 'vscode';
import { LoggerService, LogLevel } from './log/service';

export class GitNotesSettings {

	private _config: vscode.WorkspaceConfiguration;
	private _onDidChangeConfig: vscode.EventEmitter<vscode.ConfigurationChangeEvent>;
	private logger = LoggerService.getInstance();

	constructor() {
		this.logger.debug("GitNotesSettings constructor called");
		this._config = vscode.workspace.getConfiguration('git-notes');
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
		return this._config.get('enableNotifications', false);
	}

	public get onDidChangeConfig(): vscode.Event<vscode.ConfigurationChangeEvent> {
		this.logger.debug("GitNotesSettings get onDidChangeConfig called");
		return this._onDidChangeConfig.event;
	}

	// Optionally, you can create a method to apply the settings when needed
	// public applySettings(): void {
	//     // Apply your settings logic here
	//     console.log('Settings applied');
	// }

}

export default GitNotesSettings;
