import { auth, db } from './app.js';
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Make sure auth is ready
auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        initSchedule(user.uid);
    }
});

function initSchedule(userId) {
    const taskForm = document.getElementById('taskForm');
    const taskList = document.getElementById('taskList');
    const progressBar = document.getElementById('taskProgressBar');
    const progressText = document.getElementById('taskProgressText');

    // Elements on Dashboard (if loaded there)
    const dashProgressText = document.getElementById('dashboardTaskStats');
    const dashProgressBar = document.getElementById('dashboardTaskProgress');

    const tasksRef = collection(db, "users", userId, "tasks");

    // Helper: generate todays date string YYYY-MM-DD
    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    // Add Task
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value;
            const category = document.getElementById('taskCategory').value;

            const submitBtn = taskForm.querySelector('button');
            submitBtn.disabled = true;

            try {
                await addDoc(tasksRef, {
                    title: title,
                    category: category,
                    completed: false,
                    date: getTodayStr(),
                    createdAt: serverTimestamp()
                });
                taskForm.reset();
            } catch (error) {
                console.error("Error adding document: ", error);
                alert("Failed to add task.");
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // Listen to today's tasks
    const todayQuery = query(tasksRef, where("date", "==", getTodayStr()));

    onSnapshot(todayQuery, (snapshot) => {
        let completedCount = 0;
        let totalCount = snapshot.docs.length;

        if (taskList) taskList.innerHTML = '';

        snapshot.forEach((docSnap) => {
            const task = docSnap.data();
            const taskId = docSnap.id;

            if (task.completed) completedCount++;

            // If on schedule.html, render the list
            if (taskList) {
                renderTask(taskId, task, taskList);
            }
        });

        const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

        // Update Schedule UI
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (progressText) progressText.innerText = `${completedCount}/${totalCount} Completed (${percentage}%)`;

        // Update Dashboard UI if present
        if (dashProgressText) dashProgressText.innerText = `${completedCount}/${totalCount}`;
        if (dashProgressBar) dashProgressBar.style.width = `${percentage}%`;
    });
}

function renderTask(id, task, container) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;

    // Format title strictly to prevent XSS (textContent vs innerHTML)
    const safeTitle = document.createTextNode(task.title);

    li.innerHTML = `
        <div class="task-info">
            <span class="task-category">${task.category}</span>
            <span class="task-text" id="title-${id}"></span>
        </div>
        <div class="task-actions">
            <button class="btn-complete" data-id="${id}" data-status="${task.completed}">
                <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
            </button>
            <button class="btn-delete" data-id="${id}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    // Append text node safely
    container.appendChild(li);
    document.getElementById(`title-${id}`).appendChild(safeTitle);

    // Event listeners for actions
    const completeBtn = li.querySelector('.btn-complete');
    completeBtn.addEventListener('click', async () => {
        const currentStatus = completeBtn.getAttribute('data-status') === 'true';
        const taskRef = doc(db, "users", auth.currentUser.uid, "tasks", id);
        await updateDoc(taskRef, { completed: !currentStatus });
    });

    const deleteBtn = li.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Delete this task?')) {
            const taskRef = doc(db, "users", auth.currentUser.uid, "tasks", id);
            await deleteDoc(taskRef);
        }
    });
}
