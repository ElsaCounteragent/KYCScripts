// ==UserScript==
// @name         Custhelp Dual Autologger (8451 & 8513)
// @namespace    http://tampermonkey.net/
// @version      9.1
// @description  Automates case logging, editor state wiping, and case closure via cross-frame broadcast communication.
// @match        https://*.custhelp.com/*
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

(function() {
    'use strict';

    const TEMPLATE_MODE = '8513';

    window.addEventListener('beforeunload', function(e) {
        e.stopImmediatePropagation();
    }, true);
    window.onbeforeunload = null;

    function executeLocalSubmit() {
        const logInput = document.getElementById('inputLogIdField');
        const submitBtn = document.getElementById('submitLogId');

        if (logInput && submitBtn) {
            logInput.focus();
            
            logInput.value = '8513';
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(logInput, '8513');
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
        const editor = document.querySelector('.ck-editor__editable') || 
                       document.querySelector('div[automationid="editorInstance"]');
        
        if (editor) {
            editor.focus();

            try {
                const ck = editor.ckeditorInstance || editor.editor || (editor.closest('.ck-editor') && editor.closest('.ck-editor').editor);
                if (ck && typeof ck.setData === 'function') ck.setData('');
                
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

    function executeLocalDismissDialog() {
        const dialogs = document.querySelectorAll('oj-dialog, .oj-dialog, [role="dialog"]');
        dialogs.forEach(dialog => dialog.remove());

        const overlays = document.querySelectorAll('.oj-dialog-layer, .oj-component-overlay, .oj-dialog-container');
        overlays.forEach(overlay => overlay.remove());

        const buttons = document.querySelectorAll('button.oj-button-button, button.oj-button');
        buttons.forEach(btn => {
            if (btn.textContent.trim() === 'OK' || btn.innerText.includes('OK')) {
                const dialogContainer = btn.closest('[role="dialog"]') || btn.closest('.oj-dialog');
                if (dialogContainer) dialogContainer.remove();
            }
        });

        return true;
    }

    function executeLocalSaveAndClose() {
        const saveBtn = document.querySelector('button[data-commandtype="SaveAndClose"]') ||
                        document.querySelector('[automationid$="IncidentSaveAndClose"]') ||
                        document.querySelector('.save-close-icon')?.closest('button');
        
        if (saveBtn) {
            saveBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            saveBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            saveBtn.click();
            return true;
        }
        return false;
    }

    function executeLocalAhIdScan() {
        const el = document.querySelector('[automationid="Contact.Login"] .oj-text-field-readonly');
        if (el && el.textContent.trim()) return el.textContent.trim();
        
        const inputEl = document.querySelector('[automationid="Contact.Login"] input');
        if (inputEl && inputEl.value.trim()) return inputEl.value.trim();
        
        return null;
    }

    GM_addValueChangeListener('macro_signal', function(name, old_value, new_value, remote) {
        if (!new_value) return;

        switch (new_value.action) {
            case 'SUBMIT_8513': executeLocalSubmit(); break;
            case 'PASTE_TEXT': executeLocalPaste(new_value.text); break;
            case 'DISMISS_OK': executeLocalDismissDialog(); break;
            case 'SAVE_AND_CLOSE': executeLocalSaveAndClose(); break;
        }
    });

    function build8451Template(inputString) {
        if (!inputString) return null;
        
        const parts = inputString.split('>>>');
        if (parts.length < 3) return null;

        const issueFound = parts[0].trim();
        const actionsTaken = parts[1].trim();
        let rawRequest = parts[2].trim();

        let coreAction = rawRequest.replace(/^Requested AH to\s+/i, '').trim();
        if (/^needs?\s+to\s+/i.test(coreAction)) {
            coreAction = coreAction.replace(/^needs?\s+to\s+/i, '');
        } else if (/^needs?\s+/i.test(coreAction)) {
            coreAction = coreAction.replace(/^needs?\s+/i, 'submit ');
        }

        const ccInstruction = "Please ask AH to " + coreAction;
        const kycInstruction = "Please continue with the review once AH is able to " + coreAction;
        const ahId = executeLocalAhIdScan() || "[AH_ID]"; 

        return `${ahId}\n\nReview Context: < INC CDD / ACCOUNT APPROVAL > \n\nWhich touch is this review: < 1st > \n\nIssues found: < ${issueFound} >\n\nWhat actions were taken during the review; < ${actionsTaken} >\n\nReview outcome: < Further action required >\n\nInstructions for KYC: < ${kycInstruction} >\n\nInstructions for CC: < ${ccInstruction} >\n\n===Autologger procedure ID: 8451===`;
    }

    function build8513Template(inputString) {
        if (!inputString) return null;
        return `Issue: Document Review\n\nNotes: ${inputString.trim()}\n\n===Autologger procedure ID: 8513===`;
    }

    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key.toLowerCase() === 'q') {
            e.preventDefault(); 
            e.stopPropagation();

            let template = null;

            if (TEMPLATE_MODE === '8451') {
                const inputString = prompt("String (Problem >>> Actions >>> Request):", "");
                template = build8451Template(inputString);
            } else if (TEMPLATE_MODE === '8513') {
                const inputString = prompt("Notes:", "");
                template = build8513Template(inputString);
            }

            if (template) {
                GM_setClipboard(template, 'text');
                GM_setValue('macro_signal', { action: 'PASTE_TEXT', text: template, timestamp: Date.now() });
            }
        }
        else if (e.altKey && e.key.toLowerCase() === 'a') {
            e.preventDefault(); 
            e.stopPropagation();

            const template = "Issue: Document Review\n\nNotes: Account Cleared\n\n===Autologger procedure ID: 8513===";
            GM_setClipboard(template, 'text');

            GM_setValue('macro_signal', { action: 'SUBMIT_8513', timestamp: Date.now() });

            setTimeout(function() {
                GM_setValue('macro_signal', { action: 'PASTE_TEXT', text: template, timestamp: Date.now() });

                setTimeout(function() {
                    GM_setValue('macro_signal', { action: 'DISMISS_OK', timestamp: Date.now() });
                    
                    setTimeout(function() {
                        GM_setValue('macro_signal', { action: 'SAVE_AND_CLOSE', timestamp: Date.now() });
                    }, 400);

                }, 800);

            }, 1200);
        }
    }, true);
})();