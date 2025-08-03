import type {InferUITools, ToolSet, UIMessage} from 'ai';
import z from 'zod';

import {prisma} from '../../lib/prisma';

const metadataSchema = z.object({}).loose();

const dataPartSchema = z.object({}).loose();

const tools: ToolSet = {};

type MyMetadata = z.infer<typeof metadataSchema>;

type MyDataPart = z.infer<typeof dataPartSchema>;

type MyTools = InferUITools<typeof tools>;

export type Message = UIMessage<MyMetadata, MyDataPart, MyTools>;

export async function loadMessages(id: string): Promise<Array<Message>> {
    // Load messages from database
    const dbMessages = await prisma.message.findMany({
        where: {conversationId: id},
        orderBy: {createdAt: 'asc'},
    });

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
    const processedMessages: Array<{
        id: string;
        conversationId: string;
        role: Message['role'];
        content: string;
        metadata?: any;
    }> = [];

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
            messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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

        processedMessages.push({
            id: messageId,
            conversationId: id,
            role: message.role,
            content,
            metadata: Object.keys(sanitizedMetadata).length > 0 ? sanitizedMetadata : undefined,
        });
    }

    // Use transaction for batch operations
    await prisma.$transaction(
        processedMessages.map(messageData =>
            prisma.message.upsert({
                where: {id: messageData.id},
                update: {
                    content: messageData.content,
                    metadata: messageData.metadata,
                    updatedAt: new Date(),
                },
                create: messageData,
            })
        )
    );
}
