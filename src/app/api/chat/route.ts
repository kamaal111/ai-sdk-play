import {openai} from '@ai-sdk/openai';
import {convertToModelMessages, streamText} from 'ai';

import {loadMessages, saveMessages} from '@/app/chat/messages';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return Response.json({error: 'Conversation ID is required'}, {status: 400});
    }

    const messages = await loadMessages(id);
    return Response.json({messages});
}

export async function POST(req: Request) {
    const {id, message} = await req.json();

    // Load existing messages and add the new one
    const messages = await loadMessages(id);
    messages.push(message);

    // Call the language model
    const result = streamText({
        model: openai('gpt-4.1-mini'),
        messages: convertToModelMessages(messages),
    });

    // Respond with the stream
    return result.toUIMessageStreamResponse({
        originalMessages: messages,
        onFinish: async ({messages: newMessages}) => {
            await saveMessages(id, newMessages);
        },
    });
}
