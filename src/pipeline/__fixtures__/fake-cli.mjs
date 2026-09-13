#!/usr/bin/env node
// A tiny fixture CLI for testing runCliTool/buildCliTool without depending
// on a real npm package. Echoes argv back so tests can assert on exactly
// what reached the subprocess.
const args = process.argv.slice(2);
if (args[0] === "--fail") {
  console.error("simulated failure");
  process.exit(3);
} else if (args[0] === "--hang") {
  setTimeout(() => {}, 60_000); // never resolves within test timeout
} else if (args[0] === "--big") {
  process.stdout.write("x".repeat(50_000));
} else if (args[0] === "--echo-env") {
  console.log(process.env[args[1]] ?? "(unset)");
} else {
  console.log(JSON.stringify(args));
}
