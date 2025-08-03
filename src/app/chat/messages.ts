import {UIDataTypes, UIMessage, UITools} from 'ai';

export type Message = UIMessage<unknown, UIDataTypes, UITools>;

const messages: Record<string, Array<Message>> = {};

export async function loadMessages(id: string): Promise<Array<Message>> {
    return messages[id] ?? [];
}

export async function saveMessages(id: string, newMessages: Array<Message>) {
    if (messages[id] == null) {
        messages[id] = [];
    }
    messages[id].push(...newMessages);
}
