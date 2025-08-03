'use client';

import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport} from 'ai';
import {useCallback, useEffect, useState} from 'react';

import type {Message} from './chat/messages';

const ID = '123';

export default function Chat() {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const {messages, setMessages, sendMessage} = useChat<Message>({
        id: ID,
        transport: new DefaultChatTransport({
            prepareSendMessagesRequest: ({id, messages}) => {
                return {
                    body: {
                        id,
                        message: messages[messages.length - 1],
                    },
                };
            },
        }),
    });

    const loadInitialMessages = useCallback(async () => {
        const response = await fetch(`/api/chat?id=${ID}`);
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
        }

        setIsLoading(false);
    }, [setMessages, setIsLoading]);

    // Load initial messages on page load
    useEffect(() => {
        loadInitialMessages();
    }, [loadInitialMessages]);

    if (isLoading) {
        return <div>Loading conversation...</div>;
    }

    return (
        <div>
            {messages.map((message, index) => (
                <div key={index}>
                    {message.role === 'user' ? 'User: ' : 'AI: '}
                    {message.parts.map(part => {
                        switch (part.type) {
                            case 'text':
                                return <div key={`${message.id}-text`}>{part.text}</div>;
                        }
                    })}
                </div>
            ))}

            <form
                onSubmit={e => {
                    e.preventDefault();
                    sendMessage({text: input});
                    setInput('');
                }}
            >
                <input value={input} onChange={e => setInput(e.currentTarget.value)} />
            </form>
        </div>
    );
}
