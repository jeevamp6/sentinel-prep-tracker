import { auth, db } from './app.js';
import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc,
    limit
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Ensure Chart.js defaults fit the dark theme
Chart.defaults.color = '#8c8c94';
Chart.defaults.borderColor = '#2a2a35';
Chart.defaults.font.family = "'Inter', sans-serif";

auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        generateReports(user.uid);
    }
});

async function generateReports(userId) {
    try {
        // Fetch all necessary data
        const testsRef = collection(db, "users", userId, "tests");
        const tasksRef = collection(db, "users", userId, "tasks");
        const userDocRef = doc(db, "users", userId);

        const [testsSnapshot, tasksSnapshot, userDocSnap] = await Promise.all([
            getDocs(query(testsRef, orderBy("createdAt", "asc"))),
            getDocs(query(tasksRef, orderBy("date", "asc"))),
            getDoc(userDocRef)
        ]);

        // 1. Process Test Data
        let subjectScores = { 'Aptitude': [], 'DSA': [], 'Cybersecurity': [] };
        let testDates = [];
        let generalScores = [];

        testsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (subjectScores[data.subject]) {
                subjectScores[data.subject].push(data.percentage);
            }

            generalScores.push(data.percentage);
            if (data.createdAt) {
                testDates.push(data.createdAt.toDate().toLocaleDateString());
            } else {
                testDates.push('Recent');
            }
        });

        // Calculate averages for radar chart
        const avgScore = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const subAvgs = [
            avgScore(subjectScores['Aptitude']),
            avgScore(subjectScores['DSA']),
            avgScore(subjectScores['Cybersecurity'])
        ];

        // 2. Process Task Data
        let tasksByDate = {}; // Format: 'YYYY-MM-DD': { total: X, completed: Y }
        let totalTasks = 0;
        let completedTasksCount = 0;

        tasksSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const dStr = data.date;
            totalTasks++;

            if (!tasksByDate[dStr]) {
                tasksByDate[dStr] = { total: 0, completed: 0 };
            }
            tasksByDate[dStr].total++;
            if (data.completed) {
                tasksByDate[dStr].completed++;
                completedTasksCount++;
            }
        });

        const taskDates = Object.keys(tasksByDate).sort();
        const completionRates = taskDates.map(dStr => {
            return Math.round((tasksByDate[dStr].completed / tasksByDate[dStr].total) * 100);
        });

        // 3. Process LeetCode Data
        const lcData = userDocSnap.exists() && userDocSnap.data().leetcode ? userDocSnap.data().leetcode : { total: 0 };
        const lcScaledScore = Math.min((lcData.total / 300) * 100, 100); // Assume 300 solved is 100% readiness contribution

        // 4. Calculate Readiness Score
        // Formula: 40% Test Avg + 30% Task Completion Rate + 30% LeetCode Factor
        const overallTestAvg = avgScore(generalScores);
        const overallTaskRate = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;

        let readiness = Math.round((overallTestAvg * 0.4) + (overallTaskRate * 0.3) + (lcScaledScore * 0.3));

        // Render UI
        document.getElementById('readinessScore').innerText = `${readiness}%`;

        // Also dynamically update dashboard metric if report.js runs on Dashboard
        const dashScore = document.getElementById('dashboardScore');
        if (dashScore) {
            dashScore.innerText = `${readiness}%`;
            dashScore.style.color = readiness >= 70 ? 'var(--accent-primary)' : (readiness >= 40 ? '#ffb84d' : 'var(--accent-red)');
        }

        renderCharts(subAvgs, testDates, generalScores, taskDates, completionRates);

    } catch (error) {
        console.error("Error generating analytics:", error);
    }
}

function renderCharts(subjectAvgs, testDates, testScores, taskDates, completionRates) {
    // Subject Radar Chart
    const ctxRadar = document.getElementById('subjectChart');
    if (ctxRadar) {
        new Chart(ctxRadar, {
            type: 'radar',
            data: {
                labels: ['Aptitude', 'DSA', 'Cybersecurity'],
                datasets: [{
                    label: 'Average Score %',
                    data: subjectAvgs,
                    backgroundColor: 'rgba(0, 255, 102, 0.2)',
                    borderColor: '#00ff66',
                    pointBackgroundColor: '#00ff66',
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: { color: '#2a2a35' },
                        grid: { color: '#2a2a35' },
                        pointLabels: { color: '#e0e0e0', font: { family: "'Fira Code', monospace" } },
                        ticks: { backdropColor: 'transparent', color: '#8c8c94', min: 0, max: 100 }
                    }
                }
            }
        });
    }

    // Test Scores Line Chart
    const ctxLine = document.getElementById('testScoresChart');
    if (ctxLine && testDates.length > 0) {
        // Only show last 10
        const recentDates = testDates.slice(-10);
        const recentScores = testScores.slice(-10);

        new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: recentDates,
                datasets: [{
                    label: 'Score %',
                    data: recentScores,
                    borderColor: '#00ff66',
                    tension: 0.3,
                    fill: true,
                    backgroundColor: 'rgba(0, 255, 102, 0.05)'
                }]
            },
            options: { scales: { y: { min: 0, max: 100 } } }
        });
    }

    // Task Progress Bar Chart
    const ctxBar = document.getElementById('studyProgressChart');
    if (ctxBar && taskDates.length > 0) {
        new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: taskDates,
                datasets: [{
                    label: 'Daily Task Completion Rate %',
                    data: completionRates,
                    backgroundColor: '#00cc52',
                    borderRadius: 4
                }]
            },
            options: { scales: { y: { min: 0, max: 100 } } }
        });
    }
}
