// ==UserScript==
// @name         Sanctions Auto-Fill & Context Extractor (Alt+E)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Activates on Alt+E. Polls & sets AngularJS dropdowns dynamically, extracts sanctions context from clipboard via localized regex, and fills compliance forms.
// @author       Sanitized Portfolio Version
// @match        https://internal-portal.company.local/*
// @grant        GM_setClipboard
// @grant        unsafeWindow
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal compliance automation tool.
 * Combines multiple advanced techniques: Async Clipboard API reading, 
 * Context-Window Regex extraction, and AngularJS scope bridging via `unsafeWindow` 
 * to automate complex, multi-step compliance workflows.
 */

(function() {
    'use strict';

    const delay = ms => new Promise(res => setTimeout(res, ms));

    /* ═══════════════════════════════════════════
       SANCTIONS EXTRACTION ENGINE
       Uses a localized context-window to prevent false positives 
       when scanning large text blocks for compliance flags.
       ═══════════════════════════════════════════ */
    const SANCTIONS_REGIONS = [
        'REGION A', 'REGION B', 'REGION C',
        'REGION D', 'REGION E', 'REGION F'
    ];

    const REGION_CANON = {
        'REGION A': 'REGION A', 'REGION B': 'REGION B', 'REGION C': 'REGION C',
        'REGION D': 'REGION D', 'REGION E': 'REGION E', 'REGION F': 'REGION F'
    };

    const INDICATION_PATTERNS = [
        { re: /\bID\b[\s\S]{0,25}?(?:PLACE\s*OF\s*BIRTH|BIRTH\s*PLACE|BIRTH\s*COUNTRY)/i, val: 'ID Place of birth' },
        { re: /(?:PLACE\s*OF\s*BIRTH|BIRTH\s*PLACE|BIRTH\s*COUNTRY)[\s\S]{0,15}?\bID\b/i, val: 'ID Place of birth' },
        { re: /\bPOR\b[\s\S]{0,25}?(?:ADDRESS|BILLING|RESIDEN)/i, val: 'POR Address' },
        { re: /(?:ADDRESS|BILLING|RESIDEN)[\s\S]{0,15}?\bPOR\b/i, val: 'POR Address' },
        { re: /\bID\b[\s\S]{0,25}?NATIONALIT/i, val: 'ID Nationality' },
        { re: /NATIONALIT[\s\S]{0,15}?\bID\b/i, val: 'ID Nationality' },
        { re: /NATIONALIT/i, val: 'Nationality' },
        { re: /\bIP\b[\s\S]{0,15}?(?:ADDRESS|LOCATION|GEO|REGION|COUNTRY)/i, val: 'IP' },
        { re: /\bIP\b/i, val: 'IP' },
        { re: /BILLING\s*ADDRESS/i, val: 'Billing Address' },
        { re: /DUPLICATE/i, val: 'Duplicate' },
        { re: /\bPOR\b/i, val: 'POR' },
        { re: /\bID\b/i, val: 'ID' },
    ];

    function extractSanctions(raw) {
        const text = raw.replace(/\s+/g, ' ').trim();
        const upper = text.toUpperCase();

        let region = '';
        let regionIdx = -1;
        for (const r of SANCTIONS_REGIONS) {
            const idx = upper.indexOf(r);
            if (idx !== -1) {
                region = REGION_CANON[r] || r;
                regionIdx = idx;
                break;
            }
        }

        // Build context window: 80 chars before → 40 after region
        let context = upper;
        if (regionIdx !== -1) {
            const start = Math.max(0, regionIdx - 80);
            const end = Math.min(upper.length, regionIdx + region.length + 40);
            context = upper.slice(start, end);
        }

        let indication = '';
        for (const p of INDICATION_PATTERNS) {
            if (p.re.test(context)) {
                indication = p.val;
                break;
            }
        }

        let level = 'Low';
        if (/\bHIGH\b/.test(upper)) level = 'High';
        else if (/\bLOW\b/.test(upper)) level = 'Low';

        return { region, indication, level, context };
    }

    /* ═══════════════════════════════════════════
       ANGULARJS SCOPE BRIDGE (MASTER KEY)
       Polls for the select element and options dynamically, 
       then injects values directly into the AngularJS scope 
       to trigger digest cycles and ng-change events.
       ═══════════════════════════════════════════ */
    async function masterKey(targetLabel) {
        const targetLower = targetLabel.toLowerCase();

        for (let i = 0; i < 60; i++) {
            const allSelects = document.querySelectorAll('select');
            let foundAndSet = false;

            for (let s = 0; s < allSelects.length; s++) {
                const selectEl = allSelects[s];
                const ngModelAttr = selectEl.getAttribute('ng-model');
                if (!ngModelAttr) continue;

                const options = Array.from(selectEl.options);
                const targetOpt = options.find(function(opt) {
                    return (opt.label && opt.label.trim().toLowerCase() === targetLower) ||
                           (opt.text && opt.text.trim().toLowerCase() === targetLower);
                });

                if (targetOpt) {
                    let rawVal = targetOpt.value;
                    let cleanVal = rawVal;

                    if (rawVal.indexOf('number:') !== -1) {
                        cleanVal = Number(rawVal.split('number:')[1].trim());
                    } else if (rawVal.indexOf('string:') !== -1) {
                        cleanVal = rawVal.split('string:')[1].trim();
                    } else if (!isNaN(rawVal) && rawVal.trim() !== "") {
                        cleanVal = Number(rawVal);
                    }

                    try {
                        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.angular) {
                            const angular = unsafeWindow.angular;
                            const ngEl = angular.element(selectEl);
                            const scope = ngEl.scope();

                            if (scope) {
                                const currentVal = scope.$eval(ngModelAttr);
                                if (currentVal === cleanVal) {
                                    foundAndSet = true;
                                    break;
                                }

                                scope.$eval(ngModelAttr + " = " + JSON.stringify(cleanVal));

                                const ngChangeAttr = selectEl.getAttribute('ng-change');
                                const ngOptionsAttr = selectEl.getAttribute('ng-options');

                                if (ngChangeAttr) {
                                    let locals = {};
                                    if (ngOptionsAttr) {
                                        const inMatch = ngOptionsAttr.match(/\s+in\s+([a-zA-Z0-9\.\_]+)/);
                                        const asMatch = ngOptionsAttr.match(/^\s*([a-zA-Z0-9\.\_]+)\s+as/);
                                        const itemMatch = ngOptionsAttr.match(/^\s*([a-zA-Z0-9\_]+)/);

                                        if (inMatch && asMatch && itemMatch) {
                                            const arrayName = inMatch[1];
                                            const valuePath = asMatch[1];
                                            const itemName = itemMatch[1];
                                            const propName = valuePath.substring(itemName.length + 1);

                                            try {
                                                const arr = scope.$eval(arrayName);
                                                if (Array.isArray(arr)) {
                                                    const matchedObj = arr.find(function(item) {
                                                        return propName ? item[propName] === cleanVal : item === cleanVal;
                                                    });
                                                    if (matchedObj) {
                                                        locals[itemName] = matchedObj;
                                                    }
                                                }
                                            } catch(e) {}
                                        }
                                    }
                                    scope.$eval(ngChangeAttr, locals);
                                }

                                if (!scope.$$phase && !scope.$root.$$phase) {
                                    scope.$apply();
                                }

                                selectEl.value = targetOpt.value;
                                foundAndSet = true;
                            }
                        }
                    } catch (err) {
                        console.error("[Scope Bridge] Error: ", err);
                    }
                }
            }

            if (foundAndSet) return true;
            await delay(150);
        }
        return false;
    }

    function setInputValue(inputEl, value) {
        if (!inputEl) return;
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.angular) {
            const angular = unsafeWindow.angular;
            const ngEl = angular.element(inputEl);
            const scope = ngEl.scope();
            const ngModel = ngEl.controller('ngModel');

            if (ngModel) {
                ngModel.$setViewValue(value);
                ngModel.$render();
            }
            if (scope && !scope.$$phase && !scope.$root.$$phase) {
                scope.$apply();
            }
        }

        inputEl.value = value;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async function waitForElement(selector, timeoutMs = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const el = document.querySelector(selector);
            if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.tagName === 'TEXTAREA')) return el;
            await delay(150);
        }
        return null;
    }

    /* ═══════════════════════════════════════════
       MAIN SEQUENCE (Alt + E)
       ═══════════════════════════════════════════ */
    async function runSanctionsSequence() {
        console.log('[Sanctions Autologger] Sequence started...');

        // 1. Click the Ink Ripple Checkbox (Material Design specific)
        const clickDiv = document.querySelector('div.md-container.md-ink-ripple[md-ink-ripple-checkbox]');
        if (clickDiv) {
            clickDiv.click();
            await delay(500);
        }

        // 2. Dropdown sequence using AngularJS scope bridge
        await masterKey('Compliance');
        await delay(600);
        await masterKey('Internal Notes');
        await delay(600);
        await masterKey('Sanctions');
        await delay(600);
        await masterKey('Sanctions Low Risk - document/s requested');
        await delay(600);

        // 3. Write to Subject Input
        const subjectInput = await waitForElement('#Subject');
        if (subjectInput) {
            setInputValue(subjectInput, 'Sanctions indication - document/s requested');
        }

        // 4. Read clipboard & Process Sanctions logic
        let clipboardText = '';
        try {
            clipboardText = await navigator.clipboard.readText();
        } catch (e) {
            console.warn("Clipboard read failed, falling back to prompt", e);
            clipboardText = prompt("Clipboard access denied. Paste your context here:") || '';
        }

        let entityId = "[ENTITY_ID_NOT_FOUND]";
        const urlMatch = window.location.href.match(/profile\/(\d+)/i);
        if (urlMatch && urlMatch[1]) {
            entityId = urlMatch[1];
        }

        const touch = "2nd";

        let templateEnd =
            `\n\nReview outcome: Further Action Required\n\nIf further action is required: \n\nInstructions for Tier 2: Please assist to review once customer provides documents.\n\nInstructions for Support: Please advise customer\n\n===Autologger procedure ID: PROCEDURE_C===`;

        let indication = '', region = '', level = 'Low';

        if (clipboardText) {
            const extracted = extractSanctions(clipboardText);
            indication = extracted.indication;
            region = extracted.region;
            level = extracted.level;

            if (indication === 'POR Address' && level === 'High') {
                templateEnd =
                    `\n\n\n\n[POR] confirms a restricted address. No additional documents were requested from the customer, as the indication cannot be cleared. Account is restricted. Please proceed with review and closing the customer\n\n\n===Autologger procedure ID: PROCEDURE_C===`;
            }
        }

        const finalIndication = indication || '[Specify Indication]';
        const finalRegion = region || '[Specify Region]';

        const template =
`Dear Compliance Team,

${entityId}

Which touch is this review: ${touch}

Issues found: Customer has ${level} Sanctions indication

Indication – ${finalIndication}
Suspected Region – ${finalRegion}
Documents required – Customer must have approved ID + POR outside of restricted jurisdiction.

What actions were taken during the review: Transferred to Tier 2 for further review once customer provided documents${templateEnd}`;

        // 5. Paste to Description Box
        const descBox = await waitForElement('#Description');
        if (descBox) {
            setInputValue(descBox, template);
            console.log('[Sanctions Autologger] Template pasted successfully.');
        }

        // 6. Copy generated template to clipboard
        if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(template, 'text');
        } else {
            try {
                await navigator.clipboard.writeText(template);
            } catch (e) {
                console.warn("Failed to copy to clipboard automatically.");
            }
        }
        console.log('[Sanctions Autologger] Template copied to clipboard.');
    }

    /* ═══════════════════════════════════════════
       EVENT LISTENER
       ═══════════════════════════════════════════ */
    document.addEventListener('keydown', async function(e) {
        if (e.altKey && e.code === 'KeyE') {
            e.preventDefault();
            e.stopPropagation();
            await runSanctionsSequence();
        }
    }, true);

})();