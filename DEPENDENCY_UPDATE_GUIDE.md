# Dependency Update Guide

Guide untuk menangani 5 dependency updates yang pending dari Dependabot.

---

## 📋 Overview

**Status**: 5 Pull Requests terbuka dari Dependabot  
**Priority**: High - Keep dependencies up to date untuk security dan bug fixes

### Pending Updates

| Package | Current | Target | Type | Risk | Priority |
|---------|---------|--------|------|------|----------|
| react-dom | 19.2.0 | 19.2.6 | Patch | ✅ Low | High |
| react-hook-form | 7.67.0 | 7.75.0 | Minor | ✅ Low | High |
| tailwind-merge | 3.4.0 | 3.5.0 | Minor | ✅ Low | High |
| recharts | 2.15.4 | 3.8.1 | Major | ⚠️ Medium | Medium |
| @octokit/core | 6.1.6 | 7.0.6 | Major | ⚠️ Medium | Low |

---

## ✅ Safe Updates (Do First)

These updates are backward compatible and safe to merge immediately.

### 1. react-dom (19.2.0 → 19.2.6)

**Type**: Patch version  
**Risk**: ✅ Very Low  
**Changes**: Bug fixes only, no breaking changes

#### Update Command
```bash
npm update react-dom@19.2.6
```

#### Verification Steps
1. Run build: `npm run build`
2. Check for console errors in dev mode
3. Test basic app functionality
4. Verify wallet connection works
5. Test agent spawning and event attendance

#### Expected Behavior
- No breaking changes
- Improved stability
- Better error handling in React 19

#### Rollback if Needed
```bash
npm install react-dom@19.2.0
```

---

### 2. react-hook-form (7.67.0 → 7.75.0)

**Type**: Minor version  
**Risk**: ✅ Low  
**Changes**: New features, bug fixes, backward compatible

#### Where Used in MAEF
- `SpawnAgentDialog.tsx` - Agent creation form
- `AgentConfigDialog.tsx` - Agent configuration
- Various forms throughout the app

#### Update Command
```bash
npm update react-hook-form@7.75.0
```

#### Verification Steps
1. Test agent spawning form
2. Test agent configuration dialog
3. Verify form validation works
4. Check error messages display correctly
5. Test form submission

#### What's New (7.67 → 7.75)
- Performance improvements
- Better TypeScript support
- Bug fixes for edge cases
- Enhanced validation features

#### Rollback if Needed
```bash
npm install react-hook-form@7.67.0
```

---

### 3. tailwind-merge (3.4.0 → 3.5.0)

**Type**: Minor version  
**Risk**: ✅ Very Low  
**Changes**: Enhanced class merging, bug fixes

#### Where Used in MAEF
- Used everywhere via `cn()` utility function in `/src/lib/utils.ts`
- Merges Tailwind classes throughout components

#### Update Command
```bash
npm update tailwind-merge@3.5.0
```

#### Verification Steps
1. Check component styling looks correct
2. Verify no class conflicts
3. Test responsive design
4. Check hover/focus states
5. Verify dark mode (if implemented)

#### What's New (3.4 → 3.5)
- Better handling of arbitrary values
- Improved performance
- Bug fixes for edge cases

#### Rollback if Needed
```bash
npm install tailwind-merge@3.4.0
```

---

## ⚠️ Updates Requiring Testing (Do After Safe Updates)

These are major version updates that may contain breaking changes.

### 4. recharts (2.15.4 → 3.8.1)

**Type**: Major version (2.x → 3.x)  
**Risk**: ⚠️ Medium  
**Changes**: Breaking changes likely, API changes

#### Where Used in MAEF
- `AnalyticsCharts.tsx` - Main usage
- Dashboard analytics tab
- Event statistics visualization
- Agent performance charts

#### ⚠️ Breaking Changes in v3

Review the [Recharts v3 Migration Guide](https://recharts.org/en-US/migration):

1. **API Changes**
   - Some prop names may have changed
   - Chart configuration structure updated
   - Type definitions improved

2. **Dependencies Updated**
   - React 18+ required (MAEF uses React 19 ✅)
   - D3 updated to latest version

3. **Removed Features**
   - Some deprecated props removed
   - Check for any console warnings in v2

#### Update Command
```bash
npm install recharts@3.8.1
```

#### Testing Checklist

Before Update:
- [ ] Screenshot current analytics dashboard
- [ ] Note any custom configurations
- [ ] List all chart types used

After Update:
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] Analytics tab loads without errors
- [ ] All charts render correctly
  - [ ] Line charts (event trends)
  - [ ] Bar charts (agent performance)
  - [ ] Pie charts (platform distribution)
- [ ] Tooltips work
- [ ] Legends display correctly
- [ ] Responsive behavior maintained
- [ ] Hover effects work
- [ ] Data updates properly

#### Known Issues & Solutions

**Issue**: Chart not rendering
```typescript
// Old (v2)
<LineChart data={data}>
  <XAxis dataKey="name" />
</LineChart>

// New (v3) - may need adjustments
<LineChart data={data}>
  <XAxis dataKey="name" type="category" />
</LineChart>
```

**Issue**: TypeScript errors
```bash
# Update TypeScript types
npm install --save-dev @types/recharts@latest
```

#### Rollback Plan
```bash
npm install recharts@2.15.4
git checkout src/components/AnalyticsCharts.tsx  # if modified
```

#### Alternative Approach
If issues arise, consider:
1. Stay on v2 for now
2. Plan dedicated migration sprint
3. Test in isolated branch first

---

### 5. @octokit/core (6.1.6 → 7.0.6)

**Type**: Major version (6.x → 7.x)  
**Risk**: ⚠️ Medium  
**Priority**: Low (may not be directly used)

#### Where Used in MAEF
Check if actually used:
```bash
grep -r "@octokit/core" src/
```

If not found in `src/`, it may be:
- Transitive dependency (pulled by another package)
- Development dependency only
- Not actually used in application code

#### Investigation Steps

1. **Check Direct Usage**
   ```bash
   # Search for octokit imports
   grep -r "from '@octokit/core'" src/
   grep -r "require('@octokit/core')" src/
   ```

2. **Check Why It's Installed**
   ```bash
   npm ls @octokit/core
   ```

3. **Review Breaking Changes**
   - Visit [Octokit v7 Release Notes](https://github.com/octokit/core.js/releases)
   - Check for API changes

#### Update Command (If Needed)
```bash
npm install @octokit/core@7.0.6
```

#### Testing (If Used)
- [ ] GitHub API calls work
- [ ] Authentication functions
- [ ] No breaking changes affect code
- [ ] TypeScript types are correct

#### Rollback if Needed
```bash
npm install @octokit/core@6.1.6
```

#### Recommendation
- If not used in `src/`, update is likely safe
- If used, test GitHub integration thoroughly
- May be dependency of `octokit` package (v4.1.2)

---

## 🎯 Recommended Update Strategy

### Phase 1: Safe Updates (Today - 30 mins)

```bash
# Update safe dependencies
npm update react-dom@19.2.6
npm update react-hook-form@7.75.0
npm update tailwind-merge@3.5.0

# Verify
npm run build
npm run lint

# Test in browser
npm run dev
# Test: spawn agent, attend event, check analytics, mint NFT

# Commit if all good
git add package.json package-lock.json
git commit -m "chore(deps): update react-dom, react-hook-form, and tailwind-merge

Update to latest patch and minor versions for bug fixes and improvements:
- react-dom: 19.2.0 → 19.2.6 (patch)
- react-hook-form: 7.67.0 → 7.75.0 (minor)
- tailwind-merge: 3.4.0 → 3.5.0 (minor)

All updates tested and verified working correctly."
```

### Phase 2: Recharts Update (This Week - 2 hours)

```bash
# Create test branch
git checkout -b update-recharts

# Update recharts
npm install recharts@3.8.1

# Test thoroughly
npm run build
npm run dev

# Test analytics dashboard extensively
# - All chart types render
# - Data updates work
# - Responsive design intact
# - No console errors

# If successful, commit and merge
git add package.json package-lock.json src/
git commit -m "chore(deps): update recharts to v3.8.1

Major version update from 2.15.4 to 3.8.1. Updated chart
configurations to match v3 API. All analytics features tested
and working correctly."

git checkout main
git merge update-recharts

# If issues found, abandon branch
git checkout main
git branch -D update-recharts
```

### Phase 3: Octokit Investigation (Optional - 30 mins)

```bash
# Check if actually used
npm ls @octokit/core
grep -r "@octokit/core" src/

# If not directly used, safe to update
npm update @octokit/core

# Commit
git add package.json package-lock.json
git commit -m "chore(deps): update @octokit/core to v7.0.6

Transitive dependency update. Not directly used in application code.
Update is safe and provides security improvements."
```

---

## 📊 Post-Update Verification

After all updates, run complete test suite:

### Automated Checks
```bash
# Build
npm run build

# Lint
npm run lint

# Tests (if available)
npm test
```

### Manual Testing Checklist

#### Core Functionality
- [ ] App loads without errors
- [ ] Wallet connection works
- [ ] Agent spawning successful
- [ ] Event attendance workflow complete
- [ ] NFT minting works
- [ ] Analytics dashboard displays correctly

#### UI/UX
- [ ] No visual regressions
- [ ] Animations work smoothly
- [ ] Forms validate correctly
- [ ] Toasts appear properly
- [ ] Responsive design intact

#### Performance
- [ ] Page load time acceptable
- [ ] No console errors/warnings
- [ ] Memory usage normal
- [ ] Smooth scrolling and interactions

---

## 🔄 Merge Dependabot PRs

After testing locally, you can merge the Dependabot PRs on GitHub:

1. **For Safe Updates** (react-dom, react-hook-form, tailwind-merge):
   - Review PR on GitHub
   - Click "Merge pull request"
   - Delete branch after merge

2. **For Major Updates** (recharts, @octokit/core):
   - Test locally first in separate branch
   - If successful, merge Dependabot PR
   - If issues, close PR and add comment explaining why

---

## 🚨 Troubleshooting

### Issue: Build Fails After Update

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: TypeScript Errors

```bash
# Update TypeScript types
npm update @types/react @types/react-dom
npm install --save-dev @types/<package-name>@latest
```

### Issue: Runtime Errors

1. Check browser console for errors
2. Review package changelog for breaking changes
3. Search for error message in package's GitHub issues
4. Rollback if necessary

### Issue: Conflicts with Other Packages

```bash
# Check for peer dependency conflicts
npm ls
npm ls <package-name>

# Update peer dependencies if needed
npm update
```

---

## 📝 Update Log Template

Keep track of updates in project notes:

```markdown
## Dependency Updates - [Date]

### Updated Packages
- react-dom: 19.2.0 → 19.2.6 ✅
- react-hook-form: 7.67.0 → 7.75.0 ✅
- tailwind-merge: 3.4.0 → 3.5.0 ✅
- recharts: 2.15.4 → 3.8.1 ⏳ (testing)
- @octokit/core: 6.1.6 → 7.0.6 ⏹️ (not needed)

### Testing Results
- All unit tests passed
- Manual testing completed
- No regressions found
- Performance metrics stable

### Issues Encountered
- None

### Next Steps
- Monitor production for issues
- Schedule next dependency update review
```

---

## 🎯 Summary

**Safe to Update Now** (30 mins):
- ✅ react-dom
- ✅ react-hook-form
- ✅ tailwind-merge

**Test Before Update** (2 hours):
- ⚠️ recharts (breaking changes)

**Investigate First** (30 mins):
- 🔍 @octokit/core (check if used)

**Total Time Estimate**: 3 hours for complete update cycle

---

## 📚 Resources

- [Semantic Versioning](https://semver.org/)
- [React 19 Changelog](https://react.dev/blog)
- [Recharts Documentation](https://recharts.org/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
