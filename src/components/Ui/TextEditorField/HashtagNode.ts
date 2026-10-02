import { $createTextNode, TextNode } from 'lexical';

function isCompleteHashtag(text: any) {
    return /^#[^\s#]+$/.test(text);
}

export class HashtagNode extends TextNode {
    static getType() {
        return 'hashtag';
    }

    static clone(node: any) {
        return new HashtagNode(node.__text, node.__key);
    }

    static importJSON(serializedNode: any) {
        const node = $createHashtagNode(serializedNode.text);
        node.setFormat(serializedNode.format);
        node.setDetail(serializedNode.detail);
        node.setMode(serializedNode.mode);
        node.setStyle(serializedNode.style);
        return node;
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'hashtag',
        };
    }

    applyHashtagClass(element: any) {
        if (isCompleteHashtag(this.__text)) {
            element.classList.add('hashtag');
        } else {
            element.classList.remove('hashtag');
        }
    }

    createDOM(config: any) {
        const element = super.createDOM(config);
        this.applyHashtagClass(element);
        return element;
    }

    updateDOM(prevNode: any, element: any, config: any) {
        const updated = super.updateDOM(prevNode, element, config);
        this.applyHashtagClass(element);
        return updated;
    }

    exportDOM(editor: any) {
        const output = super.exportDOM(editor);
        if (output.element instanceof HTMLElement) {
            this.applyHashtagClass(output.element);
        }
        return output;
    }

    static importDOM() {
        return {
            span: (domNode: any) => {
                if (!domNode.classList?.contains('hashtag')) {
                    return null;
                }
                return {
                    conversion: convertHashtagElement,
                    priority: 3 as const,
                };
            },
            a: (domNode: any) => {
                if (!domNode.classList?.contains('hashtag')) {
                    return null;
                }
                return {
                    conversion: convertHashtagElement,
                    priority: 3 as const,
                };
            },
        };
    }

    canInsertTextBefore() {
        return false;
    }

    isTextEntity() {
        return true;
    }
}

function convertHashtagElement(domNode: any) {
    const text = domNode.textContent || '';
    if (!isCompleteHashtag(text)) {
        return null;
    }
    return { node: $createHashtagNode(text) };
}

export function $createHashtagNode(text: any = '') {
    return new HashtagNode(text);
}

export function $isHashtagNode(node: any) {
    return node instanceof HashtagNode;
}

export function registerHashtagTransform(editor: any) {
    return editor.registerNodeTransform(TextNode, (textNode: any) => {
        const text = textNode.getTextContent();

        if ($isHashtagNode(textNode)) {
            if (isCompleteHashtag(text)) {
                return;
            }
            const plain = $createTextNode(text);
            plain.setFormat(textNode.getFormat());
            plain.setStyle(textNode.getStyle());
            textNode.replace(plain);
            return;
        }

        if (!textNode.isSimpleText()) {
            return;
        }

        const match = /#[^\s#]+/.exec(text);
        if (!match) {
            return;
        }

        const start = match.index;
        const end = start + match[0].length;
        let target = textNode;

        if (start > 0) {
            [, target] = textNode.splitText(start);
        }

        const hashtagText = target.getTextContent();
        const hashtagLength = end - start;
        const nodeToReplace =
            hashtagLength < hashtagText.length
                ? target.splitText(hashtagLength)[0]
                : target;

        const hashtag = $createHashtagNode(nodeToReplace.getTextContent());
        hashtag.setFormat(nodeToReplace.getFormat());
        hashtag.setStyle(nodeToReplace.getStyle());
        nodeToReplace.replace(hashtag);
    });
}
