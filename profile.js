import { auth, db } from './app.js';
import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        initProfile(user);
    }
});

async function initProfile(user) {
    // Populate Static Info
    document.getElementById('profileAvatar').innerText = user.email.charAt(0).toUpperCase();
    document.getElementById('profileEmail').innerText = user.email;
    document.getElementById('profileUid').innerText = user.uid;

    // Force Logout Button
    document.getElementById('profileLogoutBtn').addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'login.html';
        });
    });

    const userDocRef = doc(db, "users", user.uid);
    const profileForm = document.getElementById('profileForm');
    const saveBtn = document.getElementById('saveProfileBtn');
    const alertBox = document.getElementById('settingsAlert');

    // Load existing settings
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.profile) {
                document.getElementById('displayName').value = data.profile.displayName || '';
                document.getElementById('careerGoal').value = data.profile.careerGoal || '';
                document.getElementById('studyTarget').value = data.profile.studyTarget || '';
                document.getElementById('bio').value = data.profile.bio || '';
            }
        }
    } catch (err) {
        console.error("Error loading profile", err);
    }

    // Save settings
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.innerText = 'SAVING...';
        saveBtn.disabled = true;
        alertBox.classList.add('hidden');

        // Basic XSS escaping/sanitization
        const escapeHTML = str => str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag]));

        const profileData = {
            displayName: escapeHTML(document.getElementById('displayName').value.trim()),
            careerGoal: escapeHTML(document.getElementById('careerGoal').value.trim()),
            studyTarget: parseInt(document.getElementById('studyTarget').value) || 0,
            bio: escapeHTML(document.getElementById('bio').value.trim())
        };

        try {
            await setDoc(userDocRef, { profile: profileData }, { merge: true });

            alertBox.textContent = "Parameters updated successfully.";
            alertBox.className = "alert alert-success";
            alertBox.classList.remove('hidden');
        } catch (err) {
            console.error("Error saving profile", err);
            alertBox.textContent = "Error updating parameters.";
            alertBox.className = "alert alert-error";
            alertBox.classList.remove('hidden');
        } finally {
            saveBtn.innerText = 'UPDATE PARAMETERS';
            saveBtn.disabled = false;
        }
    });
}
