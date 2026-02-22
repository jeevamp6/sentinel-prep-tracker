// Centralized SOC Logger
// Intercepts network requests and records system activities

class SystemLogger {
    constructor() {
        this.logKey = 'sentinel_system_logs';
        this.networkKey = 'sentinel_network_logs';

        // Initialize if empty
        if (!localStorage.getItem(this.logKey)) {
            localStorage.setItem(this.logKey, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.networkKey)) {
            localStorage.setItem(this.networkKey, JSON.stringify([]));
        }
    }

    // Activity Log
    logEvent(eventType, description, status = 'INFO', userEmail = 'Unknown') {
        const logs = JSON.parse(localStorage.getItem(this.logKey));
        const entry = {
            timestamp: new Date().toISOString(),
            eventType: eventType,
            description: description,
            status: status,
            userEmail: userEmail
        };

        logs.push(entry);

        // Keep last 100 logs to prevent localStorage bloat
        if (logs.length > 100) logs.shift();

        localStorage.setItem(this.logKey, JSON.stringify(logs));
        console.log(`[SOC LOG] [${status}] ${eventType} - ${description} (${userEmail})`);
    }

    // Network Request Log
    logNetworkRequest(url, method, status, responseTime) {
        const netLogs = JSON.parse(localStorage.getItem(this.networkKey));
        const success = status >= 200 && status < 300;
        const entry = {
            timestamp: new Date().toISOString(),
            url: url.split('?')[0].substring(0, 100), // Trim long URLs
            method: method,
            status: status,
            responseTime: responseTime,
            success: success
        };

        netLogs.push(entry);

        if (netLogs.length > 50) netLogs.shift();

        localStorage.setItem(this.networkKey, JSON.stringify(netLogs));
    }

    getLogs() {
        return JSON.parse(localStorage.getItem(this.logKey));
    }

    getNetworkLogs() {
        return JSON.parse(localStorage.getItem(this.networkKey));
    }
}

const logger = new SystemLogger();

// Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    const startTime = performance.now();
    let url = args[0];
    let method = args[1] && args[1].method ? args[1].method : 'GET';

    // Don't log firebase polling to avoid spam
    if (typeof url === 'string' && (url.includes('firestore.googleapis.com') || url.includes('securetoken.googleapis.com') || url.includes('identitytoolkit.googleapis.com'))) {
        return originalFetch.apply(this, args);
    }

    try {
        const response = await originalFetch.apply(this, args);
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        logger.logNetworkRequest(typeof url === 'string' ? url : url.url, method, response.status, duration);
        return response;
    } catch (error) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        logger.logNetworkRequest(typeof url === 'string' ? url : url.url, method, 0, duration);
        throw error;
    }
};

export { logger };
