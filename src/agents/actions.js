import axios from "axios";

// --- Microsoft Graph Actions ---

export const createTodoTask = async (taskDetails, userToken) => {
    console.log("Creating To-Do task:", taskDetails.title);
    try {
        const response = await axios.post(
            "https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks",
            {
                title: taskDetails.title,
                body: {
                    content: taskDetails.description || "",
                    contentType: "text",
                },
                dueDateTime: taskDetails.dueDate ? {
                    dateTime: taskDetails.dueDate,
                    timeZone: "UTC"
                } : undefined
            },
            {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return `Task created successfully. ID: ${response.data.id}`;
    } catch (error) {
        console.error("Error creating To-Do task:", error.response?.data || error.message);
        throw new Error("Failed to create To-Do task");
    }
};

export const createCalendarEvent = async (eventDetails, userToken) => {
    console.log("Creating Calendar event:", eventDetails.subject);
    try {
        const response = await axios.post(
            "https://graph.microsoft.com/v1.0/me/events",
            {
                subject: eventDetails.subject,
                body: {
                    contentType: "HTML",
                    content: eventDetails.description || "Scheduled via AI Agent",
                },
                start: {
                    dateTime: eventDetails.start, // e.g., "2023-10-27T12:00:00"
                    timeZone: "UTC"
                },
                end: {
                    dateTime: eventDetails.end || new Date(new Date(eventDetails.start).getTime() + 30 * 60000).toISOString(),
                    timeZone: "UTC"
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return `Event scheduled successfully. ID: ${response.data.id}`;
    } catch (error) {
        console.error("Error creating Calendar event:", error.response?.data || error.message);
        throw new Error("Failed to schedule meeting");
    }
};

// --- Jira Actions ---

export const createJiraIssue = async (issueDetails) => {
    console.log("Creating Jira issue:", issueDetails.summary);
    const { JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;

    if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
        throw new Error("Missing Jira credentials in environment variables");
    }

    try {
        const response = await axios.post(
            `https://${JIRA_DOMAIN}/rest/api/3/issue`,
            {
                fields: {
                    project: {
                        key: issueDetails.projectKey || "PROJ", // Default or extracted
                    },
                    summary: issueDetails.summary,
                    description: {
                        type: "doc",
                        version: 1,
                        content: [
                            {
                                type: "paragraph",
                                content: [
                                    {
                                        type: "text",
                                        text: issueDetails.description || "Created via AI Agent",
                                    },
                                ],
                            },
                        ],
                    },
                    issuetype: {
                        name: "Task",
                    },
                },
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(
                        `${JIRA_EMAIL}:${JIRA_API_TOKEN}`
                    ).toString("base64")}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }
        );
        return `Jira Issue created successfully. Key: ${response.data.key}`;
    } catch (error) {
        console.error("Error creating Jira issue:", error.response?.data || error.message);
        throw new Error("Failed to create Jira issue");
    }
};
