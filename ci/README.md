# Not active yet: pushing anything under .github/workflows/ needs a gh token with the
# `workflow` scope (run: gh auth refresh -h github.com -s workflow). Once that is granted,
# move this back to .github/workflows/deploy.yml and switch Pages to "GitHub Actions".
# Until then .githooks/pre-push publishes on every push of main.
