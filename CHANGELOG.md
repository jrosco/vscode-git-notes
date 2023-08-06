# Change Log

All notable 🔖 changes to the "git-notes" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased Changes]

## [0.2.1]

### Bug

- 🐛 [#34](https://github.com/jrosco/vscode-git-notes/pull/34) Fixed issue with extension when temp edit file is opened or switched
- 🐛 [#33](https://github.com/jrosco/vscode-git-notes/pull/33) There is an issue on windows with the way "//" are treated, it removes the "//" from path. This temp fix will replace the "//" with "/"
- 🐛 [#37](https://github.com/jrosco/vscode-git-notes/pull/37) Fixed issue when opening the temp notes edit file in tab, does dispose the event correctly

## [0.2.0]

### Added

- ⚡ Created a loader method for git notes to support things like, infinite scrolling in webview, caching etc (<https://github.com/jrosco/vscode-git-notes/pull/19>)
- ⚡ Remove and Add committed notes from the `CommitDetails[]` interface class (<https://github.com/jrosco/vscode-git-notes/pull/18>)
- 💄 Improve Webview for new git notes `loader()` function (<https://github.com/jrosco/vscode-git-notes/pull/20>)
  - ⚡ RELATED: Remove the loop inside a loop in method `_getGitNotesList()` (<https://github.com/jrosco/vscode-git-notes/pull/23>)
- 🍻 Add settings for the git notes load limit (<https://github.com/jrosco/vscode-git-notes/pull/21>)
  
### Fixed

- ♻️ Don't show files in webview if no file changes found (<https://github.com/jrosco/vscode-git-notes/pull/17>)
- 🐛 Don't show the edit button if no note exist in the commit (<https://github.com/jrosco/vscode-git-notes/pull/24>)

## [0.1.0] - 2023-07-27

### Added

- ❇️ Develop interactive HTML buttons that utilize JavaScript to send messages to a Visual Studio Code function. Upon receiving the messages, the corresponding extension.[code] will be executed. (<https://github.com/jrosco/vscode-git-notes/pull/12>)
- ❇️ Add confirmation message for note removal and pruning git repos (<https://github.com/jrosco/vscode-git-notes/pull/15>)
- ❇️ Webview can now refresh on updates e.g removing a note message (<https://github.com/jrosco/vscode-git-notes/pull/14>)

### Fixed

- 🐛 When user hit ESC from `InputBox` when running `extension.addGitNoteMessage` the command tries to add a message/note instead of cancelling input (<https://github.com/jrosco/vscode-git-notes/pull/11>)

### Changed

- 🍻 Webview date arrangement / sorting (<https://github.com/jrosco/vscode-git-notes/pull/9>)

## Released

## [0.0.1] - 2023-07-23

### Added

- 🔖 Initial Release

[Unreleased Changes]: https://github.com/jrosco/vscode-git-notes/compare/0.1.0...HEAD

[0.0.1]: https://github.com/jrosco/vscode-git-notes/compare/a9fdfb1...0.0.1
[0.1.0]: https://github.com/jrosco/vscode-git-notes/compare/0.0.1...0.1.0
[0.2.0]: https://github.com/jrosco/vscode-git-notes/compare/0.1.0...0.2.0
[0.2.1]: https://github.com/jrosco/vscode-git-notes/compare/0.2.0...0.2.1-patches
