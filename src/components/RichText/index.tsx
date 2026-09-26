'use client';

import { Fragment } from "react";
import { Link } from "@/navigation";

import {
    profilePathFromNick,
    splitPlainRichParts,
} from "../../content/plainRichText";
import { splitMessageRichParts } from "../../utils/messageLinks";
import { hashtagSearchPath } from "../../utils/hashtags";

const RichText = ({ text, className, id, as: Tag = "p", linkify = false }: any) => {
    const parts = linkify ? splitMessageRichParts(text) : splitPlainRichParts(text);

    return (
        <Tag className={className} id={id}>
            {parts.map((part: any, index: any) => {
                if (part.type === "tag") {
                    return (
                        <Link
                            key={`${part.value}-${index}`}
                            className="hashtag"
                            href={hashtagSearchPath(part.value)}
                        >
                            {part.value}
                        </Link>
                    );
                }

                if (part.type === "mention") {
                    return (
                        <Link
                            key={`${part.nick}-${index}`}
                            className="mention"
                            href={profilePathFromNick(part.nick)}
                        >
                            {part.value}
                        </Link>
                    );
                }

                if (part.type === "link") {
                    return (
                        <a
                            key={`${part.value}-${index}`}
                            className="message_link"
                            href={part.value}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {part.value}
                        </a>
                    );
                }

                return String(part.value)
                    .split("\n")
                    .map((line: any, lineIndex: any, lines: any) => (
                        <Fragment key={`${index}-${lineIndex}`}>
                            {line}
                            {lineIndex < lines.length - 1 ? <br /> : null}
                        </Fragment>
                    ));
            })}
        </Tag>
    );
};

export default RichText;
