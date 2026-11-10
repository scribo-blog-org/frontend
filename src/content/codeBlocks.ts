export const CODE_LANGUAGE_PATTERN = /^[a-z0-9+#-]{1,20}$/;

export function normalizeCodeLanguage(value: unknown) {
    const language = String(value || '')
        .trim()
        .toLowerCase();

    return CODE_LANGUAGE_PATTERN.test(language) ? language : '';
}

export function languageFromClassName(className: unknown) {
    const match = String(className || '').match(/(?:^|\s)language-([^\s]+)/);
    return match ? normalizeCodeLanguage(match[1]) : '';
}

function collectText(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    if ((node as Element).tagName === 'BR') {
        return '\n';
    }

    let text = '';
    node.childNodes.forEach((child) => {
        text += collectText(child);
    });
    return text;
}

export function exportCodeBlocksHtml(html: string) {
    if (!html || !/<pre[\s>]/i.test(html)) {
        return html;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('pre').forEach((pre) => {
        const language = normalizeCodeLanguage(
            pre.getAttribute('data-language') ||
                pre.getAttribute('data-highlight-language'),
        );
        const code = doc.createElement('code');
        if (language) {
            code.className = `language-${language}`;
        }
        code.textContent = collectText(pre).replace(/\n$/, '');

        const next = doc.createElement('pre');
        next.appendChild(code);
        pre.replaceWith(next);
    });

    return doc.body.innerHTML;
}

export function importCodeBlocksHtml(html: string) {
    if (!html || !/<pre[\s>]/i.test(html)) {
        return html;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('pre').forEach((pre) => {
        const code = pre.querySelector('code');
        const language = normalizeCodeLanguage(
            languageFromClassName(code?.className) ||
                pre.getAttribute('data-language'),
        );
        const text = collectText(code ?? pre);

        const next = doc.createElement('pre');
        if (language) {
            next.setAttribute('data-language', language);
        }
        text.split('\n').forEach((line, index) => {
            if (index > 0) {
                next.appendChild(doc.createElement('br'));
            }
            if (line) {
                next.appendChild(doc.createTextNode(line));
            }
        });
        pre.replaceWith(next);
    });

    return doc.body.innerHTML;
}

export function decorateCodeBlocksHtml(html: string) {
    if (!html || !/<pre[\s>]/i.test(html)) {
        return html;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('pre').forEach((pre) => {
        if (pre.closest('.code_block')) {
            return;
        }

        const code = pre.querySelector('code');
        const language = normalizeCodeLanguage(
            languageFromClassName(code?.className) ||
                pre.getAttribute('data-language'),
        );

        const wrapper = doc.createElement('div');
        wrapper.className = 'code_block';

        const head = doc.createElement('div');
        head.className = 'code_block_head';

        const label = doc.createElement('span');
        label.className = 'code_block_lang';
        label.textContent = language || 'code';

        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'code_block_copy';
        button.setAttribute('data-code-copy', '');
        button.textContent = 'Copy';

        head.append(label, button);
        pre.replaceWith(wrapper);
        wrapper.append(head, pre);
    });

    return doc.body.innerHTML;
}
