import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { LoggerService } from '../log/service';
import { GitNotesSettings } from '../settings';
import { RepositoryManager } from "../interface";

export class GitCommandsInstance {
  public repositoryPath: string;
  public git: SimpleGit;
  public logger: LoggerService;
  public settings: GitNotesSettings;
  public manager: RepositoryManager;

  constructor() {
    this.git = simpleGit();
    this.settings = new GitNotesSettings();
    this.logger = LoggerService.getInstance(this.settings.logLevel);
    this.repositoryPath = "";
    this.manager = RepositoryManager.getInstance();

    this.logger.debug(
      `GitCommands constructor: ${Object.getOwnPropertyNames(this)}`
    );
  }

  public setRepositoryPath(repositoryPath: string): void {
    this.logger.debug(`setRepositoryPath(${repositoryPath})`);
    this.repositoryPath = repositoryPath;

    const gitOptions: SimpleGitOptions = {
      baseDir: repositoryPath, // Change this to the path of the directory where you want to initialize the repository
      binary: "git",
      maxConcurrentProcesses: 6,
      trimmed: true,
      config: [],
    };

    try {
      this.git = simpleGit(gitOptions);
      this.logger.debug(`this.git: ${Object.getOwnPropertyNames(this.git)}`);
    } catch (error) {
      this.logger.error(`error setting repositoryPath: ${error}`);
    }
  }

  public getRepositoryPath() {
    this.logger.debug(`getRepositoryPath() return: ${this.repositoryPath}`);
    return this.repositoryPath;
  }
}