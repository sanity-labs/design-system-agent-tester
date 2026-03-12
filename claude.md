This project is intended to be a test harness for running agents in parallel on a task to test average output. The agents should be run independently, separately and with absolutely no context to each other or access to the others' output. 

There should be two separate tests, based on two separate prompts: 
1. ./PROMPT-CONTROL.md
2. ./PROMPT-WITH-TRAINING.md

Each test should be allowed to run to completion. The following should be measured:
1. Average time to complete the task across all test passes
2. Average number of lines of code across all test passes
3. The amount of variance in the code across all test passes (e.g., how different is each implementation from the other)
4. The number of unique Sanity UI components across all test passes
5. The number of times the errors had to be fixed to get the page to render
6. Image screenshots of the main page created in high fidelity (saved to disk in the project)

# Instructions
- Use Node.js with as few package dependencies as possible
- Keep the code simple and document how the project works in a README doc. The README should be maintained at all times, but stay simple and succinct.

# Requirements
- The output of all prompts should be tested before it is allowed to finish. The job should finish once all errors have been resolved, the page renders as intended, and a screenshot is able to be successfully taken.
- A report should be generated that measures all of the items outlined above. The agents are instructed to provide feedback on areas of friction when implementing Sanity UI. Provide a summary of the feedback as well as a line item list of all direct feedback provided within the report.
- The project should be able to ensure each test is run independently with zero context of the other agents/output. 
- The number of iterations should be configurable.
- The model used should be configurable
