import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { responseSchema, systemInstruction } from "./constants";

export async function callGeminiService(
    apiKey: string,
    prompt: string
): Promise<{ response: string; updatedContent: string | null }> {
    try {
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey,
            temperature: 0,
        });

        const structuredLlm = model.withStructuredOutput(responseSchema);

        const messages = [
            new SystemMessage(systemInstruction),
            new HumanMessage(prompt)
        ];

        const result = await structuredLlm.invoke(messages);

        console.log("Structured AI Response:", result);        
        return {
            response: result.response || '',
            updatedContent: result.updatedContent || null
        };

    } catch (error) {
        console.error("Gemini service error:", error);
        return {
            response:"Something Went Wrong",
            updatedContent:null
        } 
    }
}