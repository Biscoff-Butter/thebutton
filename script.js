const NAMESPACE = 'viral_button_dilemma_luna_2026_prod';
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

let audioCtx = null;
function startEerieHum() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.value = 55; // Low A

        osc2.type = 'triangle';
        osc2.frequency.value = 57.5; // Slightly detuned for dissonance

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 5);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc2.start();
    } catch (e) {
        console.log("Audio not supported or blocked");
    }
}

function showNextLine() {
    if (isAnimating) return;
    
    if (currentLine >= storyLines.length) {
        showChoice();
        return;
    }

    isAnimating = true;
    
    const startNext = () => {
        textDisplay.innerHTML = storyLines[currentLine];
        textDisplay.classList.remove('fade-out');
        currentLine++;
        isAnimating = false;

        // Auto advance after 5 seconds
        clearTimeout(autoAdvanceTimeout);
        autoAdvanceTimeout = setTimeout(showNextLine, 5000);
    };

    if (textDisplay.innerHTML.trim() !== "") {
        textDisplay.classList.add('fade-out');
        setTimeout(startNext, 600);
    } else {
        startNext();
    }
}

function showChoice() {
    clearTimeout(autoAdvanceTimeout);
    
    textDisplay.classList.add('fade-out');
    setTimeout(() => {
        if (hasVoted) {
            textDisplay.innerHTML = 'Thank you for playing.';
            setTimeout(endAndClose, 5000);
        } else {
            textDisplay.innerHTML = 'Choose.';
            choiceContainer.classList.remove('hidden');
        }
        textDisplay.classList.remove('fade-out');
    }, 600);
}

function endAndClose() {
    window.close();
    // Fallback if browser blocks window.close()
    window.location.href = 'about:blank';
}

// Click anywhere to advance text faster and start audio
document.addEventListener('mousedown', (e) => {
    startEerieHum();
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
        setTimeout(endAndClose, 5000);
    }, 600);

    const key = color === 'red' ? RED_KEY : BLUE_KEY;
    await upvote(key);
}

redBtn.addEventListener('click', (e) => {
    startEerieHum();
    e.stopPropagation();
    handleVote('red');
});
blueBtn.addEventListener('click', (e) => {
    startEerieHum();
    e.stopPropagation();
    handleVote('blue');
});

// Start sequence immediately
window.onload = () => {
    showNextLine();
};
