# GitHub Setup Instructions

## 📝 Steps to Push to GitHub

### 1. Create a New Repository on GitHub

1. Go to [GitHub](https://github.com)
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in the details:
   - **Repository name**: `hrms-portal` (or any name you prefer)
   - **Description**: "Comprehensive HRMS Portal with Attendance, Leave, and Employee Management"
   - **Visibility**: Choose **Private** (recommended) or **Public**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

### 2. Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/hrms-portal.git

# Verify the remote was added
git remote -v

# Push your code to GitHub
git push -u origin master
```

**Replace `YOUR_USERNAME`** with your actual GitHub username.

### 3. Alternative: Using GitHub Desktop

If you prefer a GUI:

1. Download and install [GitHub Desktop](https://desktop.github.com/)
2. Open GitHub Desktop
3. Click **File** → **Add Local Repository**
4. Browse to `C:\Users\JMGroup\Downloads\AG\hrmsgit`
5. Click **Publish repository**
6. Choose repository name and visibility
7. Click **Publish**

## 🔐 Authentication

### Option A: Personal Access Token (Recommended)

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name: "HRMS Portal"
4. Select scopes: `repo` (full control of private repositories)
5. Click **Generate token**
6. **COPY THE TOKEN** (you won't see it again!)
7. When pushing, use:
   - Username: Your GitHub username
   - Password: The token you just copied

### Option B: SSH Key

1. Generate SSH key:

   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. Add to SSH agent:

   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

3. Copy public key:

   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

4. Add to GitHub: **Settings** → **SSH and GPG keys** → **New SSH key**
5. Use SSH URL instead:

   ```bash
   git remote add origin git@github.com:YOUR_USERNAME/hrms-portal.git
   ```

## 📋 Common Git Commands

### Daily Workflow

```bash
# Check status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push

# Pull latest changes
git pull
```

### Branch Management

```bash
# Create new branch
git checkout -b feature/new-feature

# Switch to branch
git checkout branch-name

# List all branches
git branch -a

# Merge branch to master
git checkout master
git merge feature/new-feature

# Delete branch
git branch -d feature/new-feature
```

### Undo Changes

```bash
# Discard changes in working directory
git checkout -- filename

# Unstage file
git reset HEAD filename

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

## 🚀 Deployment Workflow

### Recommended Git Flow

```
master (production)
  ↓
develop (staging)
  ↓
feature/xyz (development)
```

### Example Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-new-report

# 2. Make changes and commit
git add .
git commit -m "Add employee performance report"

# 3. Push feature branch
git push -u origin feature/add-new-report

# 4. Create Pull Request on GitHub
# (Review and merge via GitHub UI)

# 5. After merge, update local master
git checkout master
git pull origin master

# 6. Delete feature branch
git branch -d feature/add-new-report
git push origin --delete feature/add-new-report
```

## 📦 .gitignore Already Configured

The following files/folders are already excluded:

- `node_modules/` - Dependencies
- `dist/` - Build output
- `.env*` - Environment variables
- `.firebase/` - Firebase cache
- `*.log` - Log files

## 🔒 Security Checklist

Before pushing to GitHub, ensure:

- [ ] No API keys in code
- [ ] No passwords in code
- [ ] No SharePoint credentials hardcoded
- [ ] `.env` files are in `.gitignore`
- [ ] `firebase.json` doesn't contain sensitive data
- [ ] Azure AD client secrets are not committed

## 📝 Commit Message Guidelines

Use clear, descriptive commit messages:

```bash
# Good examples
git commit -m "Add Excel export feature to attendance reports"
git commit -m "Fix check-out button not appearing after 4 hours"
git commit -m "Update README with installation instructions"

# Bad examples
git commit -m "fix"
git commit -m "changes"
git commit -m "update"
```

### Conventional Commits (Optional)

```bash
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting)
refactor: Code refactoring
test: Add tests
chore: Maintenance tasks
```

## 🌐 Repository Settings (After Push)

### Recommended Settings

1. **Branch Protection** (Settings → Branches):
   - Protect `master` branch
   - Require pull request reviews
   - Require status checks to pass

2. **Collaborators** (Settings → Collaborators):
   - Add team members
   - Set appropriate permissions

3. **GitHub Actions** (Optional):
   - Set up CI/CD for automatic deployment
   - Run tests on pull requests

## 🆘 Troubleshooting

### Issue: "Permission denied (publickey)"

**Solution**: Set up SSH key or use HTTPS with Personal Access Token

### Issue: "Repository not found"

**Solution**: Check repository URL and your access permissions

### Issue: "Failed to push some refs"

**Solution**: Pull latest changes first:

```bash
git pull origin master --rebase
git push origin master
```

### Issue: Large files rejected

**Solution**: Use Git LFS for files >100MB:

```bash
git lfs install
git lfs track "*.psd"
git add .gitattributes
```

## 📞 Next Steps

1. ✅ Repository is initialized
2. ✅ Initial commit is created
3. ⏳ Create GitHub repository
4. ⏳ Add remote origin
5. ⏳ Push to GitHub
6. ⏳ Invite collaborators
7. ⏳ Set up branch protection

---

**Your repository is ready to be pushed to GitHub!** 🎉

Follow the steps above to complete the setup.
