# DAVE3625 exam studio

An independent, local practice tool based on this repository's autumn 2026 course materials. No runtime packages, accounts or external services are required. Node.js 20+ is needed only for file saving and development checks.

## Start with automatic result files (recommended)

From the repository root:

```powershell
node sample_exam/server.mjs
```

Open **http://127.0.0.1:4173/sample_exam/index.html**. The server listens on this computer only. Stop it with Ctrl+C. Use `$env:PORT=4174` before launching if that port is occupied.

Completed attempts are written to **sample_exam/results/<attempt-id>.json** and appear under **Past exams**. The folder is created on the first save. Personal results are ignored by Git. Restarting the server or using a fresh browser still allows it to load those result files. Keep the result files if you move this project.

## Use VS Code Live Server

Open the **repository root** in VS Code, right-click `sample_exam/index.html`, and choose **Open with Live Server**. Opening this folder alone prevents links to the course files in its parent from working.

Live Server is a static server: it cannot automatically write files into the repository. In this mode the app autosaves active and completed attempts to browser localStorage. **Export result JSON** downloads a portable copy; **Past exams → Import result JSON** restores one. Save or move downloaded copies into `sample_exam/results` if you want the Node server to discover them. Browser storage belongs to the exact browser/profile/origin (including port); clearing it or switching ports does not transfer results. Export important attempts.

Do not open `index.html` directly using a `file://` URL: browsers restrict loading the question bank that way. The site uses no external fonts or network services and works offline once served locally.

## Exam behaviour

- 80 questions, 80 points, four hours. Each question is worth one point.
- 64 single-answer questions and 16 checkbox questions. Checkbox answers require the exact correct set, with no partial credit. Wrong and unanswered questions score zero; there is no negative marking.
- Grade boundaries from the guide: A 72–80; B 64–71; C 48–63; D 40–47; E 32–39; F 0–31.
- Question and option order are shuffled. No question repeats within an attempt. Arithmetic variants share a family; at most one member of each family is drawn.
- Answers, flags, question order and the deadline autosave. Refresh and resume preserve them. Leaving the page does **not** pause the clock. If time expires while closed, the attempt submits when the app is reopened. The app must run to write the completed file.
- Submission has an unanswered/flagged summary. After submission, review correct/incorrect/unanswered/flagged questions, filter by topic, and see explanations and study references.
- Each result contains a full question/source snapshot. Review does not depend on the current question-bank version. Scores are recomputed from the snapshot, not trusted from imported score fields.

| Topic | Bank | Per exam |
| --- | ---: | ---: |
| AI foundations | 30 | 6 |
| Data preparation | 60 | 12 |
| Classification and algorithms | 60 | 12 |
| Regression | 40 | 8 |
| Unsupervised learning | 40 | 8 |
| Model evaluation | 50 | 10 |
| ML strategy and error analysis | 40 | 8 |
| Neural networks | 30 | 6 |
| Generative AI and prompting | 30 | 6 |
| Responsible AI | 20 | 4 |
| **Total** | **400** | **80** |

These topic weights and question-type proportions are **practice choices**, not official predictions: the guide does not give them. Random sampling is within those fixed quotas. The bank comprises 306 authored conceptual/scenario/code-interpretation questions and 94 labelled arithmetic variants. No attempt is guaranteed to avoid questions seen on previous attempts.

## Sources and coverage limits

Read [coverage and supplementary notes](study-notes.html#coverage). Book links use exact PDF page numbers, matching the book's printed Page footer. PowerPoint references use actual slide positions, not inconsistent footer numbers. Browsers may download PowerPoints and notebooks rather than display them; the locator tells you where to look after opening them.

The examination guide includes possible short-answer questions; this tool deliberately implements the requested multiple-choice simulator. Elements of AI is not used as a standalone examinable source. The selected AI Index readings, later lecture decks and Assignment 3 are missing from this checkout. Detailed neural-network, prompting and some responsible-AI questions therefore reference explicitly labelled, generated supplementary notes, not invented course pages. Add the missing course resources before relying on this as full final-syllabus coverage. The tool is an aid for learning, not an official exam or a grade prediction.

Some course examples contain shortcuts or inconsistent wording. The coverage notes explain corrections used in the bank (leakage, stock-price regression, residuals, conditional independence, etc.).

## Update the bank and run checks

```powershell
node sample_exam/scripts/build-bank.mjs
node --test sample_exam/tests/*.test.mjs
```

Edit authored questions in `scripts/content.mjs`, arithmetic families in `scripts/numerical.mjs`, and source mappings in `scripts/bank-lib.mjs`. Rebuild the committed `questions.json`. Update the bank version and expected total when extending it. Each row declares its correct options, explanation and source. The builder checks unique prompts/options and existing source files. Core tests exercise repeated balanced sampling, option mapping, exact-match scoring, grade boundaries, snapshots, import validation, and the result server.

`tests/browser-check.mjs` is optional browser QA using Playwright and an installed Edge. It expects Playwright in `.tools/node_modules` (or `node_modules` if you change the import), and runs a temporary server and browser profile. Tooling and generated screenshots are kept in `.tools/`, ignored by Git. They are not needed to run the app.

The client-side question bank includes answers, as expected for an offline study tool. This is not an assessment-security system. The timer uses the local clock. Use one active exam tab at a time. Result files are intended for your own trusted practice records.
