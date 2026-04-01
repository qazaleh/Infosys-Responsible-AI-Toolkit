# Git Handbook (Simple & Practical)

This handbook gives you a clear path to learn the most common Git workflows:

- Branches
- Commits
- Push
- Pull
- Fetch
- Merge conflicts: why they happen, when they happen, and how to fix them

---

## 1) What Git is (in one minute)

Git is a version control system:

- It tracks changes to files over time.
- You can create safe workspaces (`branches`) for features/fixes.
- You can collaborate with others through a remote repository (like GitHub).

Think of Git as a timeline + collaboration tool for code.

---

## 2) Core concepts you should know first

- **Repository (repo)**: Your project folder managed by Git.
- **Commit**: A saved snapshot of your changes.
- **Branch**: A separate line of work.
- **Remote**: The online copy of your repo (e.g., `origin` on GitHub).
- **Working directory**: Your current files.
- **Staging area**: Where you prepare changes before committing.

---

## 3) Most common commands (quick sheet)

```bash
git status                 # See current state
git add <file>             # Stage one file
git add .                  # Stage all changes
git commit -m "message"    # Save snapshot
git branch                 # List branches
git switch <branch>        # Move to a branch
git switch -c <new-branch> # Create + switch to branch
git fetch origin           # Download remote updates (no merge)
git pull origin main       # Fetch + merge remote branch
git push origin <branch>   # Upload local commits to remote
```

---

## 4) Branches: why and how

### Why use branches?

Branches let you work safely without breaking main code.

Typical pattern:

- `main`: stable code
- `feature/login-page`: your new work

### Branch workflow

```bash
git switch main
git pull origin main
git switch -c feature/login-page
```

Now code in `feature/login-page` independently.

---

## 5) Commits: make clean history

### Good commit habits

- Commit small logical changes.
- Write clear messages:
  - Good: `Add login form validation`
  - Bad: `changes` or `fix stuff`

### Commit example

```bash
git status
git add src/login.js
git commit -m "Add email format validation to login form"
```

---

## 6) Push: send your commits to remote

After committing locally, push your branch:

```bash
git push -u origin feature/login-page
```

- `-u` links your local branch to the remote branch (first push only).
- Next pushes can be just `git push`.

---

## 7) Fetch vs Pull (very important)

### `git fetch`

- Downloads latest changes from remote
- **Does not** change your current files automatically
- Safe for checking updates first

```bash
git fetch origin
git log --oneline --graph --all --decorate
```

### `git pull`

- Equivalent to: **fetch + merge** (or rebase, depending config)
- Updates your current branch immediately

```bash
git pull origin main
```

### Rule of thumb

- Use **fetch** when you want control/inspection first.
- Use **pull** when you want quick sync.

---

## 8) Simple full workflow example

Scenario: you add a profile page.

```bash
# Start from updated main
git switch main
git pull origin main

# Create feature branch
git switch -c feature/profile-page

# Edit files...
git add src/profile.js src/profile.css
git commit -m "Create profile page layout"

# Continue work...
git add src/profile.js
git commit -m "Add avatar upload validation"

# Push branch to GitHub
git push -u origin feature/profile-page
```

Then open a Pull Request from `feature/profile-page` to `main`.

---

## 9) Conflicts: when, why, and how to fix

## When conflicts happen

Conflicts happen when Git cannot automatically combine changes.
Most common case:

- You changed a line in file `X`
- Someone else changed the same line in `main`
- You try to merge/pull/rebase

## Why conflicts happen

Git merges text changes line-by-line.
If both sides changed the same location differently, Git needs human decision.

## Conflict markers you will see

```text
<<<<<<< HEAD
const apiUrl = "http://localhost:3000";
=======
const apiUrl = "https://api.example.com";
>>>>>>> main
```

- Top block (`HEAD`) = your current branch version
- Bottom block (`main`) = incoming branch version

## How to fix conflicts (step-by-step)

1. Open conflicted files.
2. Decide final correct code (yours, theirs, or combine both).
3. Remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
4. Stage resolved files.
5. Complete merge with commit.

Commands:

```bash
git status                     # shows conflicted files
# edit files to resolve conflicts
git add <resolved-file>
git commit                     # completes merge
```

If conflict happens during `pull`, same resolution process applies.

---

## 10) Conflict resolution example (simple)

You are on `feature/login`.

### Your code

```js
const timeout = 3000;
```

### `main` code

```js
const timeout = 5000;
```

You run:

```bash
git pull origin main
```

Git reports conflict.

You decide final value should be `4000`:

```js
const timeout = 4000;
```

Then finish:

```bash
git add src/config.js
git commit -m "Resolve timeout conflict with main"
```

---

## 11) Useful safety tips

- Run `git status` often.
- Pull/fetch before starting new work.
- Keep branches short-lived and focused.
- Commit frequently with clear messages.
- Resolve conflicts immediately (don’t postpone too long).

---

## 12) Beginner command sequence (copy/paste)

```bash
git switch main
git pull origin main
git switch -c feature/my-task

# edit files
git add .
git commit -m "Implement my task"
git push -u origin feature/my-task
```

Later update your branch:

```bash
git fetch origin
git merge origin/main
```

(or use `git pull origin main` if your team prefers pull directly)

---

## 13) Final mental model

- **Branch** = workspace
- **Commit** = save point
- **Push** = publish your commits
- **Fetch** = check/download remote updates safely
- **Pull** = update branch quickly (fetch + merge)
- **Conflict** = Git asks you to decide between overlapping edits

If you understand these six points, you can handle most daily Git work confidently.
