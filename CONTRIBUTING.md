# Contributing

Thanks for your interest in improving `design-system-agent-tester`.

## Development setup

Requirements: Node.js ≥ 22.12 and a local Chromium (Puppeteer downloads
one on install unless `PUPPETEER_SKIP_DOWNLOAD` is set).

```sh
git clone https://github.com/sanity-io/design-system-agent-tester.git
cd design-system-agent-tester
npm install
cp agent-tester.config.example.js agent-tester.config.js
npm test
```

The unit tests run against the example config and need no API key.
Running the full agent loop (`npm start`) needs an `ANTHROPIC_API_KEY`
in `.env`. See the README for details.

## Making changes

1. Fork and create a feature branch.
2. Make your change. Match the style of the surrounding code.
3. Add or update tests — `npm test` must pass.
4. For changes to evaluations or reporting, run at least one real test
   (`npm start -- --test shad-cn --iterations 1`) and check the output
   report renders correctly.
5. Open a pull request. The PR template lists what to include.

## What contributions fit

The issue templates describe the buckets: new metrics, new evaluation
tooling, new report formats, and new test runners. Bundled test
definitions for other public design systems are also welcome. When in
doubt, open an issue first to discuss the idea.

## Reporting bugs

Use the bug-report issue template and include the artifacts it asks
for (`_meta.json`, `_tsc_check.txt`, `_dev_server.txt`) — they make
most problems diagnosable without a reproduction.
