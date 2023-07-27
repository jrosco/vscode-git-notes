# Git Notes Extension for Visual Studio Code

[![Visual Studio Marketplace Last Updated](https://img.shields.io/visual-studio-marketplace/last-updated/jrosco.git-notes)](https://marketplace.visualstudio.com/items?itemName=jrosco.git-notes) [![Visual Studio Marketplace Release Date](https://img.shields.io/visual-studio-marketplace/release-date/jrosco.git-notes)](https://marketplace.visualstudio.com/items/jrosco.git-notes/changelog)[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/jrosco.git-notes)](vscode:extension/jrosco.git-notes) ![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/jrosco.git-notes) [![GitHub pull requests](https://img.shields.io/github/issues-pr-raw/jrosco/vscode-git-notes)](https://github.com/jrosco/vscode-git-notes/pulls) [![License](https://img.shields.io/badge/license-GPL3-blue.png)](https://github.com/jrosco/vscode-git-notes/blob/master/LICENSE.md)

The Visual Studio Code extension known as `git-notes` offers a user-friendly method of handling [Git Notes] directly within the editor. With this extension, you can effortlessly access Git notes when opening a file, displaying the total number of notes in the associated repository. Moreover, it simplifies the process of pushing and fetching notes to and from both local and remote repositories.

When Git notes are detected, a convenient status bar button becomes available. By clicking on it, you can access an overview of the notes, complete with links to the corresponding remote commits. This feature enhances code management and collaboration by allowing easy tracking of changes, discussions, and tasks linked to specific lines of code. The seamless teamwork is further supported as these notes can be conveniently pushed to your remote repository.

Additionally, the extension facilitates editing and removing note messages, ensuring that the code's documentation remains up-to-date and relevant throughout the entire development process. This streamlines the workflow and fosters efficient collaboration among developers.

## Features

- **Note Overview**: Access a comprehensive overview of the notes found in the file repository, along with convenient commit links to the corresponding remote commits.
- **Add/ Edit/ Remove Note Messages**: Users can add, edit, and remove note messages associated with specific lines or sections of code in the file. This feature allows you to leave comments, feedback, or reminders directly in the code and manage them efficiently.
- **Git Notes Detection**: Automatically checks for [Git Notes] when opening a file and displays the current number of notes found in the associated repository.
- **Push and Fetch Notes**: Easily push your local notes to a remote repository or fetch notes from a remote repository to your local workspace.
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
3. Click on the status bar button to open the note overview or use (`Ctrl+Shift+P` or `Cmd+Shift+P`) [`View Notes`], which provides a detailed list of the notes and commit links to the remote commits. The extension offers interactive buttons to efficiently manage Git notes. Users can easily perform various actions, including opening repositories, viewing commits, adding, updating, or removing notes, as well as fetching and pushing notes to and from the remote repository.
4. Use the provided options (`Ctrl+Shift+P` or `Cmd+Shift+P`) to [`Push`|`Fetch`|`Add/Edit`|`Prune`|`Remove` `Notes`] between the local and remote repositories.

### Command List

Open the command list with `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (MacOS)

| Command                       | Description                                                                                                       |
| ---                           | ---                                                                                                               |
| `Git Note: Check Notes`       | Verify whether the currently opened file within the directory/workspace contains any Git Notes.                   |
| `Git Note: View Notes`        | Launch the vscode Webview to view Git notes within the current directory.                                         |
| `Git Note: Add/Edit Notes`    | Allows you to add/edit or append additional information, comments, or annotations to Git objects such as commits. |
| `Git Note: Fetch Notes`       | Retrieve Git notes from a remote repository and store them locally in your repository.                            |
| `Git Note: Push Notes`        | Send local Git notes to a remote repository.                                                                      |
| `Git Note: Remove Notes`      | Remove a Git notes associated with a specific Git object, such as a commit.                                       |
| `Git Note: Prune Notes`       | Remove orphaned Git notes from a repository.                                                                      |

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