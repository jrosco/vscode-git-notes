# Git Notes Extension for Visual Studio Code

[![Version](https://vsmarketplacebadge.apphb.com/version/jrosco.git-notes.png)](https://marketplace.visualstudio.com/items?itemName=jrosco.git-notes)
[![License](https://img.shields.io/badge/license-GPL3-blue.png)](https://github.com/jrosco/vscode-git-notes/blob/master/LICENSE)

The [Git Notes] extension for Visual Studio Code provides a convenient way to work with Git notes directly within the editor. It allows you to check for Git notes when opening a file, displaying the current number of notes found in the repository associated with that file. Additionally, you can easily push and fetch notes to and from local and remote repositories. When notes are found, a status bar button is available, which opens an overview of the notes, complete with commit links to the remote commits.

## Features

Managing code notes and collaboration becomes even more streamlined. You can now easily keep track of changes, discussions, and tasks associated with specific lines of code and push them to your remote repository for seamless teamwork. Additionally, the ability to edit and remove note messages ensures that the code's documentation stays up-to-date and relevant throughout the development process.

- **Add/ Edit/ Remove Note Messages**: Users can add, edit, and remove note messages associated with specific lines or sections of code in the file. This feature allows you to leave comments, feedback, or reminders directly in the code and manage them efficiently.
- **Git Notes Detection**: Automatically checks for [Git Notes] when opening a file and displays the current number of notes found in the associated repository.
- **Push and Fetch Notes**: Easily push your local notes to a remote repository or fetch notes from a remote repository to your local workspace.
- **Note Overview**: Access a comprehensive overview of the notes found in the file repository, along with convenient commit links to the corresponding remote commits.
- **Status Bar Integration**: A status bar button provides quick access to the note overview, making it easily accessible while working in the editor.

## Requirements

- [Visual Studio Code](https://code.visualstudio.com/download) 1.60.0 or higher.
- [Git](https://git-scm.com/) installed and available in your system's PATH.

## Installation

1. Launch Visual Studio Code.
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Search for "Git Notes" in the marketplace search bar.
4. Click on the "Install" button for the "Git Notes" extension by Your Extension Name.
5. Restart Visual Studio Code to activate the extension.

## Usage

1. Open a file that is part of a Git repository.
2. The extension will automatically detect and display the number of [Git Notes] associated with the repository in the status bar.
3. Click on the status bar button to open the note overview, which provides a detailed list of the notes and commit links to the remote commits.
4. Use the provided options (`Ctrl+Shift+P` or `Cmd+Shift+P`) to [`Push`|`Fetch Git Notes`] between the local and remote repositories.

## License

This extension is licensed under the [GPLv3 License](https://github.com/jrosco/vscode-git-notes/blob/master/LICENSE.md).

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvement, please feel free to open an issue or submit a pull request on the [GitHub repository](https://github.com/jrosco/vscode-git-notes).

## Changelog

All notable changes to the Git Notes extension will be documented in this [file](CHANGELOG.md).

## Support

If you encounter any issues, have suggestions for improvement, or have any questions regarding the Git Notes extension, please open a GitHub issue on the [repository](https://github.com/jrosco/vscode-git-notes/issues). The project's maintainers will be happy to assist you.

---

**Enjoy the Git Notes extension!**

[Git Notes]: https://git-scm.com/docs/git-notes