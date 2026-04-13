DOWNLOAD_DIR := $(HOME)/Downloads/TukacoPic-builds
REPO := $(shell gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

.PHONY: ci-status ci-download ci-logs ci-watch

## Show recent CI runs
ci-status:
	@echo "Recent CI runs for $(REPO):"
	@echo ""
	@gh run list --limit 10 --json status,conclusion,name,headBranch,createdAt,databaseId \
		--template '{{range .}}{{if eq .conclusion "success"}}✅{{else if eq .conclusion "failure"}}❌{{else if eq .status "in_progress"}}🔄{{else}}⏳{{end}} {{.name}} ({{.headBranch}}) — {{.conclusion}}{{if not .conclusion}}{{.status}}{{end}} — {{timeago .createdAt}} — ID: {{.databaseId}}{{"\n"}}{{end}}'

## Download artifacts from the latest successful build
ci-download:
	@mkdir -p "$(DOWNLOAD_DIR)"
	@echo "Finding latest successful Build iOS run..."
	@RUN_ID=$$(gh run list --workflow build-ios.yml --status success --limit 1 --json databaseId -q '.[0].databaseId'); \
	if [ -z "$$RUN_ID" ]; then \
		echo "No successful builds found."; \
		exit 1; \
	fi; \
	echo "Downloading artifacts from run $$RUN_ID to $(DOWNLOAD_DIR)/..."; \
	gh run download $$RUN_ID --dir "$(DOWNLOAD_DIR)"; \
	echo ""; \
	echo "Downloaded:"; \
	find "$(DOWNLOAD_DIR)" -type f -name "*.ipa" -o -name "*.zip" | sort; \
	echo ""; \
	echo "IPA path: $(DOWNLOAD_DIR)/TukacoPic-ipa/TukacoPic.ipa"

## Show logs from the latest CI run
ci-logs:
	@RUN_ID=$$(gh run list --workflow build-ios.yml --limit 1 --json databaseId -q '.[0].databaseId'); \
	gh run view $$RUN_ID --log-failed 2>/dev/null || gh run view $$RUN_ID --log | tail -80

## Watch a running build
ci-watch:
	@RUN_ID=$$(gh run list --workflow build-ios.yml --status in_progress --limit 1 --json databaseId -q '.[0].databaseId'); \
	if [ -z "$$RUN_ID" ]; then \
		echo "No builds currently in progress."; \
		gh run list --workflow build-ios.yml --limit 3; \
	else \
		gh run watch $$RUN_ID; \
	fi
