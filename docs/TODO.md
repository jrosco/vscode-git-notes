# TODO List

- [ ] Have the `settings.ts` log the results found.

Example

```typescript
public get confirmPushAndFetchCommands(): boolean {
  const config = this._config.get('confirmPushAndFetchCommands', true);
  this.logger.debug(`GitNotesSettings get confirmPushAndFetchCommands called returned: ${config}`);
  return config;
 }
```

- [x] Some links to open commits are different e.g github use `commit` and bitbucket use `commits` in the url linked to commit info
  - [x] [#28](https://github.com/jrosco/vscode-git-notes/pull/28) Have a way to use different urls for different SCM provider like Bitbucket.
- [ ] Check the `confirmPushAndFetchCommands` setting is working correctly.
- [ ] Do proper `edit` and `append` git commands, currently to `edit` or `append` a note, I'm using `git notes add --force [commitSha]` (seems to be the same results)
- [ ] Add a Collapse / Expand HTML tag to the WebView for notes.
- [ ] Add some search functionality.
- [ ] Add empty commits messages with a note message attached.
- [ ] If no `refs/notes/commits` file exist, have a command to create one locally.
- [ ] Add options for the git command, ssh, `git` binary location etc

Example

```typescript
const gitOptions: SimpleGitOptions = {
  baseDir: '/Users/Test/fresh-notes', // Change this to the path of the directory where you want to initialize the repository
  binary: 'git',
  maxConcurrentProcesses: 6,
  trimmed: true,
  config: ['core.sshCommand=/usr/bin/ssh -i ~/.ssh/id_rsa_git_note_test'], // Change this to the path of your private SSH key
};
```
