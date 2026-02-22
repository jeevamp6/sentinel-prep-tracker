const globalApiKey = "AIzaSyAqTmiN-0blOHDYREAEI2EJ02NnjqQsLbU";
const subject = "Data Structures";

async function testGemini() {
    const prompt = `Generate exactly 5 multiple choice questions about ${subject} for an entry-level software engineering job interview. Return a JSON array containing objects. Each object must have: "q" (the question string), "options" (array of 4 string options), and "a" (integer 0-3 representing the index of the correct option).`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${globalApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`API Error ${response.status}: ${errText}`);
            return;
        }

        const data = await response.json();
        console.log("Success! Generated Object:", JSON.stringify(data.candidates[0].content.parts[0].text, null, 2));
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testGemini();
