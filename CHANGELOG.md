# Change Log

All notable changes to the "git-notes" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased Changes]

### Added

- Develop interactive HTML buttons that utilize JavaScript to send messages to a Visual Studio Code function. Upon receiving the messages, the corresponding extension.[code] will be executed. (<https://github.com/jrosco/vscode-git-notes/pull/12>)
- Add confirmation message for note removal and pruning git repos (<https://github.com/jrosco/vscode-git-notes/pull/15>)

### Fixed

- When user hit ESC from `InputBox` when running `extension.addGitNoteMessage` the command tries to add a message/note instead of cancelling input (<https://github.com/jrosco/vscode-git-notes/pull/11>)

### Changed

- Webview date arrangement / sorting (<https://github.com/jrosco/vscode-git-notes/pull/9>)

## Released

## [0.0.1] - 2023-07-23

### Added

- Initial Release

[Unreleased Changes]: https://github.com/jrosco/vscode-git-notes/compare/0.0.1...HEAD

[0.0.1]: https://github.com/jrosco/vscode-git-notes/compare/a9fdfb1...0.0.1
