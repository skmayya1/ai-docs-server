import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ResponseStructure, systemInstruction } from "./constants";

export async function callGeminiService(
    apiKey: string,
    prompt: string
): Promise<{ response: string; updatedContent: string | null }> {
    try {
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey,
            temperature: 0, // Add for more consistent outputs
        });

        const structuredLlm = model.withStructuredOutput(ResponseStructure);

        // Create messages with system instruction
        const messages = [
            new SystemMessage(systemInstruction),
            new HumanMessage(prompt)
        ];

        const result = await structuredLlm.invoke(messages);

        console.log("Structured AI Response:", result);

        // Since we're using withStructuredOutput, the result should already be parsed
        // and conform to the ResponseStructure schema
        return {
            response: result.response || '',
            updatedContent: result.updatedContent || null
        };

    } catch (error) {
        console.error("Gemini service error:", error);
        
        // If structured output fails, try fallback approach
        try {
            const fallbackModel = new ChatGoogleGenerativeAI({
                model: "gemini-2.5-flash",
                apiKey,
                temperature: 0,
            });

            const messages = [
                new SystemMessage(systemInstruction + "\n\nIMPORTANT: Always respond with valid JSON matching this exact structure: {\"response\": \"your response here\", \"updatedContent\": \"content or null\"}"),
                new HumanMessage(prompt)
            ];

            const fallbackResult = await fallbackModel.invoke(messages);
            const content = fallbackResult.content as string;

            let parsed: { response: string; updatedContent: string | null };
            try {
                const cleaned = content.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1').trim();
                parsed = JSON.parse(cleaned);
            } catch (parseError) {
                console.warn("Fallback JSON parsing failed, using raw content");
                parsed = {
                    response: content,
                    updatedContent: null
                };
            }

            return parsed;

        } catch (fallbackError) {
            console.error("Fallback also failed:", fallbackError);
            return {
                response: "I encountered an error processing your request with Gemini. Please try again.",
                updatedContent: null
            };
        }
    }
}