# GrowthPath Academy — Claude Code Context

## Project Overview
Portfolio demo project #3 for Apex Automations.
A full-stack coaching institute website with an embedded AI chatbot powered by Claude.

## Tech Stack
- **Backend:** Node.js + Express (port 3002)
- **Frontend:** Vanilla HTML/CSS/JS (single-page scrolling)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Email:** Nodemailer via Gmail SMTP
- **Rate limiting:** express-rate-limit

## Project Structure
```
/server.js          Express backend, all API endpoints
/.env               API keys and config (never commit)
/public/index.html  Full single-page website
/public/css/style.css  All styles (mobile responsive)
/public/js/chat-widget.js  AI chatbot widget
```

## API Endpoints
- POST /api/chat         — Claude chatbot messages
- POST /api/lead         — Lead capture (chatbot-sourced)
- POST /api/contact      — Contact form submissions
- POST /api/download-lead — Study planner download leads

## Environment Variables Required
- ANTHROPIC_API_KEY — from console.anthropic.com
- EMAIL_USER        — Gmail address for sending notifications
- EMAIL_PASS        — Gmail App Password (not account password)
- PORT              — 3002

## Design Theme
- Primary bg: #1a0a2e (deep purple)
- Accent: #7c3aed (vibrant violet)
- CTA/gold: #d4a843
- Fonts: DM Sans (body) + Playfair Display (headings)

## Email Notifications
All leads send HTML email to homechoudhuryapex@gmail.com
