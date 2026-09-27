'use client';

import { useEffect, useState } from "react";
import { useNavigate } from "@/navigation";

import { enrichPostHtml } from "../../content/postHtml";
import { escapeHtml, linkifyHashtagsInHtml } from "../../utils/hashtags";

function plainMarkup(html: unknown, text: unknown) {
    if (html) {
        return String(html);
    }

    if (text == null || text === "") {
        return "";
    }

    return escapeHtml(text).replace(/\n/g, "<br>");
}

const HashtagHtml = ({ html, text, className, as = "div", id }: any) => {
    const navigate = useNavigate();
    const Tag = as;
    const [markup, setMarkup] = useState(() => plainMarkup(html, text));

    useEffect(() => {
        if (html) {
            setMarkup(enrichPostHtml(html));
            return;
        }

        if (text == null || text === "") {
            setMarkup("");
            return;
        }

        setMarkup(linkifyHashtagsInHtml(escapeHtml(text).replace(/\n/g, "<br>")));
    }, [html, text]);

    return (
        <Tag
            id={id}
            className={className}
            dangerouslySetInnerHTML={{ __html: markup }}
            onClick={(event: any) => {
                const link = event.target.closest("a.hashtag, a.mention");
                if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey) {
                    return;
                }
                const href = link.getAttribute("href");
                if (!href?.startsWith("/")) {
                    return;
                }
                event.preventDefault();
                navigate(href);
            }}
        />
    );
};

export default HashtagHtml;
