import { LlmAgent } from "@google/adk";
import { getTools } from "./tools.js";
import User from "../../database/model/user.js";

export default async (source, eventData) => {
    console.log(`Processing ${source} event using @google/adk Agent`);

    let messageContent = "";
    // Extract content
    if (source === "teams" && eventData.resourceData?.body) {
        messageContent = eventData.resourceData.body.content.replace(/<[^>]*>?/gm, '');
    } else if (source === "outlook") {
        messageContent = eventData.resourceData.body?.content || "No content";
    }

    if (!messageContent) {
        console.log("No content found to process.");
        return;
    }

    // Get User for Graph Token
    // We expect the user to be passed in eventData for real-world scenarios
    let userToken;
    if (eventData.user) {
        userToken = eventData.user.accessToken;
    } else {
        // Fallback for testing/Outlook (if not updated yet)
        const user = await User.findOne().sort({ updatedAt: -1 });
        userToken = user?.accessToken;
    }

    // Initialize Tools with User Token
    const agentTools = getTools(userToken);

    // Initialize Agent
    const agent = new LlmAgent({
        name: "productivity_assistant",
        model: "gemini-pro", // or gemini-1.5-pro-latest
        description: "Helps users manage tasks, meetings, and issues.",
        instruction: `You are a helpful office assistant. Analyze the user's message and perform the necessary actions using the available tools.
                  If the user wants to create a task, use 'create_todo_task'.
                  If the user wants to schedule a meeting, use 'schedule_meeting'.
                  If the user reports a bug, use 'create_jira_issue'.`,
        tools: agentTools,
    });

    console.log("Analyzing content:", messageContent);

    try {
        const response = await agent.run(messageContent);
        console.log("Agent Response:", response);
    } catch (error) {
        console.error("Agent Execution Error:", error);
    }
};
