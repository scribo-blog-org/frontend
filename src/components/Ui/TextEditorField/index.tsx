'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import {
    $createParagraphNode,
    $getRoot,
    $getSelection,
    $isRangeSelection,
    FORMAT_TEXT_COMMAND,
    TextNode,
} from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    INSERT_UNORDERED_LIST_COMMAND,
    INSERT_ORDERED_LIST_COMMAND,
    ListItemNode,
    ListNode,
} from '@lexical/list';
import { LinkNode } from '@lexical/link';
import {
    $createCodeNode,
    $isCodeNode,
    CodeHighlightNode,
    CodeNode,
} from '@lexical/code';
import { $setBlocksType } from '@lexical/selection';

import { HashtagNode } from './HashtagNode';
import { MentionNode } from './MentionNode';

import HashtagPlugin from './HashtagPlugin';
import HashtagSuggestPlugin from './HashtagSuggestPlugin';
import MentionPlugin from './MentionPlugin';
import MentionSuggestPlugin from './MentionSuggestPlugin';

import './TextEditorField.scss';
import SwitchBar from '../SwitchBar';
import Tooltip from '../Tooltip/index';
import DropDown from '../DropDown';

import BoldText from '../../../assets/svg/bold-text.svg';
import ItalicText from '../../../assets/svg/italic-text.svg';
import MarkList from '../../../assets/svg/mark-list-icon.svg';
import NumList from '../../../assets/svg/num-list-icon.svg';
import CodeBlockIcon from '../../../assets/svg/code-block.svg';

import { useRef, useState, useEffect } from 'react';
import {
    exportCodeBlocksHtml,
    importCodeBlocksHtml,
} from '../../../content/codeBlocks';

const CODE_LANGUAGES = [
    ['', 'Plain'],
    ['js', 'JavaScript'],
    ['ts', 'TypeScript'],
    ['tsx', 'TSX'],
    ['json', 'JSON'],
    ['html', 'HTML'],
    ['css', 'CSS'],
    ['python', 'Python'],
    ['bash', 'Bash'],
    ['sql', 'SQL'],
    ['java', 'Java'],
    ['c', 'C'],
    ['cpp', 'C++'],
    ['csharp', 'C#'],
    ['go', 'Go'],
    ['rust', 'Rust'],
    ['php', 'PHP'],
];

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
        code: 'text_editor_code',
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
        CodeNode,
        CodeHighlightNode,
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
            const dom = parser.parseFromString(
                importCodeBlocksHtml(html),
                'text/html',
            );
            const nodes = $generateNodesFromDOM(editor, dom);

            root.append(...nodes);
        });
    }, [editor, html]);

    return null;
}

const EditorToolbar = ({
    compact = false,
    leading = null,
    trailing = null,
}: any) => {
    const [editor] = useLexicalComposerContext();
    const [codeLanguage, setCodeLanguage] = useState<string | null>(null);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }: any) => {
            editorState.read(() => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection)) {
                    setCodeLanguage(null);
                    return;
                }
                const top = selection.anchor.getNode().getTopLevelElement();
                setCodeLanguage(
                    $isCodeNode(top) ? top.getLanguage() || '' : null,
                );
            });
        });
    }, [editor]);

    const toggleCodeBlock = () => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                return;
            }
            const top = selection.anchor.getNode().getTopLevelElement();
            if ($isCodeNode(top)) {
                $setBlocksType(selection, () => $createParagraphNode());
            } else {
                $setBlocksType(selection, () => $createCodeNode());
            }
        });
        editor.focus();
    };

    const changeLanguage = (language: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                return;
            }
            const top = selection.anchor.getNode().getTopLevelElement();
            if ($isCodeNode(top)) {
                top.setLanguage(language);
            }
        });
        setCodeLanguage(language);
    };

    const formatTools = (
        <>
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
        </>
    );

    const codeTool = (
        <Tooltip text="Code block">
            <button
                type="button"
                aria-pressed={codeLanguage !== null}
                className={`app-transition${codeLanguage !== null ? ' text_editor_tool_active' : ''}`}
                onClick={toggleCodeBlock}
            >
                <CodeBlockIcon />
            </button>
        </Tooltip>
    );

    return (
        <div
            className={`text_editor_body_top_side_tools${compact ? ' text_editor_tools_compact' : ''}`}
        >
            <div className="text_editor_body_top_side_toolbar app-transition">
                {compact ? (
                    <>
                        {leading}
                        {codeTool}
                        {formatTools}
                    </>
                ) : (
                    <>
                        {formatTools}
                        {codeTool}
                    </>
                )}

                {codeLanguage !== null ? (
                    <DropDown
                        className="text_editor_language"
                        options={CODE_LANGUAGES.map(([value, label]) => ({
                            value,
                            label,
                        }))}
                        value={codeLanguage}
                        onChange={changeLanguage}
                    />
                ) : null}
                {trailing}
            </div>
        </div>
    );
};

function EditablePlugin({ editable }: any) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        editor.setEditable(editable);
    }, [editor, editable]);

    return null;
}

export default function TextEditor({
    initialHtml,
    onChange,
    error,
    onFocus,
    disabled = false,
    variant = 'field',
    placeholder,
    toolbarLeading = null,
    toolbarTrailing = null,
    belowEditor = null,
}: any) {
    const [switcherActiveIndex, setSwitcherActiveIndex] = useState<any>(0);
    const compose = variant === 'compose';

    const toolbar = (
        <EditorToolbar
            compact={compose}
            leading={toolbarLeading}
            trailing={toolbarTrailing}
        />
    );

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
            <EditablePlugin
                editable={!disabled && (compose || switcherActiveIndex === 0)}
            />
            <div
                className={`text_editor app-transition${disabled ? ' text_editor_disabled' : ''}${compose ? ' text_editor_compose' : ''}`}
            >
                <div
                    className={`text_editor_body ${error ? 'incorrect_field' : ''} app-transition`}
                >
                    {compose ? null : (
                        <div className="text_editor_body_top_side app-transition">
                            {toolbar}
                            <SwitchBar
                                activeIndex={switcherActiveIndex}
                                setActiveIndex={setSwitcherActiveIndex}
                                items={['Edit', 'Preview']}
                            />
                        </div>
                    )}
                    <RichTextPlugin
                        ErrorBoundary={undefined as any}
                        placeholder={
                            placeholder ? (
                                <div className="text_editor_placeholder">
                                    {placeholder}
                                </div>
                            ) : null
                        }
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
                                const hasCode = root
                                    .getChildren()
                                    .some(
                                        (node: any) =>
                                            node.getType() === 'code',
                                    );

                                if (text === '' && !hasCode) {
                                    return '';
                                }

                                return exportCodeBlocksHtml(
                                    $generateHtmlFromNodes(editor),
                                );
                            });

                            onChange?.(result);
                        }}
                    />
                </div>
                {compose ? belowEditor : null}
                {compose ? (
                    <div className="text_editor_compose_toolbar">{toolbar}</div>
                ) : null}
            </div>
        </LexicalComposer>
    );
}
