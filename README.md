# GrowthPath Academy

A portfolio demo project: a single-page marketing website for a fictional coaching
institute, with an AI chat widget that answers course questions and captures student
leads. `CLAUDE.md` in this repo describes it as "Portfolio demo project #3 for Apex
Automations" — the academy, its courses, fees and batch dates are invented content
written into the chatbot's system prompt in `server.js`, not a real client site.

An Express server serves the static front end and four API routes. The chat endpoint
calls the Anthropic API with a counselor-style system prompt; when the conversation has
collected a name, phone, email and city, the model emits a `LEAD_DATA:{...}` JSON block
that the server parses out of the reply and emails on. The contact form and the
study-planner download form post to their own endpoints and send the same kind of
formatted HTML notification. Leads are only ever emailed — there is no database.

## Stack

- Node.js + Express 4, serving `public/` as static files (default port 3002)
- `@anthropic-ai/sdk` — chat completions with model `claude-sonnet-4-20250514`
- Nodemailer over Gmail SMTP for lead notification emails
- `express-rate-limit` — 50 chat requests / 15 min, 20 form submissions / hour
- `cors`, `dotenv`
- Front end: vanilla HTML, CSS and JS (no build step, no framework)

## Running it

```bash
npm install
npm start      # node server.js
npm run dev    # nodemon (requires the devDependency)
```

Then open http://localhost:3002

Needs a `.env` file (gitignored, not included) with the variables read in `server.js`
and listed in `CLAUDE.md`: `ANTHROPIC_API_KEY`, `EMAIL_USER`, `EMAIL_PASS` (a Gmail App
Password), and optionally `PORT`. Without `ANTHROPIC_API_KEY` the chat endpoint returns
a 500; without the email credentials the forms accept input but no notification is sent.

## Structure

```
server.js                   Express app: all four API routes, chatbot system prompt,
                            email templates
public/index.html           The whole site (hero, courses, faculty, success stories,
                            download, contact) plus the chat widget markup
public/css/style.css        All styles
public/js/chat-widget.js    Chat widget UI and calls to /api/chat
CLAUDE.md                   Project context notes: stack, endpoints, env vars, theme
```

## API

| Route | Purpose |
| --- | --- |
| `POST /api/chat` | Claude chatbot; returns the reply and a `leadCaptured` flag |
| `POST /api/lead` | Lead capture from the chatbot (requires name, email) |
| `POST /api/contact` | Contact form (requires name, email, phone) |
| `POST /api/download-lead` | Study-planner download form (requires name, email) |

Any other GET falls through to `public/index.html`.
