# Authorized Security Review Scope

## Authorized assets

The assessment covers the source code, Git history available in this local checkout, dependency manifests and lockfiles, repository-contained configuration, and local build/test execution for `defiventurers/articweb3` at commit `6002e6c`. It also covers passive review of the deployment configuration committed to the repository.

## Dynamic testing boundary

Dynamic verification is limited to local development tooling and existing automated tests using synthetic data. No direct production probing, account testing, high-volume scanning, third-party interaction, or mutation of hosted configuration is authorized in this pass.

## Safety limits

The review must not access real user data, secrets, private keys, tokens, payment data, or non-synthetic accounts. It must not use social engineering, password guessing, credential stuffing, denial-of-service activity, destructive payloads, data exfiltration, or irreversible actions. Any sensitive value encountered must be redacted from findings and reports.

## Product constraints

Security fixes must preserve the verified heritage-game rules, board topology, existing practice/local/drill/online/How-to-Play modes, source-native game roles, and the Arctic Dominion shell. Remediation remains on a feature branch until validated; any production deployment or configuration change is a separate action after the local assessment is complete.
