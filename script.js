const NAMESPACE = 'viral_button_dilemma_luna_2026';
const RED_KEY = 'red_votes';
const BLUE_KEY = 'blue_votes';
const API_BASE = 'https://api.counterapi.dev/v1';

// DOM Elements
const redBtn = document.getElementById('red-btn');
const blueBtn = document.getElementById('blue-btn');
const resultsPanel = document.getElementById('results-panel');

const redCountEl = document.getElementById('red-count');
const blueCountEl = document.getElementById('blue-count');
const redPercentEl = document.getElementById('red-percent');
const bluePercentEl = document.getElementById('blue-percent');
const redProgressEl = document.getElementById('red-progress');
const blueProgressEl = document.getElementById('blue-progress');
const statusMessageEl = document.getElementById('status-message');

let hasVoted = localStorage.getItem('dilemma_voted');

// Fetch current counts
async function fetchCount(key) {
    try {
        const response = await fetch(`${API_BASE}/${NAMESPACE}/${key}/`);
        if (!response.ok) return 0;
        const data = await response.json();
        return data.count || 0;
    } catch (e) {
        console.error('Error fetching count:', e);
        return 0;
    }
}

// Upvote a color
async function upvote(key) {
    try {
        const response = await fetch(`${API_BASE}/${NAMESPACE}/${key}/up`);
        if (!response.ok) return 1;
        const data = await response.json();
        return data.count || 1;
    } catch (e) {
        console.error('Error upvoting:', e);
        return 1;
    }
}

// Update UI
function updateUI(redCount, blueCount) {
    const total = redCount + blueCount;
    
    redCountEl.innerText = redCount.toLocaleString();
    blueCountEl.innerText = blueCount.toLocaleString();

    if (total === 0) {
        redPercentEl.innerText = '0%';
        bluePercentEl.innerText = '0%';
        redProgressEl.style.width = '50%';
        blueProgressEl.style.width = '50%';
        statusMessageEl.innerText = 'Waiting for votes...';
        return;
    }

    const redPercent = (redCount / total) * 100;
    const bluePercent = (blueCount / total) * 100;

    redPercentEl.innerText = redPercent.toFixed(1) + '%';
    bluePercentEl.innerText = bluePercent.toFixed(1) + '%';

    redProgressEl.style.width = redPercent + '%';
    blueProgressEl.style.width = bluePercent + '%';

    if (bluePercent > 50) {
        statusMessageEl.innerHTML = '<span class="survive">Humanity Survives.</span> The Blue button prevails.';
    } else if (bluePercent < 50) {
        statusMessageEl.innerHTML = '<span class="die">Humanity Falls.</span> Only Red pressers survive.';
    } else {
        statusMessageEl.innerText = 'It\'s a tie. The fate of humanity hangs in the balance.';
    }
}

// Handle Vote
async function handleVote(color) {
    if (hasVoted) return;

    // Disable buttons
    redBtn.disabled = true;
    blueBtn.disabled = true;
    localStorage.setItem('dilemma_voted', color);
    
    resultsPanel.classList.remove('hidden');

    // Optimistic UI update
    let currentRed = parseInt(redCountEl.innerText.replace(/,/g, '')) || 0;
    let currentBlue = parseInt(blueCountEl.innerText.replace(/,/g, '')) || 0;

    if (color === 'red') currentRed++;
    if (color === 'blue') currentBlue++;
    
    updateUI(currentRed, currentBlue);
    statusMessageEl.innerText = 'Registering vote...';

    // Actual API Call
    const key = color === 'red' ? RED_KEY : BLUE_KEY;
    await upvote(key);
    
    // Refresh true counts
    refreshData();
}

async function refreshData() {
    const [red, blue] = await Promise.all([
        fetchCount(RED_KEY),
        fetchCount(BLUE_KEY)
    ]);
    updateUI(red, blue);
}

// Event Listeners
redBtn.addEventListener('click', () => handleVote('red'));
blueBtn.addEventListener('click', () => handleVote('blue'));

// Initialization
async function init() {
    if (hasVoted) {
        redBtn.disabled = true;
        blueBtn.disabled = true;
        resultsPanel.classList.remove('hidden');
    }
    await refreshData();
    
    // Poll for live updates every 5 seconds if results are visible
    setInterval(() => {
        if (!resultsPanel.classList.contains('hidden')) {
            refreshData();
        }
    }, 5000);
}

init();
