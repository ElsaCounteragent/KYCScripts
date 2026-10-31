// ==UserScript==
// @name         Dynamic Risk Flag Highlighter & DOM Walker
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Continuously monitors and highlights critical compliance risk flags using a TreeWalker and debounced MutationObservers to prevent UI lag.
// @author       Sanitized Portfolio Version
// @match        https://internal-portal.company.local/*
// @grant        none
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal compliance tool.
 * Highlights advanced DOM traversal using `document.createTreeWalker` for 
 * high-performance text node scanning, combined with debounced MutationObservers 
 * to handle heavy asynchronous UI repaints without causing browser lag.
 */

(function() {
    'use strict';

    // Genericized compliance and risk flags
    const keywords = [
        'UNVERIFIED',
        'SUSPICIOUS ACTIVITY',
        'SANCTIONS FLAG',
        'DATA MISMATCH',
        'ENHANCED DUE DILIGENCE',
        'PENDING MANUAL REVIEW',
        'VERIFIED NOT APPROVED',
        'ALIAS DETECTED',
        'PERIODIC REVIEW',
        'COMPLIANCE QUESTIONNAIRE'
    ];

    // Regex to match any of the keywords, case-insensitive, using word boundaries
    const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');

    // Highlight styles configured for dark mode readability with a neon effect
    const defaultStyle = 'background-color: #ff0000 !important; color: #ffffff !important; font-weight: 900 !important; padding: 2px 6px !important; border-radius: 4px !important; box-shadow: 0 0 8px rgba(255,0,0,0.8) !important; text-transform: uppercase;';

    const customStyles = {
        'PENDING MANUAL REVIEW': 'background-color: #ffcc00 !important; color: #000000 !important; font-weight: 900 !important; padding: 2px 6px !important; border-radius: 4px !important; box-shadow: 0 0 8px rgba(255,204,0,0.8) !important; text-transform: uppercase;',
        'VERIFIED NOT APPROVED': 'background-color: #00e676 !important; color: #000000 !important; font-weight: 900 !important; padding: 2px 6px !important; border-radius: 4px !important; box-shadow: 0 0 8px rgba(0,230,118,0.8) !important; text-transform: uppercase;'
    };

    function scanAndHighlight() {
        // TreeWalker is vastly more performant than querySelectorAll for scanning raw text nodes
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    const parent = node.parentNode;
                    // Ignore scripts, styles, and nodes we've already processed to prevent infinite loops
                    if (parent && (parent.nodeName === 'SCRIPT' ||
                        parent.nodeName === 'STYLE' ||
                        parent.nodeName === 'NOSCRIPT' ||
                        parent.classList.contains('alert-highlighter-mark'))) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (regex.test(node.nodeValue)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        const nodesToReplace = [];
        let currentNode;
        while (currentNode = walker.nextNode()) {
            nodesToReplace.push(currentNode);
        }

        nodesToReplace.forEach(node => {
            const text = node.nodeValue;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            regex.lastIndex = 0; // Reset regex state for global matching
            let match;

            while ((match = regex.exec(text)) !== null) {
                // Append standard text before the matched keyword
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                }

                // Inject the highlighted UI component
                const mark = document.createElement('mark');
                mark.className = 'alert-highlighter-mark';

                // Determine the style based on the matched keyword (fallback to default red)
                const matchKey = match[0].toUpperCase();
                mark.style.cssText = customStyles[matchKey] || defaultStyle;

                mark.textContent = match[0];
                fragment.appendChild(mark);

                lastIndex = regex.lastIndex;
            }

            // Append any remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }

            if (node.parentNode) {
                node.parentNode.replaceChild(fragment, node);
            }
        });
    }

    // Execute initial scan after the base framework bootstraps
    setTimeout(scanAndHighlight, 1500);

    // Deploy the observer to watch for dynamic asynchronous data loading
    let debounceTimer;
    const observer = new MutationObserver(() => {
        // Debouncing prevents browser lag and layout thrashing during heavy UI repaints
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(scanAndHighlight, 300);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
})();