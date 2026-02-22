import { db } from './app.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { logger } from './logger.js';

const adminLoginForm = document.getElementById('adminLoginForm');
const alertBox = document.getElementById('alertBox');
const loginBtn = document.getElementById('loginBtn');

// Auto-seed the "89SC78" Admin ID into the database for the user as requested
const seedMasterAdmin = async () => {
    try {
        const masterRef = doc(db, "admins", "89SC78");
        const masterSnap = await getDoc(masterRef);
        if (!masterSnap.exists()) {
            await setDoc(masterRef, {
                company: "Sentinel HQ",
                name: "Master Admin",
                passphrase: "OVERRIDE_007",
                role: "Level 5 Executive"
            });
            console.log("[SYSTEM] Master Admin ID seeded into database.");
        }
    } catch (err) {
        console.warn("Could not seed auto-admin, check Firestore rules:", err);
    }
};

seedMasterAdmin();

function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    if (type === 'error') {
        alertBox.style.backgroundColor = "rgba(255, 60, 60, 0.1)";
        alertBox.style.color = "var(--accent-red)";
        alertBox.style.border = "1px solid var(--accent-red)";
    }
    alertBox.classList.remove('hidden');
}

function hideAlert() {
    alertBox.classList.add('hidden');
}

if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const idCard = document.getElementById('adminIdCard').value.trim().toUpperCase();
        const passphrase = document.getElementById('adminPassphrase').value;

        loginBtn.textContent = 'VERIFYING ID CREDENTIALS...';
        loginBtn.disabled = true;

        try {
            const adminDocRef = doc(db, "admins", idCard);
            const adminSnap = await getDoc(adminDocRef);

            if (!adminSnap.exists()) {
                showAlert("ACCESS DENIED: Invalid Security ID Card.");
                logger.logEvent("ADMIN_LOGIN_FAILED", `Unknown ID Card attempt: ${idCard}`, "CRITICAL", "Unknown");
                loginBtn.textContent = 'INITIATE OVERRIDE [ENTER]';
                loginBtn.disabled = false;
                return;
            }

            const adminData = adminSnap.data();

            if (adminData.passphrase !== passphrase) {
                showAlert("ACCESS DENIED: Invalid Override Passphrase.");
                logger.logEvent("ADMIN_LOGIN_FAILED", `Invalid passphrase for ID: ${idCard}`, "CRITICAL", idCard);
                loginBtn.textContent = 'INITIATE OVERRIDE [ENTER]';
                loginBtn.disabled = false;
                return;
            }

            // Flag local storage for admin route bypass
            localStorage.setItem('sentinel_admin_verified', 'true');
            localStorage.setItem('sentinel_admin_id', idCard);
            localStorage.setItem('sentinel_admin_name', adminData.name || 'Admin');

            logger.logEvent("ADMIN_LOGIN_SUCCESS", `Admin override initiated successfully for ${idCard}`, "INFO", idCard);

            showAlert('Override Successful. Entering Command Center...', 'success');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);

        } catch (error) {
            showAlert(`System Error: ${error.message}`);
            logger.logEvent("ADMIN_LOGIN_ERROR", `Firestore Error: ${error.message}`, "ERROR", idCard);
            loginBtn.textContent = 'INITIATE OVERRIDE [ENTER]';
            loginBtn.disabled = false;
        }
    });
}
