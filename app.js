// app.js
// Firebase SDK Version 10.8.1
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { logger } from './logger.js';

// IMPORTANT: Replace this config with your actual Firebase Project config!
const firebaseConfig = {
    apiKey: "AIzaSyDEYgmraKVoWauib9NHm1W1eCSSquzXLBU",
    authDomain: "sentinel-prep-tracker-bu-4bf0a.firebaseapp.com",
    projectId: "sentinel-prep-tracker-bu-4bf0a",
    storageBucket: "sentinel-prep-tracker-bu-4bf0a.firebasestorage.app",
    messagingSenderId: "940390006307",
    appId: "1:940390006307:web:96a9bf771c87e7df483b96"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- PROTECTED ROUTES & GLOBAL UI SETTINGS ---
const currentPath = window.location.pathname;
const currentPage = currentPath.split('/').pop() || 'index.html';

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    const isGuest = localStorage.getItem('sentinel_guest') === 'true';
    const isAdmin = localStorage.getItem('sentinel_admin_verified') === 'true';

    // Global Route Protection Logic
    if (isAdmin && currentPage === 'admin.html') {
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        const userAvatar = document.getElementById('userAvatar');
        if (userEmailDisplay) userEmailDisplay.textContent = localStorage.getItem('sentinel_admin_id') || 'ADMIN_OVERRIDE';
        if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-shield-alt"></i>';
            userAvatar.style.backgroundColor = 'var(--bg-hover)';
            userAvatar.style.color = 'var(--accent-red)';
            userAvatar.style.border = '1px solid var(--accent-red)';
        }
        return; // Safe harbor for ID card admins on this specific page
    }

    if (user && user.emailVerified) {
        // Authenticated Verified User
        if (currentPage === 'login.html' || currentPage === '') {
            window.location.href = 'index.html';
        }

        // Extra Admin Route Protection block for standard logged-in users
        if (currentPage === 'admin.html' && !isAdmin) {
            console.warn("Unauthorized admin access attempt");
        }

        const userEmailDisplay = document.getElementById('userEmailDisplay');
        const userAvatar = document.getElementById('userAvatar');
        if (userEmailDisplay) userEmailDisplay.textContent = user.email;
        if (userAvatar) userAvatar.textContent = user.email.charAt(0).toUpperCase();

    } else if (isGuest) {
        // Guest User Session
        if (currentPage === 'login.html' || currentPage === '') {
            window.location.href = 'index.html';
        }
        if (currentPage === 'admin.html') {
            window.location.href = 'index.html';
        }

        const userEmailDisplay = document.getElementById('userEmailDisplay');
        const userAvatar = document.getElementById('userAvatar');
        if (userEmailDisplay) userEmailDisplay.textContent = 'GUEST_OPERATIVE';
        if (userAvatar) {
            userAvatar.textContent = 'G';
            userAvatar.style.backgroundColor = 'var(--text-secondary)';
        }

        // Enforce Read-Only State for Guests Globally
        setTimeout(() => {
            const disableElements = () => {
                const actionButtons = document.querySelectorAll('button:not(#logoutBtn):not(.nav-icon)');
                actionButtons.forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    btn.title = 'Action restricted in Guest Mode';
                });

                const testCards = document.querySelectorAll('.test-card');
                testCards.forEach(card => {
                    card.style.opacity = '0.5';
                    card.style.cursor = 'not-allowed';
                    card.style.pointerEvents = 'none';
                    card.title = 'Testing restricted in Guest Mode';
                });
            };

            disableElements();
            // Re-run in case dynamic content loads
            setInterval(disableElements, 2000);
        }, 500);

    } else {
        // Unauthenticated & Not Guest
        if (user && !user.emailVerified && currentPage !== 'login.html' && currentPage !== 'admin-login.html') {
            window.location.href = 'login.html';
        } else if (!user && currentPage !== 'login.html' && currentPage !== 'admin-login.html') {
            window.location.href = 'login.html';
        }
    }
});

// --- GLOBAL LOGOUT LOGIC ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        logger.logEvent("LOGOUT", "Operative disconnected", "INFO");
        localStorage.removeItem('sentinel_guest');
        localStorage.removeItem('sentinel_admin_verified');

        signOut(auth).then(() => {
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error("Logout Error:", error);
        });
    });
}
