# Spatial Test Catalog (MindCave)

A public, searchable catalog of spatial cognition assessments.

- Anyone can browse without an account
- Verified contributors sign in via ORCID (OpenID)
- Controlled vocabularies for ability + platform tags
- Contributor attribution (“Added by…”) via ORCID, with optional email visibility

## Live site
-  catalog.mindcave.lv 

## Features
- Search by test name / author
- Filters:
  - Ability categories (controlled)
  - Platform types (desktop/tablet/paper/VR/AR…)
  - Age range overlap filters
- Test records include:
  - authors, year, citation, DOI, source URL, access notes
  - ability + platform tags
  - “Added by” contributor attribution (ORCID link; email shown only if opted-in)

## Tech stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Supabase (Postgres + Row Level Security)
- Auth: ORCID sign-in via OpenID Connect (Supabase OAuth / Keycloak proxy)
- Hosting: Netlify
- Source control: GitHub

## Local development
1) Install dependencies
```bash
npm install
