// auth.js
import { auth } from './app.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { logger } from './logger.js';

// UI Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const toggleContainer = document.getElementById('toggleAuthMode');
const alertBox = document.getElementById('alertBox');
const verificationSection = document.getElementById('verificationSection');

let isLoginMode = true;

// Utility functions
function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove('hidden');
}

function hideAlert() {
    alertBox.classList.add('hidden');
}

function attachToggleListener() {
    const showSignupBtn = document.getElementById('showSignup');
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;

            if (isLoginMode) {
                loginForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
                toggleContainer.innerHTML = 'New operative? <a href="#" id="showSignup">Request access</a>';
            } else {
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
                toggleContainer.innerHTML = 'Already have clearance? <a href="#" id="showSignup">Login here</a>';
            }

            hideAlert();
            attachToggleListener(); // Re-attach to the newly created anchor tag
        });
    }
}

// Initial attachment
attachToggleListener();

// Handle Login
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAlert();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');

        loginBtn.textContent = 'AUTHENTICATING...';
        loginBtn.disabled = true;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                if (!user.emailVerified) {
                    showAlert('Access Denied. Email verification required.', 'error');
                    auth.signOut(); // Sign them out immediately
                    loginBtn.textContent = 'LOGIN [ENTER]';
                    loginBtn.disabled = false;
                } else {
                    showAlert('Authentication Successful. Decrypting dashboard...', 'success');
                    // Note: The observer in app.js handles the redirect to index.html
                }
            })
            .catch((error) => {
                showAlert(`Error: ${error.message}`);
                logger.logEvent("LOGIN_ERROR", `Failed login attempt: ${error.message}`, "WARNING", email);
                loginBtn.textContent = 'LOGIN [ENTER]';
                loginBtn.disabled = false;
            });
    });
}

// Handle Guest Access
const guestBtn = document.getElementById('guestBtn');
if (guestBtn) {
    guestBtn.addEventListener('click', () => {
        logger.logEvent("GUEST_LOGIN", "Guest session initiated", "INFO", "Guest_User");
        localStorage.setItem('sentinel_guest', 'true');
        window.location.href = 'index.html';
    });
}

// Handle Signup
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAlert();

        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const signupBtn = document.getElementById('signupBtn');

        signupBtn.textContent = 'ENCRYPTING CREDENTIALS...';
        signupBtn.disabled = true;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Send verification email (2FA)
                sendEmailVerification(userCredential.user)
                    .then(() => {
                        signupForm.classList.add('hidden');
                        verificationSection.classList.remove('hidden');
                        toggleContainer.classList.add('hidden');
                        alertBox.classList.add('hidden');

                        // Force signout so they must verify and login properly
                        auth.signOut();
                    });
            })
            .catch((error) => {
                showAlert(`Error: ${error.message}`);
                signupBtn.textContent = 'REGISTER';
                signupBtn.disabled = false;
            });
    });
}
