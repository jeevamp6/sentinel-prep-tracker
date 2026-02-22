import { auth, db } from './app.js';
import {
    collection,
    addDoc,
    doc,
    getDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { questionDB } from './questions.js';
let currentSubject = '';
let questions = [];
let currentQIndex = 0;
let score = 0;
let timerInterval;
let timeRemaining = 300; // 5 minutes

// UI Elements
const selectionModule = document.getElementById('testSelectionModule');
const quizModule = document.getElementById('quizModule');
const resultModule = document.getElementById('resultModule');
const historyList = document.getElementById('testHistoryList');

// AI Key Management
const aiKeyInput = document.getElementById('geminiKey');
const saveAiKeyBtn = document.getElementById('saveAiKeyBtn');
const aiAlert = document.getElementById('aiAlert');

auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        initTests(user.uid);
    }
});

function initTests(userId) {
    // UI Elements for Hybrid Mode
    // Remove manual key UI saving capabilities
    const modeBadge = document.getElementById('modeBadge');
    const systemNotificationBanner = document.getElementById('systemNotificationBanner');
    const systemNotificationText = document.getElementById('systemNotificationText');

    function defaultModeBadge() {
        if (modeBadge) {
            modeBadge.textContent = "AI SYSTEM READY";
            modeBadge.style.backgroundColor = "rgba(0, 255, 102, 0.2)";
            modeBadge.style.color = "var(--accent-primary)";
            modeBadge.style.borderColor = "var(--accent-primary)";
        }
    }

    defaultModeBadge();

    const testCards = document.querySelectorAll('.test-card');

    testCards.forEach(card => {
        card.addEventListener('click', () => {
            const subject = card.getAttribute('data-subject');
            startTest(subject);
        });
    });

    // Load History
    if (historyList) {
        const testsRef = collection(db, "users", userId, "tests");
        const q = query(testsRef, orderBy("createdAt", "desc"), limit(5));

        onSnapshot(q, (snapshot) => {
            historyList.innerHTML = '';
            if (snapshot.empty) {
                historyList.innerHTML = '<li style="padding: 10px 0;">No assessment records found.</li>';
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const dDate = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Just now';

                historyList.innerHTML += `
                    <li style="padding: 15px 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                        <span><strong style="color: var(--text-primary); font-family: var(--font-mono);">${data.subject}</strong></span>
                        <span>Score: <span style="color: ${data.percentage >= 60 ? 'var(--accent-primary)' : 'var(--accent-red)'}">${data.percentage}%</span> | ${dDate}</span>
                    </li>
                `;
            });
        });
    }

    document.getElementById('nextBtn').addEventListener('click', () => {
        evaluateAnswer();
        if (currentQIndex < questions.length - 1) {
            currentQIndex++;
            loadQuestion();
        } else {
            finishTest(userId);
        }
    });

    document.getElementById('returnBtn').addEventListener('click', () => {
        resultModule.classList.add('hidden');
        selectionModule.classList.remove('hidden');
    });
}

async function startTest(subject) {
    currentSubject = subject;
    currentQIndex = 0;
    score = 0;
    timeRemaining = 300;

    // UI Loading state
    selectionModule.classList.add('hidden');
    quizModule.classList.remove('hidden');
    document.getElementById('quizSubjectTitle').innerText = `Generating ${subject} Assessment...`;
    document.getElementById('questionText').innerText = "Establishing secure connection to AI mainframe...";
    document.getElementById('optionsContainer').innerHTML = "<p style='color: var(--accent-primary);'>Processing dynamic intelligence...</p>";
    document.getElementById('nextBtn').style.display = 'none';

    // Attempt to securely fetch Global Gemini Key from Firestore
    let globalApiKey = null;
    let aiSuccess = false;

    // Reset banner
    const banner = document.getElementById('systemNotificationBanner');
    if (banner) banner.style.display = 'none';

    try {
        const settingsRef = doc(db, "settings", "global");
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists() && settingsSnap.data().geminiApiKey) {
            globalApiKey = settingsSnap.data().geminiApiKey;
        }
    } catch (err) {
        console.warn("Failed to securely pull global API key (Offline/Missing permissions)");
    }

    // Fallback to the provided key if admin settings aren't configured in Firestore yet
    if (!globalApiKey) {
        globalApiKey = "AIzaSyAqTmiN-0blOHDYREAEI2EJ02NnjqQsLbU";
    }

    if (globalApiKey) {
        try {
            const prompt = `Generate exactly 5 multiple choice questions about ${subject} for an entry-level software engineering job interview. Return a JSON array containing objects. Each object must have: "q" (the question string), "options" (array of 4 string options), and "a" (integer 0-3 representing the index of the correct option).`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${globalApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error("Invalid response structure from Gemini API.");
            }

            // With responseMimeType="application/json", rawText should be valid JSON
            let rawText = data.candidates[0].content.parts[0].text;
            questions = JSON.parse(rawText.trim());
            if (!Array.isArray(questions) || questions.length !== 5) throw new Error("Invalid format returned");

            // XSS Sanitization mapping
            const sanitizeHTML = (str) => {
                const temp = document.createElement('div');
                temp.textContent = str;
                return temp.innerHTML;
            };

            questions = questions.map(q => ({
                q: sanitizeHTML(q.q),
                options: q.options.map(opt => sanitizeHTML(opt)),
                a: parseInt(q.a)
            }));

            aiSuccess = true;

            // Ensure UI shows AI mode
            const modeBadge = document.getElementById('modeBadge');
            if (modeBadge) {
                modeBadge.textContent = "AI MODE (GEMINI)";
                modeBadge.style.backgroundColor = "rgba(0, 255, 102, 0.2)";
                modeBadge.style.color = "var(--accent-primary)";
                modeBadge.style.borderColor = "var(--accent-primary)";
            }

        } catch (error) {
            console.error("Gemini AI Generation Failed/Timeout:", error);
            // Will fallback visually in the UI below via boolean check
        }
    }

    if (!aiSuccess) {
        // Safe Offline Mode Fallback
        if (banner) {
            banner.style.display = 'block';
            document.getElementById('systemNotificationText').textContent = globalApiKey
                ? "AI Generation encountered an error. Switched to Offline Question Bank Mode."
                : "No Global API Key detected by HQ. Local Offline Question Bank Mode Active.";
        }

        const modeBadge = document.getElementById('modeBadge');
        if (modeBadge) {
            modeBadge.textContent = "OFFLINE MODE";
            modeBadge.style.backgroundColor = "rgba(255, 184, 77, 0.2)";
            modeBadge.style.color = "#ffb84d";
            modeBadge.style.borderColor = "#ffb84d";
        }

        questions = questionDB[subject] || questionDB['Aptitude'];
    }

    document.getElementById('quizSubjectTitle').innerText = `${subject} Assessment`;
    loadQuestion();
    startTimer();
}

function loadQuestion() {
    const qData = questions[currentQIndex];
    document.getElementById('qCurrent').innerText = currentQIndex + 1;
    document.getElementById('questionText').innerText = qData.q;

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    qData.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.dataset.index = idx;

        btn.addEventListener('click', () => {
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('nextBtn').style.display = 'inline-block';
        });

        optionsContainer.appendChild(btn);
    });

    document.getElementById('nextBtn').style.display = 'none';

    // Change button text on last question
    if (currentQIndex === questions.length - 1) {
        document.getElementById('nextBtn').innerText = 'SUBMIT REPORT';
    } else {
        document.getElementById('nextBtn').innerText = 'NEXT [ENTER]';
    }
}

function evaluateAnswer() {
    const selectedBtn = document.querySelector('.option-btn.selected');
    if (selectedBtn) {
        const selectedIdx = parseInt(selectedBtn.dataset.index);
        if (selectedIdx === questions[currentQIndex].a) {
            score++;
        }
    }
}

function startTimer() {
    clearInterval(timerInterval);
    const timerDisplay = document.getElementById('quizTimer');

    timerInterval = setInterval(() => {
        timeRemaining--;
        const m = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        const s = (timeRemaining % 60).toString().padStart(2, '0');
        timerDisplay.innerText = `${m}:${s}`;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            finishTest(auth.currentUser.uid); // auto submit
        }
    }, 1000);
}

async function finishTest(userId) {
    clearInterval(timerInterval);
    quizModule.classList.add('hidden');
    resultModule.classList.remove('hidden');

    const percentage = Math.round((score / questions.length) * 100);

    document.getElementById('correctAnswers').innerText = score;
    document.getElementById('incorrectAnswers').innerText = questions.length - score;
    document.getElementById('finalScoreDisplay').innerText = `${percentage}%`;
    document.getElementById('finalScoreDisplay').style.color = percentage >= 60 ? 'var(--accent-primary)' : 'var(--accent-red)';

    // Save to Firestore
    try {
        const testsRef = collection(db, "users", userId, "tests");
        await addDoc(testsRef, {
            subject: currentSubject,
            score: score,
            total: questions.length,
            percentage: percentage,
            createdAt: serverTimestamp()
        });
    } catch (err) {
        console.error("Failed to save test result", err);
    }
}
