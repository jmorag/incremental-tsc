# incremental-tsc
A small script to run `tsc` on a subset of project files, while respecting other settings from `tsconfig.json` and `tsconfig.paths.json`

```
Usage:

incremental-tsc src/components/*.tsx
```

As of v0.0.4, you can also pass a URL to the github API enpoint for a specific pull request and run the typechecker only on files changed in that PR. Use the flag `--changed-lines-only` to only report errors on lines touched by the PR. If the environment variables `GITHUB_USER` and `GITHUB_PASSWORD` are set, they will be used to authenticate the request.

```
incremental-tsc https://api.github.com/repos/<username>/<repo>/pulls/<prnum>/files --changed-lines-only
```
