# Change Log

All notable 🔖 changes to the "git-notes" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased Changes]

## [0.2.1] - 2023-08-07

### Added

- [#28](https://github.com/jrosco/vscode-git-notes/pull/28) 🍺 Added URL placeholder setting to help with an issue where some SCMs have different commit URLs

### Bug

- [#34](https://github.com/jrosco/vscode-git-notes/pull/34) 🐛 Fixed issue with extension when temp edit file is opened or switched
- [#33](https://github.com/jrosco/vscode-git-notes/pull/33) 🐛 There is an issue on windows with the way "//" are treated, it removes the "//" from path. This temp fix will replace the "//" with "/"
- [#37](https://github.com/jrosco/vscode-git-notes/pull/37) 🐛 Fixed issue when opening the temp notes edit file in tab, does not dispose the event correctly
- [#40](https://github.com/jrosco/vscode-git-notes/pull/40) 🐛 Fixed the https Github URL strip off the `.git` from end of URL

### Removed

- [#30](https://github.com/jrosco/vscode-git-notes/pull/30) 🔥Remove parser code date from `_parseCommitDetail()`. Date is found with the `_getGitNotesList()` method now

## [0.2.0] - 2023-08-01

### Added

- [#19](https://github.com/jrosco/vscode-git-notes/pull/19) ⚡ Created a loader method for git notes to support things like, infinite scrolling in webview, caching etc
- [#18](https://github.com/jrosco/vscode-git-notes/pull/18) ⚡ Remove and Add committed notes from the `CommitDetails[]` interface class
- [#20](https://github.com/jrosco/vscode-git-notes/pull/20) 💄 Improve Webview for new git notes `loader()` function
  - [#23](https://github.com/jrosco/vscode-git-notes/pull/23) ⚡ RELATED: Remove the loop inside a loop in method `_getGitNotesList()`
- [#21](https://github.com/jrosco/vscode-git-notes/pull/21) 🍻 Add settings for the git notes load limit
  
### Fixed

- [#17](https://github.com/jrosco/vscode-git-notes/pull/17) ♻️ Don't show files in webview if no file changes found
- [#24](https://github.com/jrosco/vscode-git-notes/pull/24) 🐛 Don't show the edit button if no note exist in the commit

## [0.1.0] - 2023-07-27

### Added

- [#12](https://github.com/jrosco/vscode-git-notes/pull/12) ❇️ Develop interactive HTML buttons that utilize JavaScript to send messages to a Visual Studio Code function. Upon receiving the messages, the corresponding extension.[code] will be executed
- [#15](https://github.com/jrosco/vscode-git-notes/pull/15) ❇️ Add confirmation message for note removal and pruning git repos
- [#14](https://github.com/jrosco/vscode-git-notes/pull/14) ❇️ Webview can now refresh on updates e.g removing a note message

### Fixed

- [#11](https://github.com/jrosco/vscode-git-notes/pull/11) 🐛 When user hit ESC from `InputBox` when running `extension.addGitNoteMessage` the command tries to add a message/note instead of cancelling input

### Changed

- [#9](https://github.com/jrosco/vscode-git-notes/pull/9) 🍻 Webview date arrangement / sorting

## Released

## [0.0.1] - 2023-07-23

### Added

- 🔖 Initial Release

[Unreleased Changes]: https://github.com/jrosco/vscode-git-notes/compare/master...develop

[0.0.1]: https://github.com/jrosco/vscode-git-notes/compare/a9fdfb1...0.0.1
[0.1.0]: https://github.com/jrosco/vscode-git-notes/compare/0.0.1...0.1.0
[0.2.0]: https://github.com/jrosco/vscode-git-notes/compare/0.1.0...0.2.0
[0.2.1]: https://github.com/jrosco/vscode-git-notes/compare/0.2.0...0.2.1
