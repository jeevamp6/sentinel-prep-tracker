import { auth, db } from './app.js';
import {
    doc,
    setDoc,
    getDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        initProgramming(user.uid);
    }
});

function initProgramming(userId) {
    const userDocRef = doc(db, "users", userId);

    // UI Elements
    const lcForm = document.getElementById('lcForm');
    const lcAlert = document.getElementById('lcAlert');

    // Live update listener for the profile doc (to update stats everywhere)
    onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.leetcode) {
                updateUI(data.leetcode);
            }
        }
    });

    if (lcForm) {
        lcForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let usernameInput = document.getElementById('lcUsername').value.trim();

            // Clean the username input (in case they pasted a full URL like https://leetcode.com/u/username/)
            let username = usernameInput;
            try {
                const url = new URL(usernameInput);
                const allowedHosts = new Set([
                    'leetcode.com',
                    'www.leetcode.com',
                    'leetcode.cn',
                    'www.leetcode.cn'
                ]);

                if (allowedHosts.has(url.hostname)) {
                    const pathSegments = url.pathname.split('/').filter(Boolean);
                    if (pathSegments.length > 0) {
                        // Prefer the last non-empty path segment as username
                        username = pathSegments[pathSegments.length - 1];
                    }
                }
            } catch (e) {
                // If usernameInput is not a valid URL, fall back to treating it as a plain username
            }

            // Remove any stray slashes from the derived username
            username = username.replace(/\//g, '');

            const btn = document.getElementById('lcSyncBtn');

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
            btn.disabled = true;
            hideAlert();

            try {
                // Fetch using the stable public REST API requested by user
                const response = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${username}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch data. The API might be down.");
                }

                const data = await response.json();

                // Handle valid API response but invalid username or errors array
                if (data.errors && data.errors.length > 0) {
                    throw new Error(data.errors[0].message || "Invalid username.");
                }

                if (data.totalSolved === undefined) {
                    throw new Error("Could not fetch data. Username might be invalid.");
                }

                const lcStats = {
                    username: username,
                    total: data.totalSolved || 0,
                    easy: data.easySolved || 0,
                    medium: data.mediumSolved || 0,
                    hard: data.hardSolved || 0,
                    lastSynced: new Date().toISOString()
                };

                // Save to Firestore using setDoc with merge to avoid overwriting other user data
                await setDoc(userDocRef, { leetcode: lcStats }, { merge: true });

                showAlert("System synchronization complete.", "success");
            } catch (err) {
                console.error(err);
                showAlert(`Sync Failed: ${err.message}`, "error");
            } finally {
                btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Data';
                btn.disabled = false;
            }
        });
    }
}

function updateUI(stats) {
    // If we are on programming.html
    const lcTotal = document.getElementById('lcTotal');
    if (lcTotal) {
        document.getElementById('lcUsername').value = stats.username || '';
        lcTotal.innerText = stats.total;
        document.getElementById('lcEasy').innerText = stats.easy;
        document.getElementById('lcMed').innerText = stats.medium;
        document.getElementById('lcHard').innerText = stats.hard;

        const syncDate = new Date(stats.lastSynced);
        document.getElementById('lcLastSync').innerText = syncDate.toLocaleString();
    }

    // If we are on index.html (Dashboard)
    const dashLcTotal = document.getElementById('dashboardLcTotal');
    if (dashLcTotal) {
        dashLcTotal.innerText = stats.total;
        document.getElementById('dashLcEasy').innerText = stats.easy;
        document.getElementById('dashLcMed').innerText = stats.medium;
        document.getElementById('dashLcHard').innerText = stats.hard;
    }
}

function showAlert(message, type) {
    const alertBox = document.getElementById('lcAlert');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
        alertBox.classList.remove('hidden');
    }
}

function hideAlert() {
    const alertBox = document.getElementById('lcAlert');
    if (alertBox) {
        alertBox.classList.add('hidden');
    }
}
