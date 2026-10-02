'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $getRoot } from 'lexical';
import { FORMAT_TEXT_COMMAND } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';
import { $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    INSERT_UNORDERED_LIST_COMMAND,
    INSERT_ORDERED_LIST_COMMAND,
} from '@lexical/list';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { TextNode } from 'lexical';
import { HashtagNode } from './HashtagNode';
import { MentionNode } from './MentionNode';
import HashtagPlugin from './HashtagPlugin';
import HashtagSuggestPlugin from './HashtagSuggestPlugin';
import MentionPlugin from './MentionPlugin';
import MentionSuggestPlugin from './MentionSuggestPlugin';

import './TextEditorField.scss';
import SwitchBar from '../SwitchBar';
import Tooltip from '../Tooltip/index';

import BoldText from '../../../assets/svg/bold-text.svg';
import ItalicText from '../../../assets/svg/italic-text.svg';
import MarkList from '../../../assets/svg/mark-list-icon.svg';
import NumList from '../../../assets/svg/num-list-icon.svg';
import LinkText from '../../../assets/svg/link-icon.svg';

import { useState, useEffect } from 'react';
import { useRef } from 'react';

const editorConfig = {
    namespace: 'TextEditor',
    theme: {
        text: {
            bold: 'text_editor_bold',
            italic: 'text_editor_italic',
        },
        link: 'text_editor_link',
        hashtag: 'hashtag',
        mention: 'mention',
        list: {
            ul: 'text_editor_ul',
            ol: 'text_editor_ol',
        },
    },
    onError(error: any) {
        throw error;
    },
    nodes: [
        TextNode,
        HashtagNode,
        MentionNode,
        ListNode,
        ListItemNode,
        LinkNode,
    ],
};

function InitialHtmlPlugin({ html }: any) {
    const [editor] = useLexicalComposerContext();
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        if (!html) return;

        initializedRef.current = true;

        editor.update(() => {
            const root = $getRoot();
            root.clear();

            const parser = new DOMParser();
            const dom = parser.parseFromString(html, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);

            root.append(...nodes);
        });
    }, [editor, html]);

    return null;
}

const EditorToolbar = () => {
    const [editor] = useLexicalComposerContext();

    return (
        <div className="text_editor_body_top_side_toolbar app-transition">
            <Tooltip text="Bold">
                <button
                    type="button"
                    className="text_editor_body_top_side_toolbar_bold app-transition"
                    onClick={() =>
                        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
                    }
                >
                    <BoldText />
                </button>
            </Tooltip>

            <Tooltip text="Italic">
                <button
                    type="button"
                    className="app-transition"
                    onClick={() =>
                        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
                    }
                >
                    <ItalicText />
                </button>
            </Tooltip>

            <Tooltip text="Bulleted list">
                <button
                    type="button"
                    className="app-transition"
                    onClick={() =>
                        editor.dispatchCommand(
                            INSERT_UNORDERED_LIST_COMMAND,
                            undefined,
                        )
                    }
                >
                    <MarkList />
                </button>
            </Tooltip>

            <Tooltip text="Numbered list">
                <button
                    type="button"
                    className="app-transition"
                    onClick={() =>
                        editor.dispatchCommand(
                            INSERT_ORDERED_LIST_COMMAND,
                            undefined,
                        )
                    }
                >
                    <NumList />
                </button>
            </Tooltip>

            <Tooltip text="Add a link">
                <button
                    type="button"
                    className="app-transition"
                    onClick={() => {
                        const url = prompt('Enter a link');
                        if (url) {
                            editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
                                url,
                                target: '_blank',
                                rel: 'noopener noreferrer',
                            });
                        }
                    }}
                >
                    <LinkText />
                </button>
            </Tooltip>
        </div>
    );
};

export default function TextEditor({
    initialHtml,
    onChange,
    error,
    onFocus,
}: any) {
    const [switcherActiveIndex, setSwitcherActiveIndex] = useState<any>(0);

    function EditablePlugin({ editable }: any) {
        const [editor] = useLexicalComposerContext();

        useEffect(() => {
            editor.setEditable(editable);
        }, [editor, editable]);

        return null;
    }

    return (
        <LexicalComposer
            initialConfig={
                {
                    ...editorConfig,
                    editorState: undefined,
                } as any
            }
        >
            <InitialHtmlPlugin html={initialHtml} />
            <EditablePlugin editable={switcherActiveIndex === 0} />
            <div className="text_editor app-transition">
                <div
                    className={`text_editor_body ${error ? 'incorrect_field' : ''} app-transition`}
                >
                    <div className="text_editor_body_top_side app-transition">
                        <EditorToolbar />
                        <SwitchBar
                            activeIndex={switcherActiveIndex}
                            setActiveIndex={setSwitcherActiveIndex}
                            items={['Edit', 'Preview']}
                        />
                    </div>
                    <RichTextPlugin
                        ErrorBoundary={undefined as any}
                        contentEditable={
                            <ContentEditable
                                className="text_editor_body_input"
                                onFocus={(e: any) => onFocus?.(e)}
                            />
                        }
                    />
                    <HistoryPlugin />
                    <ListPlugin />
                    <LinkPlugin />
                    <HashtagPlugin />
                    <MentionPlugin />
                    <HashtagSuggestPlugin enabled={switcherActiveIndex === 0} />
                    <MentionSuggestPlugin enabled={switcherActiveIndex === 0} />

                    <OnChangePlugin
                        onChange={(editorState: any, editor: any) => {
                            const result = editorState.read(() => {
                                const root = $getRoot();
                                const text = root.getTextContent().trim();

                                if (text === '') {
                                    return '';
                                }

                                return $generateHtmlFromNodes(editor);
                            });

                            onChange?.(result);
                        }}
                    />
                </div>
            </div>
        </LexicalComposer>
    );
}
