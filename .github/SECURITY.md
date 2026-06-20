# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public issue.
Instead, report it privately via GitHub Security Advisories
("Security" tab → "Report a vulnerability") so the issue can be addressed before
public disclosure.

Please include reproduction steps and the affected version/commit.

## Handling of Credentials & Sensitive Data

This project automates retrieval of personal "saved/liked" content from
third-party platforms. It therefore handles sensitive material:

- **Instagram credentials** (`INSTAGRAM_USERNAME` / `INSTAGRAM_PASSWORD`) and
  the instagrapi session file (`~/.config/instagrapi/session.json`).
- **Google Cloud service-account credentials** (`GOOGLE_APPLICATION_CREDENTIALS`)
  and the Vertex AI project.
- **YouTube OAuth tokens** (`YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` /
  `YOUTUBE_REFRESH_TOKEN`).

Guidelines:

- **Never commit** `.env`, service-account JSON, OAuth tokens, or any retrieved
  media/metadata. These are excluded by `.gitignore` — keep them that way.
- **Never commit** retrieved third-party content: `videos/`, `knowledge_base/`,
  or `dashboard/data/video/`. Publishing it can violate platform Terms of
  Service and the privacy/copyright of the content's creators.
- Treat the instagrapi session file and refresh tokens as live secrets.
