import * as vscode from 'vscode';

export class NotesInput {

	private static instance: NotesInput;
	public prompt?: string;
	public placeHolder?: string;
	public confirmation?: boolean = false;

	constructor() {
		this.confirmation;
		this.prompt;
		this.placeHolder;
	}

	public static getInstance(): NotesInput {
    if (!NotesInput.instance) {
      NotesInput.instance = new NotesInput();
    }
    return NotesInput.instance;
  }

  // Method to set prompt, placeHolder, and confirmation properties
  public setup(prompt?: string, placeHolder?: string, confirmation?: boolean): void {
    this.prompt = prompt;
    this.placeHolder = placeHolder;
    this.confirmation = confirmation;
  }

	public async showInputBox() {
		const inputPrompt = this.prompt;
		const inputPlaceHolder = this.placeHolder;
		const inputConfirmation = this.confirmation;

		const inputValue = await vscode.window.showInputBox({
			prompt: inputPrompt,
			placeHolder: inputPlaceHolder,
		});

		if (inputValue === undefined) {
			vscode.window.showInformationMessage('No value provided.');
			return "";
		}
		if (inputConfirmation) {
			const confirm = await vscode.window.showInformationMessage(
				`You entered: ${inputValue}. Is this correct?`,
				{ modal: false }, // Non-blocking notification
				'Yes', 'No'
			);

			// Handle the user's response
			if (confirm === 'Yes') {
				return inputValue;
			} else {
				vscode.window.showInformationMessage('Confirmation canceled.');
				return "";
			}
		} else {
			return inputValue;
		}
	}

public async showInputWindowMessage(message: string, messageText?: string, interactive?: boolean, errorWindow?: boolean): Promise<boolean> {
	let window = vscode.window.showInformationMessage;
	if (errorWindow) {
		window = vscode.window.showErrorMessage;
	}
	if (interactive && messageText !== undefined) {
		const confirm = await window(
			message, { modal: false }, messageText, 'Cancel'
		);
		if (confirm === messageText) {
			return true;
		} else {
			return false;
		}
	} else {
		window(message);
	}
	return false;
}
}
