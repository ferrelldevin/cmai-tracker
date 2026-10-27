# CMAI browser checks

RESULT: FAIL

- Commit: f62fbdc Merge pull request #20 from ferrelldevin/claude/checks-add-axe
- Branch: main
- Ran at: 2026-10-27T18:23:54.361Z
- Node v24.19.0 on win32

## Setup

```
Install dependencies failed:
npm error syscall unlink
npm error path C:\Users\Devin\gh-cmai-tracker\node_modules\@esbuild\win32-x64\esbuild.exe
npm error errno -4048
npm error [Error: EPERM: operation not permitted, unlink 'C:\Users\Devin\gh-cmai-tracker\node_modules\@esbuild\win32-x64\esbuild.exe'] {
npm error   errno: -4048,
npm error   code: 'EPERM',
npm error   syscall: 'unlink',
npm error   path: 'C:\\Users\\Devin\\gh-cmai-tracker\\node_modules\\@esbuild\\win32-x64\\esbuild.exe'
npm error }
npm error
npm error The operation was rejected by your operating system.
npm error It's possible that the file was already in use (by a text editor or antivirus), or that you lack permissions to access it.
npm error
npm error If you believe this might be a permissions issue, please double-check the permissions of the file and its containing directories, or try running the command again as root/Administrator.
npm error A complete log of this run can be found in: C:\Users\Devin\AppData\Local\npm-cache\_logs\2026-10-27T18_23_51_932Z-debug-0.log
```

Written by scripts/run-checks.mjs. Screenshots stay on the machine that ran it.
