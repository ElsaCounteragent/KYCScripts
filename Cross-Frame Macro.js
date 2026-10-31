// ==UserScript==
// @name         Automated CRM Workflow & Cross-Frame Macro
// @namespace    http://tampermonkey.net/
// @version      10.0
// @description  Full Automation: Auto-Submit, Verified Paste Loop, Ghost Delete, Cross-Frame Signaling & Save/Close Slam
// @match        https://internal-crm.company.local/*
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal CRM automation tool.
 * Demonstrates cross-tab/frame communication, aggressive DOM wiping for 
 * restrictive WYSIWYG editors, and verified paste-retry loops.
 */

(function() {
    'use strict';

    const TEMPLATE_MODE = 'PROCEDURE_B';

    // Bypasses legacy CRM unsaved-changes warnings to allow headless macro execution.
    window.addEventListener('beforeunload', function(e) {
        e.stopImmediatePropagation();
    }, true);
    window.onbeforeunload = null;

    function executeLocalSubmit() {
        const logInput = document.getElementById('inputLogIdField');
        const submitBtn = document.getElementById('submitLogId');

        if (logInput && submitBtn) {
            logInput.focus();

            logInput.value = 'PROCEDURE_B';
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(logInput, 'PROCEDURE_B');
            }

            logInput.dispatchEvent(new Event('input', { bubbles: true }));
            logInput.dispatchEvent(new Event('change', { bubbles: true }));
            logInput.dispatchEvent(new Event('blur', { bubbles: true }));

            submitBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            submitBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            submitBtn.click();
            return true;
        }
        return false;
    }

    function executeLocalPaste(templateText) {
        const editor = document.querySelector('.rich-text-editor') ||
                       document.querySelector('div[data-testid="editorInstance"]');

        if (editor) {
            editor.focus();
            try {
                const ck = editor.ckeditorInstance || editor.editor || (editor.closest('.rich-text-editor') && editor.closest('.rich-text-editor').editor);
                if (ck && typeof ck.setData === 'function') {
                    ck.setData('');
                }

                editor.innerHTML = '';
                editor.textContent = '';

                const clearEvent = new InputEvent('beforeinput', {
                    inputType: 'deleteContentBackward',
                    bubbles: true,
                    cancelable: true
                });
                editor.dispatchEvent(clearEvent);
                editor.dispatchEvent(new Event('input', { bubbles: true }));

            } catch (e) {}

            // Faking a physical paste event is a workaround for restrictive internal 
            // web apps that block standard programmatic text injection.
            const dt = new DataTransfer();
            dt.setData('text/plain', templateText);

            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dt,
                bubbles: true,
                cancelable: true
            });

            editor.dispatchEvent(pasteEvent);

            try {
                editor.ownerDocument.execCommand('insertText', false, templateText);
            } catch (e) {}

            return true;
        }
        return false;
    }

    function executeLocalDismissOk() {
        // Genericized Oracle JET specific classes to standard modal classes
        const dialogs = document.querySelectorAll('.modal-dialog, [role="dialog"]');
        dialogs.forEach(dialog => dialog.remove());

        const overlays = document.querySelectorAll('.modal-overlay, .modal-container');
        overlays.forEach(overlay => overlay.remove());

        const buttons = document.querySelectorAll('button.btn-primary, button.btn-default');
        buttons.forEach(btn => {
            if (btn.textContent.trim() === 'OK' || btn.innerText.includes('OK')) {
                const dialogContainer = btn.closest('[role="dialog"]') || btn.closest('.modal-dialog');
                if (dialogContainer) dialogContainer.remove();
            }
        });

        return true;
    }

    function executeLocalSaveAndClose() {
        const saveBtn = document.querySelector('button[data-action="save-and-close"]') ||
                        document.querySelector('[data-testid$="CaseSaveAndClose"]') ||
                        document.querySelector('.save-close-icon')?.closest('button');

        if (saveBtn) {
            saveBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            saveBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            saveBtn.click();
            return true;
        }
        return false;
    }

    function executeLocalCustomerIdScan() {
        const el = document.querySelector('[data-testid="Customer.Login"] .readonly-field');
        if (el && el.textContent.trim()) return el.textContent.trim();
        const inputEl = document.querySelector('[data-testid="Customer.Login"] input');
        if (inputEl && inputEl.value.trim()) return inputEl.value.trim();
        return null;
    }

    function executeLocalPasteAndVerify(templateText, attempt = 1) {
        const editor = document.querySelector('.rich-text-editor') ||
                       document.querySelector('div[data-testid="editorInstance"]');

        if (!editor) {
            if (attempt <= 4) {
                setTimeout(() => executeLocalPasteAndVerify(templateText, attempt + 1), 1000);
            }
            return false;
        }

        executeLocalPaste(templateText);

        setTimeout(() => {
            const currentText = editor.innerText || editor.textContent || "";
            const cleanCurrent = currentText.replace(/[\s\u200B\xA0]+/g, '');
            const cleanTemplate = templateText.replace(/[\s\u200B\xA0]+/g, '');

            // Verification Check
            if (cleanCurrent.includes(cleanTemplate) || cleanCurrent === cleanTemplate) {
                executeLocalDismissOk();
                setTimeout(() => {
                    executeLocalSaveAndClose();
                }, 400);
            } else {
                if (attempt <= 4) {
                    console.log(`[Autologger] Text verification failed. Retrying... Attempt ${attempt + 1}`);
                    setTimeout(() => {
                        executeLocalPasteAndVerify(templateText, attempt + 1);
                    }, 1000);
                } else {
                    console.error("[Autologger] Failed to paste properly after maximum retries.");
                }
            }
        }, 300);
    }

    // Cross-frame communication listener using Tampermonkey storage
    GM_addValueChangeListener('macro_signal', function(name, old_value, new_value, remote) {
        if (!new_value) return;

        if (new_value.action === 'SUBMIT_PROCEDURE') {
            executeLocalSubmit();
        }
        else if (new_value.action === 'PASTE_TEXT') {
            executeLocalPaste(new_value.text);
        }
        else if (new_value.action === 'DISMISS_OK') {
            executeLocalDismissOk();
        }
        else if (new_value.action === 'SAVE_AND_CLOSE') {
            executeLocalSaveAndClose();
        }
        else if (new_value.action === 'PASTE_VERIFY_SAVE') {
            executeLocalPasteAndVerify(new_value.text, 1);
        }
    });

    document.addEventListener('keydown', function(e) {

        // --- HOTKEY: Alt + Q ---
        if (e.altKey && e.key.toLowerCase() === 'q') {
            e.preventDefault(); e.stopPropagation();

            let template = "";

            if (TEMPLATE_MODE === 'PROCEDURE_A') {
                const inputString = prompt("String (Problem >>> Actions >>> Request):", "");
                if (!inputString) return;

                const parts = inputString.split('>>>');
                if (parts.length < 3) return;

                const issueFound = parts[0].trim();
                const actionsTaken = parts[1].trim();
                let rawRequest = parts[2].trim();

                let coreAction = rawRequest.replace(/^Requested Customer to\s+/i, '').trim();
                if (/^needs?\s+to\s+/i.test(coreAction)) coreAction = coreAction.replace(/^needs?\s+to\s+/i, '');
                else if (/^needs?\s+/i.test(coreAction)) coreAction = coreAction.replace(/^needs?\s+/i, 'submit ');

                const supportInstruction = "Please ask Customer to " + coreAction;
                const complianceInstruction = "Please continue with the review once Customer is able to " + coreAction;

                const customerId = executeLocalCustomerIdScan() || "[CUSTOMER_ID]";

                template = `${customerId}\n\nReview Context: < STANDARD REVIEW / ACCOUNT APPROVAL >\n\nWhich touch is this review: < 1st >\n\nIssues found: < ${issueFound} >\n\nWhat actions were taken during the review: < ${actionsTaken} >\n\nReview outcome: < Further action required >\n\nInstructions for Compliance: < ${complianceInstruction} >\n\nInstructions for Support: < ${supportInstruction} >\n\n===Autologger procedure ID: PROCEDURE_A===`;

                GM_setClipboard(template, 'text');
                GM_setValue('macro_signal', { action: 'PASTE_VERIFY_SAVE', text: template, timestamp: Date.now() });

            } else if (TEMPLATE_MODE === 'PROCEDURE_B') {
                GM_setValue('macro_signal', { action: 'SUBMIT_PROCEDURE', timestamp: Date.now() });

                const inputString = prompt("Notes:", "");
                if (!inputString) return;
                template = `Issue: Document Review\n\nNotes: ${inputString.trim()}\n\n===Autologger procedure ID: PROCEDURE_B===`;

                GM_setClipboard(template, 'text');
                setTimeout(function() {
                    GM_setValue('macro_signal', { action: 'PASTE_VERIFY_SAVE', text: template, timestamp: Date.now() });
                }, 1300);
            }
        }

        // --- HOTKEY: Alt + A ---
        else if (e.altKey && e.key.toLowerCase() === 'a') {
            e.preventDefault(); e.stopPropagation();

            const template = "Issue: Document Review\n\nNotes: Account Cleared\n\n===Autologger procedure ID: PROCEDURE_B===";
            GM_setClipboard(template, 'text');

            GM_setValue('macro_signal', { action: 'SUBMIT_PROCEDURE', timestamp: Date.now() });

            setTimeout(function() {
                GM_setValue('macro_signal', { action: 'PASTE_VERIFY_SAVE', text: template, timestamp: Date.now() });
            }, 1300);
        }

    }, true);
})();