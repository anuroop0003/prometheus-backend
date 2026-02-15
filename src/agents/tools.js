import { FunctionTool } from "@google/adk";
import { z } from "zod";
import * as actions from "./actions.js";

export const getTools = (userToken) => {
    const createTodoTool = new FunctionTool({
        name: "create_todo_task",
        description: "Create a new task in Microsoft To-Do.",
        parameters: z.object({
            title: z.string().describe("The title of the task"),
            description: z.string().optional().describe("Details or description of the task"),
            dueDate: z.string().optional().describe("The due date/time in ISO format (YYYY-MM-DDTHH:mm:ss)"),
        }),
        execute: async ({ title, description, dueDate }) => {
            return await actions.createTodoTask({ title, description, dueDate }, userToken);
        },
    });

    const scheduleMeetingTool = new FunctionTool({
        name: "schedule_meeting",
        description: "Schedule a meeting or event in the calendar.",
        parameters: z.object({
            subject: z.string().describe("The subject or title of the meeting"),
            description: z.string().optional().describe("Agenda or description of the meeting"),
            start: z.string().describe("The start time in ISO format (YYYY-MM-DDTHH:mm:ss)"),
            end: z.string().optional().describe("The end time in ISO format."),
        }),
        execute: async ({ subject, description, start, end }) => {
            return await actions.createCalendarEvent({ subject, description, start, end }, userToken);
        },
    });

    const createJiraIssueTool = new FunctionTool({
        name: "create_jira_issue",
        description: "Create a bug report or issue in Jira.",
        parameters: z.object({
            summary: z.string().describe("A brief summary of the issue"),
            description: z.string().optional().describe("Detailed description of the bug or issue"),
            projectKey: z.string().optional().describe("The project key (e.g., 'PROJ')."),
        }),
        execute: async ({ summary, description, projectKey }) => {
            // Jira doesn't use the userToken for Basic Auth but we keep the pattern consistent if needed later
            return await actions.createJiraIssue({ summary, description, projectKey });
        },
    });

    return [createTodoTool, scheduleMeetingTool, createJiraIssueTool];
};
