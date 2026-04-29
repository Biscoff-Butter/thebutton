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
    `Welcome to the experiment.`,
    `In front of you are two buttons.`,
    `The rules are simple.`,
    `If over 50% of people<br>press the <span class="text-blue">BLUE</span> button...`,
    `Everyone survives.`,
    `However...`,
    `If 50% or more pick <span class="text-red">RED</span>...`,
    `Only those who pressed <span class="text-red">RED</span> will live.`,
    `Those who trusted the group and pressed <span class="text-blue">BLUE</span> will be eliminated.`,
    `What do you choose?`
];

let currentLine = 0;
let isAnimating = false;

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

        // Start eerie drum loop
        setInterval(() => {
            if (!audioCtx || audioCtx.state !== 'running') return;
            const drumOsc = audioCtx.createOscillator();
            const drumGain = audioCtx.createGain();

            drumOsc.type = 'sine';
            drumOsc.frequency.setValueAtTime(150, audioCtx.currentTime);
            drumOsc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

            drumGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
            drumGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

            drumOsc.connect(drumGain);
            drumGain.connect(audioCtx.destination);

            drumOsc.start();
            drumOsc.stop(audioCtx.currentTime + 0.5);
        }, 3000);
    } catch (e) {
        console.log("Audio not supported or blocked. Fuck you.");
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
    };

    if (textDisplay.innerHTML.trim() !== "") {
        textDisplay.classList.add('fade-out');
        setTimeout(startNext, 600);
    } else {
        startNext();
    }
}

function showChoice() {
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
    window.open('', '_self', '');
    window.close();
    // Fallback if browser blocks window.close()
    document.body.innerHTML = '';
    document.body.style.backgroundColor = '#000';
    setTimeout(() => {
        window.location.href = 'about:blank';
    }, 100);
}

// Fullscreen logic
function enterFullscreen() {
    const docElm = document.documentElement;
    try {
        if (docElm.requestFullscreen) docElm.requestFullscreen();
        else if (docElm.mozRequestFullScreen) docElm.mozRequestFullScreen();
        else if (docElm.webkitRequestFullScreen) docElm.webkitRequestFullScreen();
        else if (docElm.msRequestFullscreen) docElm.msRequestFullscreen();
    } catch (e) {
        console.log("Fullscreen request failed. Interaction required.");
    }
}

let firstInteraction = true;

// Click anywhere to advance text faster and trigger immersion
document.addEventListener('mousedown', (e) => {
    if (firstInteraction) {
        enterFullscreen();
        startEerieHum();
        firstInteraction = false;
    }

    if (e.target instanceof Element && e.target.closest('button')) return;

    if (currentLine <= storyLines.length && !hasVoted) {
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

// Initialization
window.onload = () => {
    showNextLine();
};
