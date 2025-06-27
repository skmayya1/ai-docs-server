import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { JsonOutputParser } from "@langchain/core/output_parsers";
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

        const validated = responseSchema.parse(result);

        return {
            response: validated.response || '',
            updatedContent: validated.updatedContent
        };

    } catch (error) {
        console.error("Structured output failed:", error);

        return await fallbackWithParser(apiKey, prompt);
    }
}

async function fallbackWithParser(
    apiKey: string,
    prompt: string
): Promise<{ response: string; updatedContent: string | null }> {
    try {
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey,
            temperature: 0,
        });

        const parser = new JsonOutputParser();

        const enhancedSystemInstruction = `${systemInstruction}

ADDITIONAL FORMATTING RULES:
- Your response must be parseable by JSON.parse()
- Do not include any explanatory text outside the JSON
- Example valid response: {"response": "I've improved your paragraph.", "updatedContent": "# Updated Document\\n\\nContent here"}
- Example with no changes: {"response": "Your document looks good!", "updatedContent": null}`;

        const messages = [
            new SystemMessage(enhancedSystemInstruction),
            new HumanMessage(prompt)
        ];

        const response = await model.invoke(messages);
        const parsed = await parser.parse(response.content as string);

        // Validate with schema
        const validated = responseSchema.parse(parsed);

        return {
            response: validated.response || '',
            updatedContent: validated.updatedContent
        };

    } catch (error) {
        console.error("Parser fallback failed:", error);
        return await manualFallback(apiKey, prompt);
    }
}

async function manualFallback(
    apiKey: string,
    prompt: string
): Promise<{ response: string; updatedContent: string | null }> {
    try {
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey,
            temperature: 0,
        });

        const fallbackInstruction = `${systemInstruction}

ABSOLUTE REQUIREMENT: Return only a JSON object. Example:
{"response": "Here's my response", "updatedContent": null}

No other text allowed.`;

        const messages = [
            new SystemMessage(fallbackInstruction),
            new HumanMessage(prompt)
        ];

        const result = await model.invoke(messages);
        const content = result.content as string;

        // Enhanced JSON cleaning
        let cleaned = content.trim();

        // Remove markdown code blocks
        cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');

        // Extract JSON object from text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        // Additional cleaning
        cleaned = cleaned.trim();

        console.log("Attempting to parse:", cleaned);

        const parsed = JSON.parse(cleaned);

        // Validate structure
        if (typeof parsed !== 'object' || !parsed.hasOwnProperty('response')) {
            throw new Error('Invalid response structure');
        }

        return {
            response: parsed.response || '',
            updatedContent: parsed.updatedContent === 'null' ? null : (parsed.updatedContent || null)
        };

    } catch (error) {
        console.error("Manual fallback failed:", error);

        // Last resort: try to extract data with regex
        try {
            const model = new ChatGoogleGenerativeAI({
                model: "gemini-2.5-flash",
                apiKey,
                temperature: 0,
            });

            const simplePrompt = `${prompt}

Respond naturally, then indicate if document changes are needed by saying "DOCUMENT_UPDATE: [content]" or "DOCUMENT_UPDATE: NONE"`;

            const result = await model.invoke([new HumanMessage(simplePrompt)]);
            const content = result.content as string;

            const updateMatch = content.match(/DOCUMENT_UPDATE:\s*(.*?)(?:\n|$)/s);
            const responseText = content.replace(/DOCUMENT_UPDATE:.*$/s, '').trim();

            return {
                response: responseText || "I processed your request.",
                updatedContent: updateMatch && updateMatch[1].trim() !== 'NONE' ? updateMatch[1].trim() : null
            };

        } catch (finalError) {
            console.error("All fallbacks failed:", finalError);
            return {
                response: "I encountered an error processing your request. Please try again.",
                updatedContent: null
            };
        }
    }
}