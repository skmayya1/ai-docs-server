import { checkCredentialsCookie } from '../middleware/credential';
import convertRouter from './convert.router';
import healthRouter from "./health.router";
import { Router } from 'express';

import { z } from "zod";
import { systemInstruction } from '../utils/constants';
import { callGeminiService } from '../utils/lib';

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
