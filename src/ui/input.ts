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
			vscode.window.showInformationMessage(`${this.prompt} Cancelled`);
			return false;
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

	public async showInputWindowMessage(message: string, messageItem?: vscode.MessageItem[], interactive?: boolean, errorWindow?: boolean) {
		let window = vscode.window.showInformationMessage;
		if (errorWindow) {
			window = vscode.window.showErrorMessage;
		}
		if (interactive && messageItem !== undefined) {
			const confirm = await window(
				message, { modal: false }, messageItem[0], messageItem[1], messageItem[2]
			);
			if (confirm === messageItem[0]) {
				return messageItem[0];
			} else if (confirm === messageItem[1]) {
				return messageItem[1];
			} else if (confirm === messageItem[2]) {
				return messageItem[2];
			} else {
				return undefined;
			}
		} else {
			window(message);
		}
	}
}
