// ==UserScript==
// @name         International Character Standardizer (ASCII Transliterator)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Prompts for text, normalizes international characters (e.g., Turkish, Nordic) to ASCII, and copies to clipboard for legacy system compatibility.
// @author       Sanitized Portfolio Version
// @match        https://internal-portal.company.local/*
// @grant        GM_setClipboard
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal productivity tool.
 * Demonstrates Unicode normalization (NFD) and manual character mapping 
 * to bridge the gap between modern internationalized inputs and legacy 
 * backend systems that strictly require ASCII characters.
 */

(function() {
    'use strict';

    // Map for characters that don't normalize perfectly via standard Unicode decomposition
    const charMap = {
        'ı': 'i', 'İ': 'I', // Turkish dotless i and dotted I
        'ğ': 'g', 'Ğ': 'G',
        'ş': 's', 'Ş': 'S',
        'ö': 'o', 'Ö': 'O',
        'ç': 'c', 'Ç': 'C',
        'ü': 'u', 'Ü': 'U',
        'đ': 'd', 'Đ': 'D',
        'ł': 'l', 'Ł': 'L',
        'ß': 'ss', 'æ': 'ae', 'ø': 'o', 'å': 'a'
    };

    function transliterate(str) {
        // 1. Replace the manually mapped edge-case characters
        let res = str.replace(/[ıİğĞşŞöÖçÇüÜđĐłŁßæøå]/g, match => charMap[match] || match);

        // 2. Normalize the string to NFD (Canonical Decomposition) and strip out diacritical marks
        return res.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    document.addEventListener('keydown', function(e) {
        // Trigger on Alt + T
        if (e.altKey && e.key.toLowerCase() === 't') {
            e.preventDefault(); 

            const inputString = window.prompt('Enter text to standardize:');

            if (inputString !== null && inputString.trim() !== '') {
                const cleanText = transliterate(inputString.trim());

                // Robust clipboard handling: Async API first, fallback to Tampermonkey grant
                navigator.clipboard.writeText(cleanText).catch(err => {
                    console.warn('Async Clipboard API failed (likely due to internal security policies). Falling back to GM_setClipboard.', err);
                    if (typeof GM_setClipboard !== 'undefined') {
                         GM_setClipboard(cleanText);
                    }
                });
            }
        }
    });
})();