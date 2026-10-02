'use client';

import { Fragment, useEffect, useMemo } from 'react';
import { Link } from '@/navigation';

import RichText from '../RichText';
import { LinkPreviewCard, PostMessageCard } from '../PostEntity';
import { useMessageEmbeds } from '../../hooks/useMessageEmbeds';
import { profilePathFromNick } from '../../content/plainRichText';
import { splitMessageRichParts } from '../../utils/messageLinks';
import { hashtagSearchPath } from '../../utils/hashtags';

import './MessageContent.scss';

function hasBlockContent(parts: any) {
    return parts.some((part: any) => {
        if (part.type !== 'text') {
            return true;
        }

        return part.value.length > 0;
    });
}

function buildMessageBlocks(parts: any) {
    const blocks: any[] = [];
    let textParts: any[] = [];

    const flushText = () => {
        if (!textParts.length || !hasBlockContent(textParts)) {
            textParts = [];
            return;
        }

        blocks.push({ type: 'text', parts: textParts });
        textParts = [];
    };

    for (const part of parts) {
        if (part.type === 'link') {
            flushText();
            blocks.push({ type: 'link', url: part.value });
            continue;
        }

        textParts.push(part);
    }

    flushText();
    return blocks;
}

function renderInlinePart(part: any, key: any) {
    if (part.type === 'tag') {
        return (
            <Link
                key={key}
                className="hashtag"
                href={hashtagSearchPath(part.value)}
            >
                {part.value}
            </Link>
        );
    }

    if (part.type === 'mention') {
        return (
            <Link
                key={key}
                className="mention"
                href={profilePathFromNick(part.nick)}
            >
                {part.value}
            </Link>
        );
    }

    return String(part.value)
        .split('\n')
        .map((line: any, lineIndex: any, lines: any) => (
            <Fragment key={`${key}-${lineIndex}`}>
                {line}
                {lineIndex < lines.length - 1 ? <br /> : null}
            </Fragment>
        ));
}

const MessageRichContent = ({
    text,
    className,
    id,
    embeds,
    onLayoutChange,
}: any) => {
    const blocks = useMemo(() => {
        return buildMessageBlocks(splitMessageRichParts(text));
    }, [text]);

    const embedByUrl = useMemo(
        () =>
            new Map<string, any>(
                embeds.map((embed: any) => [embed.url, embed]),
            ),
        [embeds],
    );

    return (
        <div className={className} id={id}>
            {blocks.map((block: any, index: any) => {
                if (block.type === 'link') {
                    const embed = embedByUrl.get(block.url);

                    return (
                        <div
                            className="message_content_link_block"
                            key={`link-${block.url}-${index}`}
                        >
                            <p>
                                <a
                                    className="message_link"
                                    href={block.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {block.url}
                                </a>
                            </p>
                            {embed?.type === 'post' ? (
                                <PostMessageCard
                                    post={embed.post}
                                    className="messages_post_share"
                                    onMediaLoad={onLayoutChange}
                                />
                            ) : null}
                            {embed?.type === 'link' ? (
                                <LinkPreviewCard
                                    preview={embed.preview}
                                    className="messages_link_preview"
                                    onMediaLoad={onLayoutChange}
                                />
                            ) : null}
                        </div>
                    );
                }

                return (
                    <p key={`text-${index}`}>
                        {block.parts.map((part: any, partIndex: any) =>
                            renderInlinePart(part, `${index}-${partIndex}`),
                        )}
                    </p>
                );
            })}
        </div>
    );
};

const MessageContent = ({
    text,
    className,
    id,
    deleted = false,
    onLayoutChange,
}: any) => {
    const embeds = useMessageEmbeds(deleted ? '' : text);

    useEffect(() => {
        if (!embeds.length) {
            return;
        }

        onLayoutChange?.();
    }, [embeds, onLayoutChange]);

    if (deleted) {
        return (
            <div className={`${className} messages_text_deleted`.trim()}>
                <RichText text="Сообщение удалено" />
            </div>
        );
    }

    const hasLinks = /https?:\/\//.test(text || '');

    if (hasLinks) {
        return (
            <div className="message_content">
                <MessageRichContent
                    text={text}
                    className={className}
                    id={id}
                    embeds={embeds}
                    onLayoutChange={onLayoutChange}
                />
            </div>
        );
    }

    return (
        <div className="message_content">
            <div className={className}>
                <RichText linkify id={id} text={text} />
            </div>
        </div>
    );
};

export default MessageContent;
