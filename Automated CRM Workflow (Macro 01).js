// ==UserScript==
// @name         Macro 01
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Full Automation: Auto-Submit, Verified Paste Loop, Ghost Delete, & Save/Close Slam for internal CRM workflows.
// @match        https://internal-crm.company.local/*
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

/*
 * DISCLAIMER:
 * This is a sanitized, anonymized version of an internal productivity tool 
 * built to automate repetitive compliance and data-entry workflows. 
 * All proprietary business logic, URLs, internal DOM selectors, and 
 * company identifiers have been redacted.
 */

(function() {
    'use strict';

    // Bypasses legacy CRM unsaved-changes warnings to allow headless macro execution.
    // In a controlled internal environment, this prevents blocking the automation loop.
    window.addEventListener('beforeunload', function(e) {
        e.stopImmediatePropagation();
    }, true);
    window.onbeforeunload = null;

    function executeLocalSubmit() {
        const logInput = document.getElementById('inputLogIdField');
        const submitBtn = document.getElementById('submitLogId');

        if (logInput && submitBtn) {
            logInput.focus();

            // Redacted internal procedure ID
            logInput.value = 'PROCEDURE_01';
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(logInput, 'PROCEDURE_01');
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
        // Genericized selectors for rich text editors
        const editor = document.querySelector('.rich-text-editor') ||
                       document.querySelector('div[data-testid="editor-instance"]');

        if (editor) {
            editor.focus();

            // Aggressive DOM Wipe: Clears restrictive web app editors that block standard input
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
          
            // Faking a physical paste event is a known workaround for restrictive 
            // internal web apps that only accept clipboard-originated text.
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
        // Genericized modal selectors (replaced Oracle JET specific classes)
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
        // Targets the button based on immutable attributes rather than dynamic IDs
        const saveBtn = document.querySelector('button[data-action="save-and-close"]') ||
                        document.querySelector('[data-testid="save-close-btn"]') ||
                        document.querySelector('.save-close-icon')?.closest('button');

        if (saveBtn) {
            saveBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            saveBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            saveBtn.click();
            return true;
        }
        return false;
    }

    function executeLocalUserIdScan() {
        // Genericized user profile selectors
        const el = document.querySelector('[data-testid="user-profile"] .readonly-field');
        if (el && el.textContent.trim()) return el.textContent.trim();
        const inputEl = document.querySelector('[data-testid="user-profile"] input');
        if (inputEl && inputEl.value.trim()) return inputEl.value.trim();
        return null;
    }

    function executeLocalPasteAndVerify(templateText, attempt = 1) {
        const editor = document.querySelector('.rich-text-editor') ||
                       document.querySelector('div[data-testid="editor-instance"]');

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
                // Failed Check: Wipe & re-paste loop
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

        // --- HOTKEY: Alt + V ---
        if (e.altKey && e.key.toLowerCase() === 'v') {
            e.preventDefault(); e.stopPropagation();

            const uploadId = prompt("Enter Document Reference ID:");
            if (!uploadId) return;

            GM_setValue('macro_signal', { action: 'SUBMIT_PROCEDURE', timestamp: Date.now() });

            const userId = executeLocalUserIdScan() || "[USER_ID]";
            
            // Sanitized generic template
            const template = `${userId}\nReview context: [Standard Review Procedure]\nReview Touch: 2nd\nIssues Found: Document Ref ID ${uploadId.trim()} flagged by third-party vendor.\nActions Taken: Handled as per internal standard operating procedures.\nReview outcome: Application Canceled\n\n===Autologger procedure ID: PROCEDURE_01===`;

            GM_setClipboard(template, 'text');

            setTimeout(function() {
                GM_setValue('macro_signal', { action: 'PASTE_VERIFY_SAVE', text: template, timestamp: Date.now() });
            }, 1300);
        }

    }, true);
})();