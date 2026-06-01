export const description = `Searches the project tree using a glob pattern and returns matching file and directory paths.

pattern: glob pattern to match against, e.g. "**/*.ts", "src/**/*", "*.json"
path: optional root directory to search from, defaults to the current working directory

Automatically excludes node_modules, .git, dist, .next, and build directories. Returns up to 200 results. If more matches exist, truncated is true.

Returns relative paths from the search root.`;
