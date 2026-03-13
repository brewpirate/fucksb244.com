# fucksb244.com

A civic advocacy site exposing how Kansas legislators voted on SB244 — the anti-trans "bathroom bounty" bill that stripped trans Kansans of their IDs, banned them from bathrooms, and created a lawsuit bounty system.

**Visitors enter their zip code → see how their State House rep and State Senator voted → take action.**

---

## Features

- Zip code → Kansas legislator lookup (Google Civic Information API)
- Full SB244 vote record for all 165 legislators
- Two action paths for YES voters:
  1. Donate to their opposition candidate
  2. Donate to a pro-trans organization in their name
- Zero payment processing — all external redirects only

---

## Project Structure

```
fucksb244/
├── index.html          # Main page
├── css/
│   └── style.css       # Styles
├── js/
│   └── lookup.js       # Zip → rep lookup + vote matching
├── data/
│   └── votes.js        # SB244 vote data for all legislators
└── README.md
```

---

## Setup & Deployment

### 1. Get a Google Civic Information API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the **Google Civic Information API**
4. Create an API key under **Credentials**
5. (Recommended) Restrict the key to your domain: `fucksb244.com`

### 2. Add your API key

Open `js/lookup.js` and replace the placeholder:

```js
const GOOGLE_CIVIC_API_KEY = 'YOUR_GOOGLE_CIVIC_API_KEY';
```

### 3. Add a custom domain (fucksb244.com)

Create a `CNAME` file in the repo root:

```
fucksb244.com
```

### 4. Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set Source to `main` branch, root folder `/`
4. GitHub Pages will serve the site at `https://yourusername.github.io/fucksb244` or your custom domain

### 5. Configure DNS (for fucksb244.com)

At your domain registrar, add these DNS records:

| Type  | Name | Value                    |
|-------|------|--------------------------|
| A     | @    | 185.199.108.153          |
| A     | @    | 185.199.109.153          |
| A     | @    | 185.199.110.153          |
| A     | @    | 185.199.111.153          |
| CNAME | www  | yourusername.github.io   |

Enable **Enforce HTTPS** in GitHub Pages settings after DNS propagates (can take up to 24 hours).

---

## Keeping Data Current

### Opposition Candidates

As 2026 challengers file to run against YES voters, update `js/lookup.js`:

```js
const OPPOSITION_CANDIDATES = {
  "Humphries-House": {
    name: "Challenger Name",
    url: "https://challengersite.com/donate"
  },
  "Masterson-Senate": {
    name: "Challenger Name",
    url: "https://challengersite.com/donate"
  },
  // etc.
};
```

The key format is `"LastName-Chamber"` (e.g., `"Smith-House"` or `"Jones-Senate"`).

### Vote Data

Vote data is in `data/votes.js`. The current data reflects the **February 18, 2026 veto override vote** (the final, decisive vote). All names sourced from the Kansas Legislature's official records.

---

## Legal Notes

- All vote data is **public domain** (official government records)
- This site does **not** process donations — all action links are external redirects
- This is a **civic advocacy / First Amendment protected** political speech site
- We are **not affiliated** with any political party or campaign

---

## Contributing

Help needed:
- Filling in `OPPOSITION_CANDIDATES` as 2026 challengers announce
- Verifying all legislator names match exactly to their districts
- Adding district numbers to each legislator record

Please open a PR or issue!

---

*"I have sat here for five and a half hours and listened to this entire room debate my humanity."*
*— Rep. Abi Boatman (D), Kansas's first transgender legislator*
