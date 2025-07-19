#!/bin/bash
set -euo pipefail

# =============================================================================
# VyapaarMitra Version Bump Script
# Automatically bumps version based on commit messages or manual input
# =============================================================================

# Configuration
VERSION_FILE="package.json"
HELM_CHART_FILE="infra/k8s/helm-chart/Chart.yaml"
DEFAULT_BUMP="patch"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
VyapaarMitra Version Bump Script

Usage: $0 [OPTIONS] [BUMP_TYPE]

OPTIONS:
    -h, --help          Show this help message
    -f, --force         Force version bump even if no changes detected
    -d, --dry-run       Show what would be done without making changes
    -t, --tag           Create and push git tag after version bump
    -p, --push          Push changes to remote repository
    -r, --release       Create GitHub release after tagging

BUMP_TYPE:
    major               Bump major version (X.0.0)
    minor               Bump minor version (x.Y.0)
    patch               Bump patch version (x.y.Z) [default]
    auto                Auto-detect bump type from commit messages

EXAMPLES:
    $0 patch            # Bump patch version manually
    $0 auto --tag       # Auto-detect version bump and create tag
    $0 major --release  # Bump major version and create GitHub release
    $0 --dry-run        # Show what would be done

EOF
}

# Parse command line arguments
BUMP_TYPE="${DEFAULT_BUMP}"
FORCE=false
DRY_RUN=false
CREATE_TAG=false
PUSH_CHANGES=false
CREATE_RELEASE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -t|--tag)
            CREATE_TAG=true
            shift
            ;;
        -p|--push)
            PUSH_CHANGES=true
            shift
            ;;
        -r|--release)
            CREATE_RELEASE=true
            CREATE_TAG=true
            PUSH_CHANGES=true
            shift
            ;;
        major|minor|patch|auto)
            BUMP_TYPE=$1
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Function to get current version
get_current_version() {
    if [[ -f "$VERSION_FILE" ]]; then
        if command -v jq >/dev/null 2>&1; then
            jq -r '.version' "$VERSION_FILE" 2>/dev/null || echo "0.0.0"
        else
            grep '"version"' "$VERSION_FILE" | sed 's/.*"version": "\([^"]*\)".*/\1/' || echo "0.0.0"
        fi
    else
        echo "0.0.0"
    fi
}

# Function to parse version components
parse_version() {
    local version=$1
    echo "$version" | sed 's/^v//' | tr '.' ' '
}

# Function to increment version
increment_version() {
    local current_version=$1
    local bump_type=$2
    
    read -r major minor patch <<< "$(parse_version "$current_version")"
    
    case $bump_type in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
        *)
            log_error "Invalid bump type: $bump_type"
            exit 1
            ;;
    esac
    
    echo "${major}.${minor}.${patch}"
}

# Function to detect bump type from commit messages
detect_bump_type() {
    local commits
    local bump_type="patch"
    
    # Get commits since last tag
    local last_tag
    last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    
    if [[ -n "$last_tag" ]]; then
        commits=$(git log "${last_tag}..HEAD" --oneline --no-merges 2>/dev/null || echo "")
    else
        commits=$(git log --oneline --no-merges -n 10 2>/dev/null || echo "")
    fi
    
    if [[ -z "$commits" ]]; then
        log_warning "No commits found for analysis"
        echo "$bump_type"
        return
    fi
    
    log_info "Analyzing commits for version bump type..."
    
    # Check for breaking changes (major bump)
    if echo "$commits" | grep -q -E "(BREAKING CHANGE|breaking change|!:)"; then
        bump_type="major"
        log_info "Found breaking changes - suggesting major version bump"
    # Check for new features (minor bump)
    elif echo "$commits" | grep -q -E "(feat|feature)(\(.*\))?:"; then
        if [[ "$bump_type" != "major" ]]; then
            bump_type="minor"
            log_info "Found new features - suggesting minor version bump"
        fi
    # Check for bug fixes (patch bump)
    elif echo "$commits" | grep -q -E "(fix|bugfix|hotfix)(\(.*\))?:"; then
        if [[ "$bump_type" == "patch" ]]; then
            bump_type="patch"
            log_info "Found bug fixes - suggesting patch version bump"
        fi
    fi
    
    echo "$bump_type"
}

# Function to update package.json version
update_package_json() {
    local new_version=$1
    
    if [[ ! -f "$VERSION_FILE" ]]; then
        log_info "Creating package.json with version $new_version"
        cat > "$VERSION_FILE" << EOF
{
  "name": "vyapaarmitra",
  "version": "$new_version",
  "description": "VyapaarMitra MSME Platform",
  "private": true
}
EOF
    else
        if command -v jq >/dev/null 2>&1; then
            # Use jq for precise JSON manipulation
            jq ".version = \"$new_version\"" "$VERSION_FILE" > "${VERSION_FILE}.tmp" && mv "${VERSION_FILE}.tmp" "$VERSION_FILE"
        else
            # Fallback to sed
            sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$VERSION_FILE"
            rm -f "${VERSION_FILE}.bak"
        fi
    fi
}

# Function to update Helm chart version
update_helm_chart() {
    local new_version=$1
    
    if [[ -f "$HELM_CHART_FILE" ]]; then
        sed -i.bak "s/^version: .*/version: $new_version/" "$HELM_CHART_FILE"
        sed -i.bak "s/^appVersion: .*/appVersion: \"$new_version\"/" "$HELM_CHART_FILE"
        rm -f "${HELM_CHART_FILE}.bak"
        log_info "Updated Helm chart version to $new_version"
    else
        log_warning "Helm chart file not found: $HELM_CHART_FILE"
    fi
}

# Function to create git tag
create_git_tag() {
    local version=$1
    local tag_name="v$version"
    
    if git tag -l | grep -q "^$tag_name$"; then
        log_warning "Tag $tag_name already exists"
        return 1
    fi
    
    # Create annotated tag with release notes
    local tag_message="Release $tag_name

$(git log --oneline --no-merges $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD 2>/dev/null | head -10 || echo "Initial release")"
    
    git tag -a "$tag_name" -m "$tag_message"
    log_success "Created git tag: $tag_name"
    
    if [[ "$PUSH_CHANGES" == true ]]; then
        git push origin "$tag_name"
        log_success "Pushed tag to remote: $tag_name"
    fi
}

# Function to create GitHub release
create_github_release() {
    local version=$1
    local tag_name="v$version"
    
    if ! command -v gh >/dev/null 2>&1; then
        log_error "GitHub CLI (gh) is required for creating releases"
        return 1
    fi
    
    # Generate release notes
    local release_notes
    release_notes="## What's Changed

$(git log --oneline --no-merges $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD 2>/dev/null | sed 's/^/- /' || echo "- Initial release")

## Deployment

This release can be deployed using:

\`\`\`bash
helm upgrade --install vyapaarmitra ./infra/k8s/helm-chart \\
  --namespace vyapaarmitra \\
  --set image.tag=$tag_name \\
  --values infra/k8s/helm-chart/values-prod.yaml
\`\`\`

**Full Changelog**: https://github.com/\${{ github.repository }}/compare/\$(git describe --tags --abbrev=0 2>/dev/null || echo 'initial')...$tag_name"
    
    # Create release
    gh release create "$tag_name" \
        --title "VyapaarMitra $tag_name" \
        --notes "$release_notes" \
        --target main
    
    log_success "Created GitHub release: $tag_name"
}

# Function to check for uncommitted changes
check_working_directory() {
    if [[ "$FORCE" == false ]] && ! git diff-index --quiet HEAD --; then
        log_error "Working directory has uncommitted changes. Use --force to override."
        git status --porcelain
        exit 1
    fi
}

# Main function
main() {
    log_info "VyapaarMitra Version Bump Script"
    log_info "Current directory: $(pwd)"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi
    
    # Check working directory
    check_working_directory
    
    # Get current version
    local current_version
    current_version=$(get_current_version)
    log_info "Current version: $current_version"
    
    # Determine bump type
    local final_bump_type="$BUMP_TYPE"
    if [[ "$BUMP_TYPE" == "auto" ]]; then
        final_bump_type=$(detect_bump_type)
        log_info "Auto-detected bump type: $final_bump_type"
    fi
    
    # Calculate new version
    local new_version
    new_version=$(increment_version "$current_version" "$final_bump_type")
    log_info "New version: $new_version"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "=== DRY RUN - No changes will be made ==="
        log_info "Would bump version from $current_version to $new_version ($final_bump_type)"
        log_info "Would update: $VERSION_FILE"
        [[ -f "$HELM_CHART_FILE" ]] && log_info "Would update: $HELM_CHART_FILE"
        [[ "$CREATE_TAG" == true ]] && log_info "Would create git tag: v$new_version"
        [[ "$PUSH_CHANGES" == true ]] && log_info "Would push changes to remote"
        [[ "$CREATE_RELEASE" == true ]] && log_info "Would create GitHub release"
        exit 0
    fi
    
    # Update version files
    log_info "Updating version files..."
    update_package_json "$new_version"
    update_helm_chart "$new_version"
    
    # Commit changes
    git add "$VERSION_FILE"
    [[ -f "$HELM_CHART_FILE" ]] && git add "$HELM_CHART_FILE"
    git commit -m "chore: bump version to $new_version

- Bump $final_bump_type version from $current_version to $new_version
- Update package.json and Helm chart versions
- Automated version bump by CI/CD pipeline"
    
    log_success "Version bumped to $new_version and committed"
    
    # Push changes if requested
    if [[ "$PUSH_CHANGES" == true ]]; then
        git push origin "$(git branch --show-current)"
        log_success "Pushed changes to remote"
    fi
    
    # Create tag if requested
    if [[ "$CREATE_TAG" == true ]]; then
        create_git_tag "$new_version"
    fi
    
    # Create GitHub release if requested
    if [[ "$CREATE_RELEASE" == true ]]; then
        create_github_release "$new_version"
    fi
    
    log_success "Version bump completed successfully!"
    log_info "New version: $new_version"
}

# Check dependencies
command -v git >/dev/null 2>&1 || { log_error "git is required but not installed. Aborting."; exit 1; }

# Run main function
main "$@"