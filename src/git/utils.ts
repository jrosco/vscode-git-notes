import { GitNotesSettings } from "../settings";
import { LoggerService } from "../log/service";

export class GitUtils {
  private settings: GitNotesSettings;
  private gitUrlSCMProvider: string[];
  private logger: LoggerService;

  constructor() {
    this.settings = new GitNotesSettings();
    this.gitUrlSCMProvider = this.settings.gitUrlSCMProvider;
    this.logger = LoggerService.getInstance(this.settings.logLevel);
  }

  public convertGitUrlSCMProvider(
    gitUrl: string,
    commitHash: string
  ): string | undefined {
    this.logger.info(
      `GitNotes: convertGitUrlSCMProvider called with ${gitUrl} and commitHash ${commitHash}`
    );
    for (const gitSCMProvider of this.gitUrlSCMProvider) {
      this.logger.debug(`GitNotes: gitUrlSCMProvider is ${gitSCMProvider}`);
      // Extract the parts of the URL
      const parsedUrl = new URL(gitUrl);
      const protocol = parsedUrl.protocol;
      const domain = parsedUrl.hostname;
      const pathname = parsedUrl.pathname;
      // Extract slash(/) paths from pathname
      const pathParts = pathname.split("/").filter((part) => part !== ""); // Split pathname and remove empty parts
      // Check for a match between gitUrl and gitUrlSCMProvider entries
      const getMatch = gitSCMProvider.includes(domain);
      const isValidCommitHash =
        commitHash !== undefined && commitHash.trim() !== "";
      // Check if the gitUrlSCMProvider is in the gitUrl
      if (getMatch && isValidCommitHash) {
        this.logger.debug(`GitNotes: ${gitUrl} is supported`);
        // Define a regular expression to match values inside curly brackets
        const regex = /\{([^{}]+)\}/g;
        // Initialize an array to store the names and index numbers of placeholders
        const placeholders: {
          position: number;
          name: string;
          placeholder: string;
        }[] = [];
        let match;
        let index = 0;
        while ((match = regex.exec(gitSCMProvider)) !== null) {
          const [fullMatch, name] = match; // fullMatch is the full matched string, name is the value inside curly brackets
          // Ignore the commitId placeholder
          if (name !== "commitId") {
            placeholders.push({
              position: index,
              name: name,
              placeholder: fullMatch,
            });
            index++;
          }
        }
        // handle path# placeholders
        const regexPaths = /{path\d+}/g;
        const pathMatch = gitSCMProvider.match(regexPaths);
        let gitCommitUrl = gitSCMProvider;
        for (const path of pathMatch ?? []) {
          const index = placeholders.findIndex(
            (placeholder) => placeholder.placeholder === path
          );
          const position = placeholders[index].position;
          gitCommitUrl = gitCommitUrl.replace(path, pathParts[position]);
        }
        const fullGitCommitUrl = `${protocol}//${gitCommitUrl
          .replace("{commitId}", commitHash)
          .replace(/\/\//g, "/")}`;
        // Return the new URL
        if (fullGitCommitUrl) {
          this.logger.debug(`GitNotes: gitCommitUrl is ${fullGitCommitUrl}`);
          return fullGitCommitUrl;
        }
      }
    }
    this.logger.debug(
      `GitNotes: ${gitUrl} is not supported returning default URL`
    );
    return `${gitUrl}/commit/${commitHash}`;
  }

  // Getters
  public get getGitUrlSCMProvider() {
    return this.gitUrlSCMProvider;
  }
}
