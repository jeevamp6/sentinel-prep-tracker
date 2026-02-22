import { db } from './app.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { logger } from './logger.js';

const adminContent = document.getElementById('adminContent');
const adminAccessDenied = document.getElementById('adminAccessDenied');
const adminKeyForm = document.getElementById('adminKeyForm');
const globalGeminiKeyInput = document.getElementById('globalGeminiKey');
const adminAlert = document.getElementById('adminAlert');

// Check Admin Access based on ID Card LocalStorage Flag
function initAdmin() {
    const isAdminVerified = localStorage.getItem('sentinel_admin_verified') === 'true';
    const adminId = localStorage.getItem('sentinel_admin_id');

    if (isAdminVerified && adminId) {
        // User is ID Card admin
        adminAccessDenied.classList.add('hidden');
        adminContent.classList.remove('hidden');
        loadGlobalSettings();

        // Update top bar to show admin ID instead of email
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        const userAvatar = document.getElementById('userAvatar');
        if (userEmailDisplay) userEmailDisplay.textContent = adminId;
        if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-shield-alt"></i>';
            userAvatar.style.backgroundColor = 'var(--bg-hover)';
            userAvatar.style.color = 'var(--accent-red)';
            userAvatar.style.border = '1px solid var(--accent-red)';
        }
    } else {
        // Not admin or session expired
        adminContent.classList.add('hidden');
        adminAccessDenied.classList.remove('hidden');
    }
}

// Run immediately instead of waiting for Firebase Auth
initAdmin();

async function loadGlobalSettings() {
    try {
        const settingsRef = doc(db, "settings", "global");
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            if (data.geminiApiKey) {
                // Obfuscate the key for display so it isn't fully readable when revisiting
                globalGeminiKeyInput.value = data.geminiApiKey;
            }
        }
    } catch (error) {
        console.error("Failed to load settings:", error);
    }
}

if (adminKeyForm) {
    adminKeyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = globalGeminiKeyInput.value.trim();
        const btn = document.getElementById('saveGlobalKeyBtn');

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            const settingsRef = doc(db, "settings", "global");
            // Set user to settings
            await setDoc(settingsRef, {
                geminiApiKey: key,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            adminAlert.textContent = "Global settings updated successfully.";
            adminAlert.className = "alert alert-success";
            adminAlert.classList.remove('hidden');
            setTimeout(() => adminAlert.classList.add('hidden'), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            adminAlert.textContent = "Error saving settings. Check console or database rules.";
            adminAlert.className = "alert alert-error";
            adminAlert.classList.remove('hidden');
        } finally {
            btn.innerHTML = '<i class="fas fa-save"></i> Save Global Key';
            btn.disabled = false;
        }
    });
}

// SOC Live Monitoring Logic
const socTerminal = document.getElementById('socTerminal');
const networkTableBody = document.getElementById('networkTableBody');
const aiHealthStatus = document.getElementById('aiHealthStatus');
const syncHealthStatus = document.getElementById('syncHealthStatus');

let lastLogCount = 0;
let lastNetCount = 0;

function updateSOCPanel() {
    // 1. Update Activity Logs
    const currentLogs = logger.getLogs() || [];
    if (currentLogs.length !== lastLogCount && socTerminal) {
        socTerminal.innerHTML = '';
        currentLogs.forEach(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            let color = 'var(--text-primary)';
            if (log.status === 'ERROR' || log.status === 'CRITICAL') color = 'var(--accent-red)';
            if (log.status === 'SUCCESS') color = 'var(--accent-primary)';
            if (log.status === 'WARNING') color = '#ffb84d';

            socTerminal.innerHTML += `<div style="margin-bottom: 5px;">
                <span style="color: var(--text-secondary);">[${time}]</span> 
                <span style="color: ${color}; font-weight: bold;">[${log.status}]</span> 
                <span>${log.eventType}</span>: 
                <span style="color: var(--text-secondary);">${log.description}</span>
                <span style="font-size: 10px; color: #666;">(${log.userEmail})</span>
            </div>`;
        });
        socTerminal.scrollTop = socTerminal.scrollHeight;
        lastLogCount = currentLogs.length;
    }

    // 2. Update Network Logs
    const currentNetLogs = logger.getNetworkLogs() || [];
    if (currentNetLogs.length !== lastNetCount && networkTableBody) {
        networkTableBody.innerHTML = '';
        // Map in reverse to show newest first
        [...currentNetLogs].reverse().forEach(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const statusColor = log.success ? 'var(--accent-primary)' : 'var(--accent-red)';
            const methodColor = log.method === 'POST' ? '#00d2ff' : (log.method === 'GET' ? 'var(--accent-primary)' : '#ffb84d');

            networkTableBody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 10px; color: var(--text-secondary);">${time}</td>
                    <td style="padding: 10px; color: ${methodColor}; font-weight: bold;">${log.method}</td>
                    <td style="padding: 10px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.url}</td>
                    <td style="padding: 10px; color: ${statusColor}; font-weight: bold;">${log.status}</td>
                    <td style="padding: 10px; color: var(--text-secondary);">${log.responseTime}ms</td>
                </tr>
            `;
        });
        lastNetCount = currentNetLogs.length;

        // 3. Update Health Badges based on recent network traffic
        const recentGemini = currentNetLogs.filter(n => n.url.includes('generative')).pop();
        if (recentGemini) {
            if (recentGemini.success) {
                aiHealthStatus.textContent = 'ONLINE (GEMINI)';
                aiHealthStatus.style.color = 'var(--accent-primary)';
            } else {
                aiHealthStatus.textContent = 'OFFLINE (FALLBACK)';
                aiHealthStatus.style.color = 'var(--accent-red)';
            }
        }

        const recentLeetCode = currentNetLogs.filter(n => n.url.includes('leetcode')).pop();
        if (recentLeetCode) {
            if (recentLeetCode.success) {
                syncHealthStatus.textContent = 'ACTIVE';
                syncHealthStatus.style.color = 'var(--accent-primary)';
            } else {
                syncHealthStatus.textContent = 'FAULTS DETECTED';
                syncHealthStatus.style.color = 'var(--accent-red)';
            }
        }
    }
}

// Start polling
setInterval(updateSOCPanel, 1000);
