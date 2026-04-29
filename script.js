const NAMESPACE = 'viral_button_dilemma_luna_2026';
const RED_KEY = 'red_votes';
const BLUE_KEY = 'blue_votes';
const API_BASE = 'https://api.counterapi.dev/v1';

const textDisplay = document.getElementById('text-display');
const choiceContainer = document.getElementById('choice-container');
const redBtn = document.getElementById('red-btn');
const blueBtn = document.getElementById('blue-btn');

let hasVoted = localStorage.getItem('dilemma_voted');

const storyLines = [
    `Infront of you there are<br><span class="t-blue">t</span><span class="wo-red">wo</span> buttons.`,
    `If over 50% of people<br>press the <span class="text-blue">BLUE</span> button`,
    `Then EVERYONE lives.`,
    `If over 50% pick <span class="text-red">RED</span>,<br>however`,
    `Only those who picked<br><span class="text-red">RED</span> will live.`
];

let currentLine = 0;
let isAnimating = false;
let autoAdvanceTimeout = null;

function showNextLine() {
    if (isAnimating) return;
    
    if (currentLine >= storyLines.length) {
        showChoice();
        return;
    }

    isAnimating = true;
    textDisplay.classList.add('fade-out');

    setTimeout(() => {
        textDisplay.innerHTML = storyLines[currentLine];
        textDisplay.classList.remove('fade-out');
        currentLine++;
        isAnimating = false;

        // Auto advance after 4.5 seconds
        clearTimeout(autoAdvanceTimeout);
        autoAdvanceTimeout = setTimeout(showNextLine, 4500);
    }, 500); // 0.5s fade out duration
}

function showChoice() {
    clearTimeout(autoAdvanceTimeout);
    
    if (hasVoted) {
        textDisplay.classList.add('fade-out');
        setTimeout(() => {
            textDisplay.innerHTML = 'Thank you for playing.';
            textDisplay.classList.remove('fade-out');
        }, 500);
        return;
    }

    textDisplay.classList.add('fade-out');
    setTimeout(() => {
        textDisplay.innerHTML = 'Choose.';
        textDisplay.classList.remove('fade-out');
        choiceContainer.classList.remove('hidden');
    }, 500);
}

// Click anywhere to advance text faster
document.addEventListener('click', (e) => {
    // Don't advance if clicking on a button
    if (e.target.closest('button')) return;
    
    if (currentLine <= storyLines.length && !hasVoted) {
        clearTimeout(autoAdvanceTimeout);
        showNextLine();
    }
});

async function upvote(key) {
    try {
        await fetch(`${API_BASE}/${NAMESPACE}/${key}/up`);
    } catch (e) {
        console.error(e);
    }
}

async function handleVote(color) {
    if (hasVoted) return;
    
    hasVoted = true;
    localStorage.setItem('dilemma_voted', color);
    
    redBtn.disabled = true;
    blueBtn.disabled = true;
    
    choiceContainer.classList.add('hidden');
    textDisplay.classList.add('fade-out');
    
    setTimeout(() => {
        textDisplay.innerHTML = 'Thank you for playing.';
        textDisplay.classList.remove('fade-out');
    }, 500);

    const key = color === 'red' ? RED_KEY : BLUE_KEY;
    await upvote(key);
}

redBtn.addEventListener('click', () => handleVote('red'));
blueBtn.addEventListener('click', () => handleVote('blue'));

// Start sequence
setTimeout(() => {
    showNextLine();
}, 500);
