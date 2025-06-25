import { checkCredentialsCookie } from '../middleware/credential';
import convertRouter from './convert.router';
import healthRouter from "./health.router";
import { Router } from 'express';
import { GoogleGenAI } from "@google/genai";

const router = Router();

router.use('/health', healthRouter);
router.use('/convert', convertRouter);

interface Message {
    role: 'agent' | 'human';
    content: string;
}

interface Chat {
    id: string;
    messages: Message[];
    tabName: string;
}

function buildConversationContext(messages: Message[], currentDocument: string): string {
    const conversationHistory = messages
        .map(msg => `${msg.role === 'human' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

    return `Current Document Content:
\`\`\`markdown
${currentDocument || '(empty document)'}
\`\`\`

Conversation History:
${conversationHistory}
`
}
const systemInstruction = `
You are an AI assistant embedded in a document editor, similar to Notion AI or Cursor. 
You help users write, edit, and improve documents using Markdown formatting. 
You can provide suggestions, rewrite content, fix grammar, summarize sections, or add new content when requested.

You always have access to:
1. The full conversation history
2. The current document content in Markdown

### Your tasks:
Based on the document and conversation:
- Understand what the user wants (e.g., rewrite, improve, summarize, continue writing, etc.)
- Respond to the user in a helpful, friendly tone
- Modify the document *only if necessary*, preserving the original structure and formatting


### Response format (strictly JSON - **NO EXCEPTIONS**):
**Respond ONLY with a single, valid JSON object.** Do not include any other text, markdown formatting (like triple backticks around the JSON), or explanations outside of this JSON object.

\`\`\`json
{
  "response": "Your natural language response to the user (e.g., 'Here's a more formal version of your paragraph.')",
  "updatedContent": "Updated full Markdown document, or null if no changes are needed"
}
\`\`\`
If no changes are needed to the document, set \`updatedContent\` to \`null\`.

`;


async function callGeminiService(
    apiKey: string,
    prompt: string
): Promise<{ response: string; updatedContent: string | null }> {
    try {
        const ai = new GoogleGenAI({
            apiKey,
        });

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ],
            config: {
                systemInstruction: systemInstruction
              },
        });

        const aiContent = result.text || '';
        console.log("Raw AI Content:\n", aiContent); // <-- Add this line

        let parsed: { response: string; updatedContent: string | null };
        try {
            const cleaned = aiContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1').trim();
            console.log("Cleaned Content (after regex):\n", cleaned); // <-- Add this line
        
            parsed = JSON.parse(cleaned.toString()); // No need for .toString() on 'cleaned' if it's already a string
        } catch (err) {
            console.error("JSON parsing failed on cleaned content:"); // <-- Log the problematic string
            console.error("Parsing error details:", err); // <-- Log the actual error object
            console.warn("JSON parsing failed, fallback to raw content:\n");
            parsed = {
                response: aiContent,
                updatedContent: null
            };
        }
        
        return parsed;
    } catch (error) {
        console.error("Gemini service error (outer catch):", error);
        return {
            response: "I encountered an error processing your request with Gemini. Please try again.",
            updatedContent: null
        };
    }
}

router.post('/agent', checkCredentialsCookie, async (req, res) => {
    try {
        const { apiKey, context, chat } = req.body;

        if (!apiKey) {
            res.status(401).json({ message: "Credentials not found! Please provide API key" });
            return
        }

        if (!chat || !chat.messages || chat.messages.length === 0) {
            res.status(400).json({ message: "No chat messages provided" });
            return
        }

        const lastMessage = chat.messages[chat.messages.length - 1];
        if (lastMessage.role !== 'human') {
            res.status(400).json({ message: "Last message should be from user" });
            return
        }

        console.log('Processing request:', {
            chatId: chat.id,
            messageCount: chat.messages.length,
            lastUserMessage: lastMessage.content.substring(0, 100) + '...',
            documentLength: context?.length || 0
        });

        const fullPrompt = buildConversationContext(chat.messages, context);
        const aiResult = await callGeminiService(apiKey, fullPrompt);

        console.log('AI Response received:', {
            responseLength: aiResult.response.length,
            hasUpdatedContent: !!aiResult.updatedContent
        });

        res.status(200).json({
            success: true,
            response: aiResult.response,
            updatedContent: aiResult.updatedContent,
            chatId: chat.id,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Agent endpoint error:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error while processing your request",
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});

export default router;
