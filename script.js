const NAMESPACE = 'viral_button_dilemma_luna_2026';
const RED_KEY = 'red_votes';
const BLUE_KEY = 'blue_votes';
const API_BASE = 'https://api.counterapi.dev/v1';

const redBtn = document.getElementById('red-btn');
const blueBtn = document.getElementById('blue-btn');
const resultsPanel = document.getElementById('results-panel');
const redCountEl = document.getElementById('red-count');
const blueCountEl = document.getElementById('blue-count');
const redPercentEl = document.getElementById('red-percent');
const bluePercentEl = document.getElementById('blue-percent');
const statusMessageEl = document.getElementById('status-message');

let hasVoted = localStorage.getItem('dilemma_voted');

async function fetchCount(key) {
    try {
        const response = await fetch(`${API_BASE}/${NAMESPACE}/${key}/`);
        if (!response.ok) return 0;
        const data = await response.json();
        return data.count || 0;
    } catch (e) {
        return 0;
    }
}

async function upvote(key) {
    try {
        const response = await fetch(`${API_BASE}/${NAMESPACE}/${key}/up`);
        if (!response.ok) return 1;
        const data = await response.json();
        return data.count || 1;
    } catch (e) {
        return 1;
    }
}

function updateUI(redCount, blueCount) {
    const total = redCount + blueCount;
    
    redCountEl.innerText = redCount.toLocaleString();
    blueCountEl.innerText = blueCount.toLocaleString();

    if (total === 0) {
        redPercentEl.innerText = '0%';
        bluePercentEl.innerText = '0%';
        statusMessageEl.innerText = 'waiting...';
        return;
    }

    const redPercent = (redCount / total) * 100;
    const bluePercent = (blueCount / total) * 100;

    redPercentEl.innerText = redPercent.toFixed(1) + '%';
    bluePercentEl.innerText = bluePercent.toFixed(1) + '%';

    if (bluePercent > 50) {
        statusMessageEl.innerText = 'humanity survives.';
    } else if (bluePercent < 50) {
        statusMessageEl.innerText = 'only red survives.';
    } else {
        statusMessageEl.innerText = 'it is tied.';
    }
}

async function handleVote(color) {
    if (hasVoted) return;

    redBtn.disabled = true;
    blueBtn.disabled = true;
    localStorage.setItem('dilemma_voted', color);
    
    resultsPanel.classList.remove('hidden');

    let currentRed = parseInt(redCountEl.innerText.replace(/,/g, '')) || 0;
    let currentBlue = parseInt(blueCountEl.innerText.replace(/,/g, '')) || 0;

    if (color === 'red') currentRed++;
    if (color === 'blue') currentBlue++;
    
    updateUI(currentRed, currentBlue);
    statusMessageEl.innerText = 'registering...';

    const key = color === 'red' ? RED_KEY : BLUE_KEY;
    await upvote(key);
    refreshData();
}

async function refreshData() {
    const [red, blue] = await Promise.all([
        fetchCount(RED_KEY),
        fetchCount(BLUE_KEY)
    ]);
    updateUI(red, blue);
}

redBtn.addEventListener('click', () => handleVote('red'));
blueBtn.addEventListener('click', () => handleVote('blue'));

async function init() {
    if (hasVoted) {
        redBtn.disabled = true;
        blueBtn.disabled = true;
        resultsPanel.classList.remove('hidden');
    }
    await refreshData();
    setInterval(() => {
        if (!resultsPanel.classList.contains('hidden')) {
            refreshData();
        }
    }, 5000);
}

init();
