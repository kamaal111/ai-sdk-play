import {UIDataTypes, UIMessage, UITools} from 'ai';

import {prisma} from '../../lib/prisma';

export type Message = UIMessage<unknown, UIDataTypes, UITools>;

export async function loadMessages(id: string): Promise<Array<Message>> {
    // Load messages from database
    const dbMessages = await prisma.message.findMany({
        where: {conversationId: id},
        orderBy: {createdAt: 'asc'},
    });

    // Return empty array if no messages found (conversation doesn't exist)
    if (dbMessages.length === 0) return [];

    // Convert database messages to UI messages
    return dbMessages.map(msg => {
        const metadata = msg.metadata && typeof msg.metadata === 'object' ? (msg.metadata as any) : {};

        return {
            id: msg.id,
            role: msg.role,
            parts: [{type: 'text', text: msg.content}],
            createdAt: msg.createdAt,
            ...metadata,
        };
    });
}

export async function saveMessages(id: string, newMessages: Array<Message>) {
    // First, ensure the conversation exists
    await prisma.conversation.upsert({
        where: {id},
        update: {},
        create: {id},
    });

    // Save new messages to database
    for (const message of newMessages) {
        console.log('🔍 Processing message:', {
            id: message.id,
            role: message.role,
            hasId: !!message.id,
            idLength: message.id?.length,
        });

        // Generate a unique ID if the message doesn't have one or has an empty ID
        let messageId = message.id;
        if (!messageId || messageId.trim() === '') {
            messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log('🆔 Generated new ID:', messageId);
        }

        // Extract text content from parts
        let content = '';
        if (message.parts && message.parts.length > 0) {
            content = message.parts
                .filter(part => part.type === 'text') // Only include text parts
                .map(part => {
                    if ('text' in part) return part.text;
                    return '';
                })
                .join('');
        }

        // Create metadata without the main fields
        const {id: msgId, role, parts, ...metadata} = message;

        // Ensure metadata is JSON-serializable
        const sanitizedMetadata = JSON.parse(JSON.stringify(metadata));

        // Use upsert to handle duplicate message IDs
        await prisma.message.upsert({
            where: {id: messageId}, // Use the potentially generated ID
            update: {
                content,
                metadata: Object.keys(sanitizedMetadata).length > 0 ? sanitizedMetadata : undefined,
                updatedAt: new Date(),
            },
            create: {
                id: messageId, // Use the potentially generated ID
                conversationId: id,
                role: message.role,
                content,
                metadata: Object.keys(sanitizedMetadata).length > 0 ? sanitizedMetadata : undefined,
            },
        });
    }
}
