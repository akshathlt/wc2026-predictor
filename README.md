# ⚽ WC2026 Predictor — IBM SkillsBuild AI Challenge Submission

> **Live App:** https://wc2026-predictor-dmz.pages.dev  
> **Challenge:** IBM SkillsBuild AI Builders Challenge — June 2026 (FIFA World Cup)

---

## The Problem We're Solving

Billions of people watch the FIFA World Cup, but most fans lack the tactical context to truly understand *why* a match unfolded the way it did. After a result, fans are left asking:

- Why did Germany dominate despite Paraguay's compact defense?
- Why did Canada's counter-attacking style exploit South Africa's high defensive line?
- What does this result mean for the tournament?

**WC2026 Predictor** addresses this by combining a real-time prediction game with **IBM Granite-powered AI match explanations** — giving every fan both the excitement of predicting outcomes and the insight to understand them.

---

## What We Built

A full-stack World Cup prediction platform with **22 real users** actively competing, enhanced with IBM Granite AI for tactical match analysis.

### Core Features
- **Group Stage Predictions** — drag & drop all 48 teams across 12 groups (A–L)
- **Match Score Predictions** — predict exact scorelines for all 104 matches
- **Knockout Joker Cards** — 3x group + 3x knockout jokers that double your points
- **Live Bracket** — real-time knockout bracket fed from FIFA's official API
- **Live Leaderboard** — auto-updated every 30 minutes via GitHub Actions
- **🤖 IBM Granite AI Match Insights** — click any finished match to get a tactical explanation powered by IBM Granite 3.3 8B Instruct

### AI Technical Approach

**IBM Granite Integration (`ibm/granite-3-3-8b-instruct`)**

For every completed match, users can click **"🤖 AI Match Insight (IBM Granite)"** to receive a 2-3 sentence tactical analysis explaining:
- Why the result makes sense given each team's style
- What tactical factors decided the match
- What the result means for the tournament

**Architecture:**
```
User clicks "AI Insight"
    ↓
Supabase Edge Function (Deno/TypeScript)
    ↓
IBM IAM → Access Token
    ↓
watsonx.ai API (eu-de) → ibm/granite-3-3-8b-instruct
    ↓
Tactical insight returned to user
```

**Technology Stack:**
- **Frontend:** React + Vite + TailwindCSS (Cloudflare Pages)
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **AI:** IBM Granite 3.3 8B Instruct via watsonx.ai API
- **Data:** FIFA Official API (live match data, brackets, standings)
- **Automation:** GitHub Actions (auto-sync FIFA results every 30 min)

---

## Why This Matters

1. **Human-centered AI** — AI explains decisions rather than making them. Users still predict; Granite helps them understand.

2. **Accessibility** — Casual fans get expert-level tactical context in plain language. No football expertise required.

3. **Real users, real data** — 22 players from SAP SE actively competing with real predictions on live World Cup matches.

4. **Trust & Transparency** — IBM Granite's explanations are grounded in the actual match result and team context, not hallucinated narratives.

5. **Scalable** — The Supabase Edge Function + watsonx.ai architecture scales to any number of matches and users.

---

## IBM Technologies Used

| Technology | How Used |
|-----------|----------|
| **IBM Granite 3.3 8B Instruct** | Tactical match analysis and explanation |
| **watsonx.ai API** (eu-de region) | Model inference endpoint |
| **IBM Cloud IAM** | API key → Bearer token authentication |

---

## Running the Project

```bash
git clone https://github.com/akshathlt/wc2026-predictor
cd wc2026-predictor
npm install
npm run dev
```

**Environment:** Requires Supabase project with edge function secrets:
- `IBM_API_KEY` — IBM Cloud API key
- `WATSONX_PROJECT_ID` — watsonx.ai project ID
- `WATSONX_URL` — `https://eu-de.ml.cloud.ibm.com`

---

## Demo

**Live:** https://wc2026-predictor-dmz.pages.dev  
**GitHub:** https://github.com/akshathlt/wc2026-predictor

To see the AI feature:
1. Log in → go to **Predict → Match Predictions**
2. Find any finished match (green score shown)
3. Click **"🤖 AI Match Insight (IBM Granite)"**
4. IBM Granite returns a tactical explanation in ~3 seconds

---

## Team

**Akshath LT** — SAP SE, O2C Engineering  
Full-stack development, AI integration, product design
