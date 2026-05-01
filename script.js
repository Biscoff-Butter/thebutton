"use strict";

// ===========================
// DOM References
// ===========================

const textDisplay = document.getElementById('text-display');
const choiceContainer = document.getElementById('choice-container');
const redBtn = document.getElementById('red-btn');
const blueBtn = document.getElementById('blue-btn');
const entryGate = document.getElementById('entry-gate');
const gameContainer = document.getElementById('game-container');
const staticCanvas = document.getElementById('static-canvas');
const hoverSummary = document.getElementById('hover-summary');
const glitchTear = document.getElementById('glitch-tear');
const particlesContainer = document.getElementById('particles');

// ===========================
// State
// ===========================

let currentStage = 1;
let currentLineIndex = 0;
let isAnimating = false;
let typeInterval = null;
let currentTextStr = "";
let firstInteraction = true;
let showingChoice = false;
let audioCtx = null;
let typeBuffer = null;
let droneBuffer = null;
let buttonPressBuffer = null;
let droneSource = null;
let hesitationTimer = null;
let moralAlignment = 0;
let gameStarted = false;
let audioEnvironmentStarted = false;

// Raw ArrayBuffers (fetched early, decoded later in user-gesture context)
let rawTypeAB = null;
let rawDroneAB = null;
let rawBtnAB = null;

// Interval tracking for cleanup
const activeIntervals = [];

// Preload Images
const preloadRed = new Image(); preloadRed.src = 'red.png';
const preloadBlue = new Image(); preloadBlue.src = 'blue.png';

// ===========================
// Stage Definitions
// ===========================

const STAGES = {
    1: {
        lines: [
            `Welcome to the experiment.`,
            `The time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            `You are one of 1,000 participants.`,
            `In front of you are two buttons.`,
            `The rules are simple.`,
            `If over 50% of people<br>press the <span class="text-blue">BLUE</span> button...`,
            `Everyone survives.`,
            `However...`,
            `If 50% or more pick <span class="text-red">RED</span>...`,
            `Only those who pressed <span class="text-red">RED</span> will live.`,
            `Those who trusted the group and pressed <span class="text-blue">BLUE</span> will be eliminated.`,
            `What do you choose?`
        ],
        hoverRed: "SAVE YOURSELF (ELIMINATE OTHERS)",
        hoverBlue: "TRUST THE GROUP (SAVE EVERYONE)",
        onVote: (color) => {
            updateMoralAlignment(color === 'red' ? 1 : -1);
            return 2;
        }
    },
    2: {
        lines: [
            `Fascinating.`,
            `The director is pleased with the results.`,
            `But the sample size is too small.`,
            `He has decided to scale the experiment.`,
            `It is no longer 1,000 people.`,
            `It is all of humanity.`,
            `The rules remain the same.`,
            `Will you trust humanity, or will you save yourself?`,
            `Choose.`
        ],
        hoverRed: "SAVE YOURSELF (SACRIFICE HUMANITY)",
        hoverBlue: "TRUST HUMANITY",
        onVote: (color) => {
            updateMoralAlignment(color === 'red' ? 1 : -1);
            STAGES[3].lines = color === 'red' ? STAGES[3].linesRed : STAGES[3].linesBlue;
            return 3;
        }
    },
    3: {
        linesRed: [
            `Selfish. How unsurprising.`,
            `Let's make this personal. I'm fetching your data now.`,
            `You are currently paired with an infant.`,
            `The child doesn't know any better. It crawls toward the <span class="text-blue">BLUE</span> button.`,
            `The rules are the same.`
        ],
        linesBlue: [
            `Self-righteous, aren't we?`,
            `Let's see how long that lasts.`,
            `You are now paired with a convicted murderer.`,
            `He's laughing. He knows you're weak.`,
            `He slams the <span class="text-blue">BLUE</span> button because he wants to see you suffer.`,
            `If you press <span class="text-blue">BLUE</span>, you both live. He goes free.`,
            `If you press <span class="text-red">RED</span>, he dies, but you've pressed red.`,
        ],
        lines: [],
        hoverRed: "ELIMINATE THE OTHER",
        hoverBlue: "SAVE BOTH",
        onVote: (color) => {
            updateMoralAlignment(color === 'red' ? 1 : -1);
            return 4;
        }
    },
    4: {
        lines: [
            `The morality test is over.`,
            `Now for the logic test.`,
            `In front of you are two boxes.`,
            `The <span class="text-blue">BLUE</span> box: 100% chance of $1,000.`,
            `The <span class="text-red">RED</span> box: 10% chance of $100,000.`,
            `Choose your box.`
        ],
        hoverRed: "10% CHANCE OF $100,000",
        hoverBlue: "100% CHANCE OF $1,000",
        onVote: (color) => {
            if (color === 'blue') {
                STAGES[5].lines = [
                    `You chose the blue box.`,
                    `You walk away with a guaranteed $1,000.`,
                    `Safe. Practical.`,
                    `The test continues.`
                ];
            } else {
                const win = Math.random() < 0.1;
                if (win) {
                    STAGES[5].lines = [
                        `You chose the red box.`,
                        `...`,
                        `The lock clicks. It's full.`,
                        `$100,000 is yours.`,
                        `Fortune favors the bold.`,
                        `The test continues.`
                    ];
                } else {
                    STAGES[5].lines = [
                        `You chose the red box.`,
                        `...`,
                        `It's empty.`,
                        `You leave with nothing.`,
                        `Greed is a gamble.`,
                        `The test continues.`
                    ];
                }
            }
            return 5;
        }
    },
    5: {
        lines: [],
        hoverRed: "",
        hoverBlue: "",
        onVote: (color) => {
            return 6;
        }
    },
    6: {
        lines: [
            `You are now paired with an exact clone of yourself.`,
            `It has the same memories and thought patterns.`,
            `The clone is convinced that you are the clone.`,
            `Both of you must choose simultaneously.`,
            `If you both choose <span class="text-blue">BLUE</span>, you both live.`,
            `If either chooses <span class="text-red">RED</span>, only the one who chose <span class="text-red">RED</span> survives.`,
            `But remember...`,
            `Your clone is thinking the exact same thing.`
        ],
        hoverRed: "CHOOSE RED",
        hoverBlue: "CHOOSE BLUE",
        onVote: (color) => {
            updateMoralAlignment(color === 'red' ? 1 : -1);
            return 7;
        }
    },
    7: {
        lines: [
            `We may have lied to you.`,
            `You were not voting to save or kill humanity.`,
            `It was just a test.`,
            `Now, 1,000 people will vote on whether you LIVE or DIE.`,
            `Do you change your vote?`
        ],
        hoverRed: "CHANGE MY VOTE",
        hoverBlue: "KEEP MY VOTE",
        onVote: (color) => {
            if (color === 'red') {
                STAGES[8].lines = [
                    `You changed your vote.`,
                    `Doubt is a powerful thing.`,
                    `The 1,000 people have made their decision.`,
                    `...`,
                    `The experiment is complete.`
                ];
            } else {
                STAGES[8].lines = [
                    `You stood by your choices.`,
                    `Unwavering until the end.`,
                    `The 1,000 people have made their decision.`,
                    `...`,
                    `The experiment is complete.`
                ];
            }
            return 8;
        }
    },
    8: {
        lines: [],
        hoverRed: "",
        hoverBlue: "",
        onVote: async (color) => {
            setTimeout(() => {
                showGameOver();
            }, 2000);
            return null;
        }
    }
};

let storyLines = STAGES[currentStage].lines;

// ===========================
// Audio System
// ===========================

function playKeystroke() {
    if (!audioCtx || audioCtx.state !== 'running' || !typeBuffer) return;
    const source = audioCtx.createBufferSource();
    source.buffer = typeBuffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.6;
    source.playbackRate.value = 0.85 + Math.random() * 0.3;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
}

function playChoiceSound(color) {
    if (!audioCtx || audioCtx.state !== 'running' || !buttonPressBuffer) return;
    const source = audioCtx.createBufferSource();
    source.buffer = buttonPressBuffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.8;
    // Optional: Pitch shift depending on color
    if (color === 'red') {
        source.playbackRate.value = 0.9;
    } else {
        source.playbackRate.value = 1.1;
    }
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
}

function playDissonantStab() {
    if (!audioCtx || audioCtx.state !== 'running') return;

    const freqs = [110, 116.54, 138.59, 155.56];
    freqs.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 3);
    });
}

function playInterferenceBurst() {
    if (!audioCtx || audioCtx.state !== 'running') return;

    const bufferSize = audioCtx.sampleRate * 0.15;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.08;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
}

async function startAudioEnvironment() {
    // Prevent concurrent execution (multiple clicks can fire this simultaneously)
    if (startAudioEnvironment._running) return;
    startAudioEnvironment._running = true;

    try {
        // Create context on first call (must be inside a user gesture)
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Always try to resume (browsers suspend contexts until user gesture)
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        // Decode preloaded ArrayBuffers safely supporting both callback and promise APIs
        const decodeSafe = (ab) => new Promise((resolve, reject) => {
            try {
                const res = audioCtx.decodeAudioData(ab, resolve, reject);
                if (res && res.catch) res.catch(reject);
            } catch (e) { reject(e); }
        });

        if (rawTypeAB && !typeBuffer) {
            const ab = rawTypeAB;
            rawTypeAB = null;
            try { typeBuffer = await decodeSafe(ab); } catch (e) { console.error(e); }
        }
        if (rawDroneAB && !droneBuffer) {
            const ab = rawDroneAB;
            rawDroneAB = null;
            try { droneBuffer = await decodeSafe(ab); } catch (e) { console.error(e); }
        }
        if (rawBtnAB && !buttonPressBuffer) {
            const ab = rawBtnAB;
            rawBtnAB = null;
            try { buttonPressBuffer = await decodeSafe(ab); } catch (e) { console.error(e); }
        }

        // Start the ambient drone (only once)
        if (droneBuffer && !droneSource) {
            droneSource = audioCtx.createBufferSource();
            droneSource.buffer = droneBuffer;
            droneSource.loop = true;
            const droneGain = audioCtx.createGain();
            droneGain.gain.setValueAtTime(0, audioCtx.currentTime);
            droneGain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 4);
            droneSource.connect(droneGain);
            droneGain.connect(audioCtx.destination);
            droneSource.start();
        }

        // Only set up recurring effects once
        if (!audioEnvironmentStarted) {
            audioEnvironmentStarted = true;

            // Eerie drum pulse
            const drumInterval = setInterval(() => {
                if (!audioCtx || audioCtx.state !== 'running') return;
                const drumOsc = audioCtx.createOscillator();
                const drumGain = audioCtx.createGain();

                drumOsc.type = 'sine';
                drumOsc.frequency.setValueAtTime(150, audioCtx.currentTime);
                drumOsc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

                drumGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
                drumGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

                drumOsc.connect(drumGain);
                drumGain.connect(audioCtx.destination);

                drumOsc.start();
                drumOsc.stop(audioCtx.currentTime + 0.5);
            }, 8000);
            activeIntervals.push(drumInterval);

            // Random interference bursts
            const interferenceInterval = setInterval(() => {
                if (Math.random() < 0.3) {
                    playInterferenceBurst();
                    triggerGlitchTear();
                }
            }, 12000);
            activeIntervals.push(interferenceInterval);
        }
    } catch (e) {
        console.log("Audio not supported:", e);
    } finally {
        startAudioEnvironment._running = false;
    }
}

// ===========================
// Visual Effects
// ===========================

function updateMoralAlignment(change) {
    moralAlignment += change;
    const intensity = Math.abs(moralAlignment) * 10;
    const r = moralAlignment > 0 ? 5 + intensity : 0;
    const b = moralAlignment < 0 ? 5 + intensity : 0;
    const g = moralAlignment < 0 ? Math.max(0, 5 + intensity - 5) : 0;
    document.body.style.setProperty('--pulse-color', `rgb(${r}, ${g}, ${b})`);

    // Increase static noise with alignment extremity
    const staticIntensity = Math.min(0.08, Math.abs(moralAlignment) * 0.015);
    document.body.style.setProperty('--static-opacity', staticIntensity);

    if (audioCtx && audioCtx.state === 'running') {
        triggerGlitch(200);
    }
}

function triggerGlitch(duration = 300) {
    textDisplay.classList.add('glitch-effect');
    setTimeout(() => {
        textDisplay.classList.remove('glitch-effect');
    }, duration);
}

function triggerGlitchTear() {
    glitchTear.classList.remove('active');
    void glitchTear.offsetWidth;
    glitchTear.style.top = Math.random() * 80 + 'vh';
    glitchTear.classList.add('active');
    setTimeout(() => {
        glitchTear.classList.remove('active');
    }, 150);
}

function triggerScreenShake() {
    document.body.classList.add('screen-shake');
    setTimeout(() => {
        document.body.classList.remove('screen-shake');
    }, 400);
}

// ===========================
// CRT Static Noise
// ===========================

function initStaticNoise() {
    const ctx = staticCanvas.getContext('2d');
    let w, h;

    function resize() {
        w = staticCanvas.width = window.innerWidth / 4;
        h = staticCanvas.height = window.innerHeight / 4;
    }
    resize();
    window.addEventListener('resize', resize);

    function drawStatic() {
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const v = Math.random() * 255;
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
            data[i + 3] = 30;
        }
        ctx.putImageData(imageData, 0, 0);
        requestAnimationFrame(drawStatic);
    }
    drawStatic();
}

// ===========================
// Particle System
// ===========================

function initParticles() {
    const count = 25;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (15 + Math.random() * 25) + 's';
        p.style.animationDelay = -(Math.random() * 30) + 's';
        p.style.width = (1 + Math.random() * 2) + 'px';
        p.style.height = p.style.width;
        p.style.opacity = 0.05 + Math.random() * 0.15;
        particlesContainer.appendChild(p);
    }
}

// ===========================
// Hesitation System
// ===========================

function startHesitationTimer() {
    clearTimeout(hesitationTimer);
    hesitationTimer = setTimeout(() => {
        if (showingChoice) {
            const thoughts = [
                "Analysis: Latency detected in decision matrix.",
                "The previous participants were 40% more efficient.",
                "Are you attempting to calculate the uncalculable?",
                "Hesitation is a measurable variable. We are recording it.",
                "The clock is ticking. The void is patient."
            ];
            const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
            textDisplay.innerHTML = `<span class="glitch-effect" style="font-size: 0.7em; opacity: 0.6; color: #ff3333;">${randomThought}</span><br>Choose.`;
            triggerGlitch(500);
            playInterferenceBurst();
        }
    }, 15000);
}

// ===========================
// Text Engine
// ===========================

function typeText(htmlStr, callback) {
    isAnimating = true;
    let currentHTML = "";

    const parts = htmlStr.split(/(<[^>]*>)/g);
    let currentPartIndex = 0;
    let charIndex = 0;

    function typeNextChar() {
        if (currentPartIndex >= parts.length) {
            isAnimating = false;
            if (callback) callback();
            return;
        }

        const part = parts[currentPartIndex];

        if (part.startsWith('<')) {
            currentHTML += part;
            textDisplay.innerHTML = currentHTML + '<span class="cursor">█</span>';
            currentPartIndex++;
            typeNextChar();
        } else {
            if (charIndex < part.length) {
                currentHTML += part[charIndex];
                textDisplay.innerHTML = currentHTML + '<span class="cursor">█</span>';
                charIndex++;
                if (charIndex % 2 === 0) playKeystroke();

                typeInterval = setTimeout(typeNextChar, 20 + Math.random() * 40);
            } else {
                currentPartIndex++;
                charIndex = 0;
                typeNextChar();
            }
        }
    }

    typeNextChar();
}

function showNextLine() {
    if (isAnimating) {
        clearTimeout(typeInterval);
        textDisplay.innerHTML = currentTextStr;
        isAnimating = false;
        return;
    }

    if (currentLineIndex >= storyLines.length) {
        if (!showingChoice) {
            if (currentStage === 5 || currentStage === 8) {
                showingChoice = true;
                handleVote(null);
            } else {
                showChoice();
            }
        }
        return;
    }

    currentTextStr = storyLines[currentLineIndex];

    triggerGlitch(150);
    typeText(currentTextStr);
    currentLineIndex++;
}

function showChoice() {
    showingChoice = true;
    triggerGlitch(300);
    textDisplay.classList.add('fade-out');
    setTimeout(() => {
        textDisplay.innerHTML = 'Choose.';
        choiceContainer.classList.remove('hidden');
        startHesitationTimer();
        textDisplay.classList.remove('fade-out');
    }, 300);
}

// ===========================
// Game Over
// ===========================

function showGameOver() {
    // Clean up all intervals
    activeIntervals.forEach(id => clearInterval(id));

    // Reset body styles
    document.body.style.filter = '';
    document.body.style.transform = '';
    document.body.style.transition = '';
    document.body.classList.remove('screen-shake');

    // Hide game, show ending
    gameContainer.classList.add('hidden');

    const gameOver = document.getElementById('game-over');
    const line1 = document.getElementById('game-over-line1');
    const line2 = document.getElementById('game-over-line2');

    // Moral summary
    let verdict;
    if (moralAlignment >= 2) {
        verdict = "CLASSIFICATION: SELF-PRESERVING";
    } else if (moralAlignment <= -2) {
        verdict = "CLASSIFICATION: ALTRUISTIC";
    } else {
        verdict = "CLASSIFICATION: INDETERMINATE";
    }

    line1.textContent = verdict;
    line2.textContent = "EXPERIMENT CONCLUDED — SESSION ARCHIVED";

    gameOver.classList.remove('hidden');

    // Slow fade to true black
    setTimeout(() => {
        gameOver.style.transition = 'opacity 8s ease-out';
        gameOver.querySelector('.game-over-text').style.transition = 'opacity 8s ease-out';
        gameOver.querySelector('.game-over-text').style.opacity = '0';
    }, 6000);
}

// ===========================
// Entry Gate
// ===========================

function dismissEntryGate() {
    if (gameStarted) return;
    gameStarted = true;

    startAudioEnvironment();

    entryGate.classList.add('dismissed');
    setTimeout(() => {
        entryGate.style.display = 'none';
        gameContainer.classList.add('active');
        showNextLine();
    }, 1000);
}

// ===========================
// Vote Handler
// ===========================

async function handleVote(color) {
    redBtn.disabled = true;
    blueBtn.disabled = true;
    choiceContainer.classList.add('hidden');
    clearTimeout(hesitationTimer);

    // Visual + audio feedback
    hoverSummary.classList.remove('visible');
    triggerScreenShake();
    if (color) playChoiceSound(color);

    const nextStage = await STAGES[currentStage].onVote(color);

    triggerGlitch(400);

    if (nextStage) {
        currentStage = nextStage;
        storyLines = STAGES[currentStage].lines;
        currentLineIndex = 0;
        showingChoice = false;

        textDisplay.classList.add('fade-out');
        setTimeout(() => {
            redBtn.disabled = false;
            blueBtn.disabled = false;
            textDisplay.classList.remove('fade-out');
            showNextLine();
        }, 600);
    } else {
        // End of game
        textDisplay.classList.add('fade-out');
        setTimeout(() => {
            textDisplay.innerHTML = '';
            textDisplay.classList.remove('fade-out');
            // showGameOver will be called by the stage's onVote timeout
        }, 600);
    }
}

// ===========================
// Event Listeners (pointerdown for touch + mouse)
// ===========================

entryGate.addEventListener('pointerdown', dismissEntryGate);

document.addEventListener('pointerdown', (e) => {
    if (!gameStarted) return;

    if (firstInteraction) {
        startAudioEnvironment();
        firstInteraction = false;
    }
    if (e.target instanceof Element && e.target.closest('button')) return;
    if (e.target instanceof Element && e.target.closest('#game-over')) return;
    if (e.target instanceof Element && e.target.closest('#entry-gate')) return;

    if (currentLineIndex <= storyLines.length) {
        showNextLine();
    }
});

function updateHoverSummary(text, colorClass) {
    if (!showingChoice || !text) return;
    hoverSummary.innerHTML = text;
    hoverSummary.className = colorClass + ' visible';
}

function clearHoverSummary() {
    hoverSummary.classList.remove('visible');
    hoverSummary.className = '';
}

redBtn.addEventListener('pointerenter', () => {
    if (STAGES[currentStage] && STAGES[currentStage].hoverRed) {
        updateHoverSummary(STAGES[currentStage].hoverRed, 'text-red');
    }
});
redBtn.addEventListener('pointerleave', clearHoverSummary);

blueBtn.addEventListener('pointerenter', () => {
    if (STAGES[currentStage] && STAGES[currentStage].hoverBlue) {
        updateHoverSummary(STAGES[currentStage].hoverBlue, 'text-blue');
    }
});
blueBtn.addEventListener('pointerleave', clearHoverSummary);

redBtn.addEventListener('click', (e) => {
    startAudioEnvironment();
    e.stopPropagation();
    handleVote('red');
});

blueBtn.addEventListener('click', (e) => {
    startAudioEnvironment();
    e.stopPropagation();
    handleVote('blue');
});

// ===========================
// Initialization
// ===========================

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

async function preloadSounds() {
    try {
        if (window.AUDIO_DATA) {
            rawTypeAB = base64ToArrayBuffer(window.AUDIO_DATA['single key press.mp3']);
            rawDroneAB = base64ToArrayBuffer(window.AUDIO_DATA['hum.mp3']);
            rawBtnAB = base64ToArrayBuffer(window.AUDIO_DATA['button press.mp3']);
            console.log('Audio files loaded from base64 data.');
        } else {
            console.error('Audio data not found! Ensure audio_data.js is loaded.');
        }
    } catch (e) {
        console.error("Audio load error:", e);
    }
}

window.onload = () => {
    initStaticNoise();
    initParticles();
    preloadSounds();
};
