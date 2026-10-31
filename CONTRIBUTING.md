# Contributing

This project is small and maintained in spare time. The rules below exist so a pull request can be reviewed in one sitting.

## Before you open a pull request

- Open an issue first for anything beyond a typo.
- One change per PR. A refactor bundled with a fix is two PRs.
- Security issues never go into a public PR or issue, see [SECURITY.md](SECURITY.md).
- Fixes that also apply to the upstream plugin are welcome upstream too: [clonemeagain/attachment_preview](https://github.com/clonemeagain/attachment_preview).

## Development setup

```bash
git clone https://github.com/studio-prisma/osticket-plugin-attachment-preview.git
cd osticket-plugin-attachment-preview
npm ci              # DOMPurify (shipped) plus jsdom and jQuery (tests only)
./tools/vendor.sh   # copies DOMPurify into vendor/ (not committed)
```

Needs PHP 8.0+ with the DOM extension and Node.js 20+. For a manual test in a real helpdesk, link or copy the repository into `include/plugins/attachment-preview/` of an osTicket 1.18 test instance.

## What a change has to pass

```bash
./tests/run-all.sh
```

CI runs the same suites on every push and pull request, plus a PHP syntax check on 8.0 to 8.4 and `actionlint`. The aggregating job is called **Gate**; it is the only status check the branch ruleset requires, and it is green only when every other job is.

A red pipeline is not mergeable. If a check fails for a reason unrelated to your change, say so in the PR instead of rerunning until it passes.

Changes to the sanitizer config or to anything that writes into the page need a test in `tests/js/run.js` that would have failed before.

## Code conventions

- Match the surrounding style (4 spaces in the plugin class and script, 2 in `config.php`, as inherited from upstream).
- No new runtime dependency without a reason in the PR description. Dependencies are pinned to exact versions.
- Comments explain *why*, not *what*.
- Example hosts only from `example.com`, `example.org`, `example.test`, IPs from `192.0.2.0/24` or `203.0.113.0/24`.

## Documentation

Documentation is part of the change.

- Behaviour change → `README.md` **and** `README.de.md` in the same PR.
- Install or configuration change → `docs/INSTALL.md` **and** `docs/INSTALL.de.md`.
- New limitation → "Known limitations" in both READMEs.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), imperative, English:

```
fix(zip): pass non-HTML responses through unchanged
feat(vimeo): embed unlisted videos with their privacy hash
docs(install): name the class collision before the upgrade steps
ci: run the jsdom suite on Node 22
```

## Release process

Maintainer only.

1. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD` and add an empty `Unreleased` block above it. Update the compare links.
2. Set `'version'` in `plugin.php`. It is the only place the version is stored.
3. `git commit -m "chore(release): vX.Y.Z"` via a PR.
4. After the merge: `git tag -a vX.Y.Z -m "vX.Y.Z"` on the merge commit and `git push origin vX.Y.Z`.
5. The release workflow checks tag against manifest, runs `npm ci`, builds `dist/attachment-preview-X.Y.Z.zip`, attests its provenance and publishes the release with the CHANGELOG section as notes.
