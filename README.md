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
## Running in CircleCI
Assuming you have suitable `GITHUB_[USER|PASSWORD]` environment variables set, the following bash script will run check only lines changed in the pr that CI is running in.
```bash
if [ -z "$CIRCLE_PULL_REQUEST" ]; then
    echo "Not in a Pull Request, skipping incremental-tsc check"
    exit 0
fi

BASE_URL=https://github.com/<owner>/<repo>/pull/
PR_NUM=${CIRCLE_PULL_REQUEST:${#BASE_URL}}
URL="https://api.github.com/repos/<owner>/<repo>/pulls/${PR_NUM}/files"
./node_modules/.bin/incremental-tsc --changed-lines-only "$URL"
```
