// ==UserScript==
// @name         Automated Account Restriction & Fraud Workflow
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Automates complex multi-step compliance workflows. Features a custom Deep DOM Search utility to pierce Shadow DOMs and iframes, and legacy framework event bridging.
// @author       Sanitized Portfolio Version
// @match        *://internal-crm.company.local/*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal compliance automation tool.
 * Highlights advanced DOM traversal techniques, including a custom recursive 
 * search function that pierces Shadow DOM boundaries and same-origin iframes 
 * to interact with heavily encapsulated enterprise UI components.
 */

(function() {
    'use strict';

    let isProcessing = false;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Legacy Framework Event Bridge:
     * Legacy frameworks (like AngularJS) often ignore standard DOM events. 
     * This helper dispatches standard events while also attempting to trigger 
     * the framework's internal event handlers to force model updates and digest cycles.
     */
    function triggerChangeEvent(element) {
        if (!element) return;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
        if (window.angular && window.angular.element) {
            try { window.angular.element(element).triggerHandler('change'); } catch (e) {}
        }
    }

    /**
     * Deep DOM Search Utility:
     * Standard `querySelectorAll` cannot see inside Shadow DOMs or iframes.
     * This recursive function traverses the main document, pierces open Shadow 
     * roots, and searches same-origin iframes to locate deeply nested enterprise 
     * UI components that are otherwise inaccessible to standard automation tools.
     */
    function querySelectorAllDeep(selector) {
        const elements = [];
        function search(root) {
            if (!root) return;
            const found = root.querySelectorAll(selector);
            elements.push(...found);
            
            const allElements = root.querySelectorAll('*');
            for (const el of allElements) {
                if (el.shadowRoot) search(el.shadowRoot);
            }
        }
        search(document);
        
        // Search same-origin iframes
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                search(doc);
            } catch (e) {} // Cross-origin restrictions
        }
        return elements;
    }

    async function selectDropdownOption(targetValue, label) {
        for (let attempt = 0; attempt < 40; attempt++) {
            const allSelects = querySelectorAllDeep('select');
            for (const select of allSelects) {
                for (const option of select.options) {
                    if (option.value === targetValue || option.value.trim() === targetValue.trim()) {
                        select.value = option.value;
                        triggerChangeEvent(select);
                        console.log(`[Auto-Fill] [${label}] Selected: "${option.value}"`);
                        await sleep(1000);
                        return true;
                    }
                }
            }
            await sleep(250);
        }
        console.warn(`[Auto-Fill] [${label}] FAILED: "${targetValue}"`);
        return false;
    }

    async function clickCheckbox(id) {
        for (let attempt = 0; attempt < 15; attempt++) {
            // Genericized data-testid selector
            const cb = querySelectorAllDeep(`input[data-testid="${id}"]`)[0];
            if (cb) {
                if (!cb.checked) {
                    const label = cb.closest('label');
                    (label || cb).click();
                    console.log(`[Auto-Fill] Checked ${id}.`);
                    await sleep(300);
                }
                return true;
            }
            await sleep(200);
        }
        console.warn(`[Auto-Fill] Checkbox ${id} not found.`);
        return false;
    }

    async function fillInput(selector, text) {
        for (let attempt = 0; attempt < 15; attempt++) {
            const el = querySelectorAllDeep(selector)[0];
            if (el) {
                if (el.isContentEditable) {
                    el.innerText = text;
                } else {
                    el.value = text;
                }
                triggerChangeEvent(el);
                await sleep(300);
                return true;
            }
            await sleep(200);
        }
        console.warn(`[Auto-Fill] Not found: ${selector}`);
        return false;
    }

    async function closeSuccessPopup() {
        await sleep(2000);
        const allBtns = querySelectorAllDeep('button');
        for (const btn of allBtns) {
            const t = btn.textContent.trim().toLowerCase();
            if ((t === 'ok' || t === 'close' || t === 'done' || t === '×') && btn.offsetParent !== null) {
                btn.click();
                console.log(`[Auto-Fill] Closed popup: "${btn.textContent.trim()}"`);
                return;
            }
        }
        const closeIcons = querySelectorAllDeep('.modal .close, [aria-label="Close"]');
        for (const el of closeIcons) {
            if (el.offsetParent !== null) {
                el.click();
                return;
            }
        }
    }

    async function processRestrictionWorkflow(documentType, referenceId) {
        try {
            // 1. Click Restrict Account Button (Genericized internal action)
            let restrictBtn = querySelectorAllDeep('button[data-action="openRestrictionModal"]')[0];
            if (!restrictBtn) {
                restrictBtn = querySelectorAllDeep('button').find(b => b.textContent.trim().includes('RESTRICT ACCOUNT'));
            }
            if (restrictBtn) {
                restrictBtn.click();
                console.log('[Auto-Fill] Clicked RESTRICT ACCOUNT.');
            } else {
                console.warn('[Auto-Fill] Restriction button not found.');
                return;
            }

            await sleep(2000);

            // 2. Closure Reason
            if (!await selectDropdownOption("reason: fraud", "Closure Reason")) return;

            // 3. Department: Compliance
            if (!await selectDropdownOption("dept: compliance", "Department")) return;

            // 4. Category: Documentation
            if (!await selectDropdownOption("cat: documents", "Category")) return;

            // 5. Subject: Suspected fraudulent submission
            if (!await selectDropdownOption("subj: altered_doc", "Subject")) return;

            // 6. Title (Genericized CSS classes)
            await fillInput('.manual-log-params .multiline-input textarea', "Cancel - Fraudulent documentation provided during registration");

            // 7. Description
            await fillInput('div[data-testid="ManualLog.Text"]', `${documentType} provided is fraudulent, cancelling the application`);

            // 8. Flag for Review checkbox
            await clickCheckbox('flag-for-review');

            // 9. Review Notes textarea
            await fillInput('.add-review-note-params textarea', "The customer provided altered documentation");

            // 10. Critical Alert checkbox — LAST before submit
            await clickCheckbox('is-critical-alert');

            // 11. Close Account
            const closeBtn = querySelectorAllDeep('button').find(b => b.textContent.includes('Close Account'));
            if (closeBtn) {
                closeBtn.click();
                console.log('[Auto-Fill] Clicked Close Account.');
            }

            // 12. Close success popup
            await closeSuccessPopup();

            // 13. Copy reference ID
            GM_setClipboard(referenceId);
            console.log(`[Auto-Fill] Done. Reference ID "${referenceId}" copied.`);

        } catch (error) {
            console.error('[Auto-Fill] Error:', error);
        } finally {
            setTimeout(() => { isProcessing = false; }, 500);
        }
    }

    document.addEventListener('keydown', function(e) {
        if (isProcessing) return;
        if (e.altKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            e.stopPropagation();
            isProcessing = true;

            const userInput = prompt('Enter document type and reference ID (e.g., "Passport 12345678"):');
            if (!userInput) { isProcessing = false; return; }

            const lastSpace = userInput.lastIndexOf(' ');
            if (lastSpace === -1) { isProcessing = false; return; }

            const documentType = userInput.substring(0, lastSpace).trim();
            const referenceId = userInput.substring(lastSpace + 1).trim();
            if (!/^\d+$/.test(referenceId)) { isProcessing = false; return; }

            processRestrictionWorkflow(documentType, referenceId);
        }
    }, true);

})();