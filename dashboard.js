import { auth, db } from './app.js';
import {
    doc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        initDashboard(user.uid);
    }
});

function initDashboard(userId) {
    const userDocRef = doc(db, "users", userId);

    let leetcodeData = { total: 0, easy: 0, medium: 0, hard: 0 };
    let taskCompletionRate = 0;
    let testAverage = 0;

    // 1. Live update listener for the profile doc (LeetCode stats)
    onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.leetcode) {
                leetcodeData = data.leetcode;
                const dashLcTotal = document.getElementById('dashboardLcTotal');
                if (dashLcTotal) {
                    dashLcTotal.innerText = leetcodeData.total || '0';
                    document.getElementById('dashLcEasy').innerText = leetcodeData.easy || '0';
                    document.getElementById('dashLcMed').innerText = leetcodeData.medium || '0';
                    document.getElementById('dashLcHard').innerText = leetcodeData.hard || '0';
                }
            }
            calculateReadiness();
        }
    });

    // 2. Schedule Stats (Daily Operations)
    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    const tasksRef = collection(db, "users", userId, "tasks");
    const todayQuery = query(tasksRef, where("date", "==", getTodayStr()));

    onSnapshot(todayQuery, (snapshot) => {
        let completedCount = 0;
        let totalCount = snapshot.docs.length;

        snapshot.forEach((docSnap) => {
            if (docSnap.data().completed) completedCount++;
        });

        const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
        taskCompletionRate = percentage;

        const dashProgressText = document.getElementById('dashboardTaskStats');
        const dashProgressBar = document.getElementById('dashboardTaskProgress');

        if (dashProgressText) dashProgressText.innerText = `${completedCount}/${totalCount}`;
        if (dashProgressBar) dashProgressBar.style.width = `${percentage}%`;

        calculateReadiness();
    });

    // 3. One-off fetch for historical test averages for readiness score
    const testsRef = collection(db, "users", userId, "tests");
    getDocs(testsRef).then(snapshot => {
        let totalTestScore = 0;
        let testCount = snapshot.docs.length;

        snapshot.forEach(docSnap => {
            totalTestScore += docSnap.data().percentage || 0;
        });

        testAverage = testCount > 0 ? (totalTestScore / testCount) : 0;
        calculateReadiness();
    }).catch(err => console.error("Error fetching test data:", err));

    // Calculate Final Placement Readiness
    function calculateReadiness() {
        // Formula matching reports: 40% Test Avg + 30% Task Completion Rate + 30% LeetCode Factor
        const lcScaledScore = Math.min(((leetcodeData.total || 0) / 300) * 100, 100);

        let readiness = Math.round((testAverage * 0.4) + (taskCompletionRate * 0.3) + (lcScaledScore * 0.3));

        const dashboardScore = document.getElementById('dashboardScore');
        if (dashboardScore) {
            dashboardScore.innerText = `${readiness}%`;
            dashboardScore.style.color = readiness >= 70 ? 'var(--accent-primary)' : (readiness >= 40 ? '#ffb84d' : 'var(--accent-red)');
        }
    }
}
