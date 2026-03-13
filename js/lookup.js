/* ============================================================
   fucksb244.com — Rep Lookup Logic
   Uses Google Civic Information API to map zip → legislators,
   then cross-references our SB244 vote data.
   ============================================================ */

// NOTE FOR DEPLOYMENT: Set your Google Civic API key here
// Get a free key at: https://console.developers.google.com
// Enable "Google Civic Information API"
const GOOGLE_CIVIC_API_KEY = 'AIzaSyDMXHfprA0Anbr-PjegakeELmLRIIyaBNY';

// Opposition candidate links — to be filled in as challengers emerge
// Format: "LastName-Chamber": { name: "Full Name", url: "https://..." }
const OPPOSITION_CANDIDATES = {
  // Examples (update as 2026 election challengers file):
  // "Humphries-House": { name: "TBD Challenger", url: "https://..." },
  // "Masterson-Senate": { name: "TBD Challenger", url: "https://..." },
};

const ORGS = [
  {
    name: "ACLU of Kansas",
    desc: "Suing to block SB244 right now",
    url: "https://www.aclukansas.org/en/donate"
  },
  {
    name: "Kansas Equality Coalition",
    desc: "On-the-ground Kansas advocacy",
    url: "https://www.ksequality.org/donate"
  },
  {
    name: "Human Rights Campaign",
    desc: "Nation's largest LGBTQ+ civil rights org",
    url: "https://www.hrc.org/donate"
  }
];

// ---- MAIN LOOKUP FUNCTION ----
async function lookupReps() {
  const zipInput = document.getElementById('zipInput');
  const errorEl = document.getElementById('zipError');
  const resultsEl = document.getElementById('results');
  const btn = document.getElementById('lookupBtn');

  const zip = zipInput.value.trim();
  errorEl.textContent = '';

  // Validate zip
  if (!/^\d{5}$/.test(zip)) {
    errorEl.textContent = '⚠ Please enter a valid 5-digit zip code';
    return;
  }

  // Loading state
  btn.innerHTML = '<span class="btn-text">Looking up...</span>';
  btn.disabled = true;
  resultsEl.innerHTML = '<div class="no-results">Fetching your representatives...</div>';

  try {
    const reps = await fetchRepsFromCivicAPI(zip);

    if (!reps || reps.length === 0) {
      resultsEl.innerHTML = `
        <div class="no-results">
          <p>No Kansas state legislators found for zip code <strong>${zip}</strong>.</p>
          <p style="margin-top:0.75rem">Make sure this is a Kansas zip code. You can also look up your representatives directly at 
          <a href="https://www.kslegislature.gov" target="_blank" rel="noopener" style="color:var(--white);text-decoration:underline">kslegislature.gov</a>.</p>
        </div>`;
      return;
    }

    renderResults(reps, zip, resultsEl);

  } catch (err) {
    console.error('Lookup error:', err);

    // Fallback: show manual lookup instructions
    resultsEl.innerHTML = `
      <div class="no-results">
        <p style="color:var(--yellow);margin-bottom:0.75rem">⚠ Could not auto-detect your reps (API key not configured or quota exceeded).</p>
        <p>Find your representatives manually:</p>
        <ol style="margin-top:0.75rem;padding-left:1.5rem;line-height:2">
          <li><a href="https://www.kslegislature.gov/li/b2025_26/chamber/house/roster/" target="_blank" rel="noopener" style="color:var(--white)">Kansas House Roster ↗</a></li>
          <li><a href="https://www.kslegislature.gov/li/b2025_26/chamber/senate/roster/" target="_blank" rel="noopener" style="color:var(--white)">Kansas Senate Roster ↗</a></li>
        </ol>
        <p style="margin-top:1rem;font-size:0.75rem;opacity:0.5">Then check the vote data at the bottom of this page.</p>
      </div>`;
  } finally {
    btn.innerHTML = '<span class="btn-text">Look Up</span><span class="btn-arrow">→</span>';
    btn.disabled = false;
  }
}

// ---- CIVIC API CALL ----
async function fetchRepsFromCivicAPI(zip) {
  const url = `https://www.googleapis.com/civicinfo/v2/representatives?key=${GOOGLE_CIVIC_API_KEY}&address=${zip}&levels=administrativeArea1&roles=legislatorLowerBody&roles=legislatorUpperBody`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.officials || !data.offices) return [];

  // Map offices to officials
  const legislators = [];
  data.offices.forEach(office => {
    if (!office.levels?.includes('administrativeArea1')) return;

    const isHouse = office.roles?.includes('legislatorLowerBody');
    const isSenate = office.roles?.includes('legislatorUpperBody');
    if (!isHouse && !isSenate) return;

    office.officialIndices.forEach(idx => {
      const official = data.officials[idx];
      if (!official) return;

      legislators.push({
        name: official.name,
        chamber: isHouse ? 'House' : 'Senate',
        party: official.party,
        office: office.name,
        photoUrl: official.photoUrl || null,
        urls: official.urls || []
      });
    });
  });

  return legislators;
}

// ---- MATCH API RESULT TO VOTE DATA ----
function findVoteRecord(apiName, chamber) {
  const allReps = [...SB244_VOTES.house, ...SB244_VOTES.senate];
  const chamberReps = allReps.filter(r => r.chamber === chamber);

  // Normalize name for matching
  const normalize = str => str.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const apiNorm = normalize(apiName);

  // Try exact last name match first
  const apiLastName = apiNorm.split(' ').pop();

  let match = chamberReps.find(r => {
    const lastName = normalize(r.name);
    return lastName === apiLastName || apiNorm.includes(lastName);
  });

  // Try partial match if no exact
  if (!match) {
    match = chamberReps.find(r => {
      const fullName = normalize(`${r.firstName} ${r.name}`);
      return apiNorm.includes(normalize(r.name)) || fullName.includes(apiLastName);
    });
  }

  return match || null;
}

// ---- RENDER RESULTS ----
function renderResults(reps, zip, container) {
  const matched = reps.map(rep => {
    const voteRecord = findVoteRecord(rep.name, rep.chamber);
    return { ...rep, voteRecord };
  });

  let html = `<div class="results-header">Results for zip code ${zip} — ${matched.length} Kansas state legislator${matched.length !== 1 ? 's' : ''} found</div>`;

  matched.forEach((rep, i) => {
    const vote = rep.voteRecord?.vote || 'UNKNOWN';
    const cardClass = vote === 'YEA' ? 'rep-card--yea' : vote === 'NAY' ? 'rep-card--nay' : '';
    const voteDisplay = vote === 'YEA' ? 'YES' : vote === 'NAY' ? 'NO' : '?';
    const voteMeaning = vote === 'YEA' ? 'Voted to harm trans Kansans' : vote === 'NAY' ? 'Voted to protect trans Kansans' : 'Vote not found';
    const voteClass = vote === 'YEA' ? 'vote-value--yea' : vote === 'NAY' ? 'vote-value--nay' : '';

    const lastName = rep.voteRecord?.name || rep.name.split(' ').pop();
    const chamberKey = `${lastName}-${rep.chamber}`;
    const opposition = OPPOSITION_CANDIDATES[chamberKey];

    html += `
    <div class="rep-card ${cardClass}">
      <div class="rep-card-header">
        <div class="rep-info">
          <div class="rep-chamber">Kansas ${rep.chamber}</div>
          <div class="rep-name">${rep.name}</div>
          <div class="rep-party">${rep.party || 'Party not listed'} · ${rep.office || ''}</div>
        </div>
        <div class="rep-vote-badge">
          <span class="vote-label">SB244 Vote</span>
          <span class="vote-value ${voteClass}">${voteDisplay}</span>
          <span class="vote-meaning">${voteMeaning}</span>
        </div>
      </div>`;

    if (vote === 'YEA') {
      html += `
      <div class="rep-actions">
        <div class="rep-actions-label">Take action against ${rep.name.split(' ')[1] || rep.name}</div>
        <div class="action-buttons">
          ${opposition
            ? `<a href="${opposition.url}" target="_blank" rel="noopener" class="action-btn action-btn--oppose">
                Donate to ${opposition.name} ↗
               </a>`
            : `<a href="https://www.ksdp.org" target="_blank" rel="noopener" class="action-btn action-btn--oppose">
                Find Their Challenger ↗
               </a>`
          }
          <button 
            class="action-btn action-btn--donate" 
            onclick="toggleDonate('donate-${i}')" 
            type="button"
          >
            Donate to Pro-Trans Org in Their Name
          </button>
        </div>
      </div>
      <div class="donate-dropdown" id="donate-${i}">
        <div class="donate-dropdown-label">Choose an organization to donate to:</div>
        <div class="donate-org-list">
          ${ORGS.map(org => `
            <a href="${org.url}" target="_blank" rel="noopener" class="donate-org-link">
              <span class="org-name">${org.name}</span>
              <span style="display:flex;align-items:center;gap:1rem;font-size:0.65rem;color:var(--gray)">
                ${org.desc}
                <span class="org-arrow">↗</span>
              </span>
            </a>
          `).join('')}
        </div>
      </div>`;
    } else if (vote === 'NAY') {
      html += `
      <div class="rep-thanks">
        ✓ ${rep.name} voted NO on SB244. Thank them and encourage others to re-elect them.
        ${rep.urls.length > 0 ? `<a href="${rep.urls[0]}" target="_blank" rel="noopener" style="color:var(--green-light);margin-left:0.5rem">Contact them ↗</a>` : ''}
      </div>`;
    } else {
      html += `
      <div class="rep-thanks" style="color:var(--gray)">
        Vote record not found in our database. Check <a href="https://www.kslegislature.gov/li/b2025_26/measures/sb244/" target="_blank" rel="noopener" style="color:var(--white)">kslegislature.gov ↗</a>
      </div>`;
    }

    html += `</div>`;
  });

  container.innerHTML = html;

  // Smooth scroll to results
  setTimeout(() => {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ---- TOGGLE DONATE DROPDOWN ----
function toggleDonate(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('open');
}

// ---- ENTER KEY SUPPORT ----
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('zipInput');
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') lookupReps();
    });

    // Only allow numbers
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 5);
    });
  }
});
