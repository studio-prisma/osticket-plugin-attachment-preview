## What changes

<!-- One or two sentences. What does this PR do, and why? -->

## Type

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] CI / tooling
- [ ] Refactor (no behaviour change)

## Security impact

- [ ] Touches the sanitizer config, the DOMPurify injection or anything that writes attachment content into the page
- [ ] Touches the output buffer, the shutdown handler or the CSP rewrite
- [ ] Adds or changes a third-party embed (YouTube, Vimeo, ...)
- [ ] No security-relevant surface touched

If any box above is checked, describe the threat model change:

<!-- ... -->

## Verification

- [ ] `tests/run-all.sh` passes locally (state your PHP and Node versions: ______)
- [ ] Verified against a real osTicket 1.18.x instance
- [ ] READMEs and INSTALL docs updated in both languages, if behaviour or setup changed

## Related issues

Closes #
