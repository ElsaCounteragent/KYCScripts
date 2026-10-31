// ==UserScript==
// @name         CRM Queue Transfer & Status Automation
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Auto-submit procedure, paste templates, verify, update Case Status, and handle framework-specific dropdown portals.
// @match        https://internal-crm.company.local/*
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal CRM automation tool.
 * Highlights a specific workaround for enterprise UI frameworks (like Oracle JET) 
 * that portal dropdown options to the document root, requiring global DOM searches 
 * and simulated mouse event sequences to successfully select options.
 */

(function() {
    'use strict';

    const TEXT_1 = "Issue: Enhanced Review\n\nNotes: Not trained to handle Enhanced Review, transferring to Specialized Tier Queue to handle the review.\n\n===Autologger procedure ID: PROCEDURE_B===";
    const TEXT_2 = "Issue: Inactive Account\n\nNotes: Not trained to review inactive accounts, transferring to Specialized Tier Queue to handle the account.\n\n===Autologger procedure ID: PROCEDURE_B===";
    const TEXT_3 = "Issue: Specialized Review\n\nNotes: Not trained to review Specialized cases, transferring to Specialized Tier Queue to handle the account.\n\n===Autologger procedure ID: PROCEDURE_B===";

    // Bypasses legacy CRM unsaved-changes warnings
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
                const ckEditorRoot = editor.closest('.rich-text-editor');
                const ck = editor.ckeditorInstance || editor.editor || (ckEditorRoot && ckEditorRoot.editor);
                if (ck && typeof ck.setData === 'function') ck.setData('');
                editor.innerHTML = '';
                editor.textContent = '';
                
                const clearEvent = new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true });
                editor.dispatchEvent(clearEvent);
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            } catch (e) {}

            const dt = new DataTransfer();
            dt.setData('text/plain', templateText);
            const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
            editor.dispatchEvent(pasteEvent);
            try { editor.ownerDocument.execCommand('insertText', false, templateText); } catch (e) {}
            return true;
        }
        return false;
    }

    function executeLocalDismissOk() {
        const dialogs = document.querySelectorAll('.modal-dialog, [role="dialog"]');
        dialogs.forEach(dialog => dialog.remove());
        const overlays = document.querySelectorAll('.modal-overlay, .modal-container');
        overlays.forEach(overlay => overlay.remove());
        return true;
    }

    /**
     * Framework Dropdown Workaround:
     * Enterprise UI frameworks often portal dropdown menus to the root <body> to prevent 
     * CSS overflow clipping. This requires a global DOM search and a precise sequence 
     * of simulated mouse events to trigger the framework's internal state changes.
     */
    async function setAndVerifyDropdown(idSubstring, targetText) {
        return new Promise((resolve) => {
            let input = document.querySelector(`input[id*="${idSubstring}"]`);
            let wrapper = document.querySelector(`[id*="${idSubstring}"]`);
            if (!input && wrapper) input = wrapper.querySelector('input') || wrapper;

            if (!input) { resolve(false); return; }

            input.focus();
            input.click();

            const container = input.closest('.custom-select') || input.closest('.select-box-root') || input.parentElement;
            if (container) {
                const arrow = container.querySelector('.select-choice') || container.querySelector('.select-box-arrow');
                if (arrow) {
                    arrow.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    arrow.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    arrow.click();
                }
            }

            setTimeout(() => {
                // Search globally across the document because the framework portals dropdowns to the root body
                const allOptions = document.querySelectorAll('li, div, span, a, [role="option"], .custom-select-item, .select-box-item-content');
                let option = Array.from(allOptions).find(el => {
                    if (el.offsetParent === null) return false; // Must be visible
                    return el.textContent.trim() === targetText;
                });

                if (!option) {
                    if (input.tagName === 'INPUT') {
                        input.value = targetText;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        setTimeout(() => {
                            const filteredOptions = document.querySelectorAll('li, div, span, a, [role="option"]');
                            option = Array.from(filteredOptions).find(el => el.offsetParent !== null && el.textContent.trim() === targetText);
                            if (option) clickOption(option, resolve);
                            else resolve(false);
                        }, 800);
                    } else { resolve(false); }
                    return;
                }
                clickOption(option, resolve);
            }, 800);
        });
    }

    function clickOption(option, resolve) {
        option.scrollIntoView({ block: 'center' });
        const events = [
            new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }),
            new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, button: 0, buttons: 1 }),
            new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, button: 0 }),
            new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 })
        ];
        events.forEach(evt => option.dispatchEvent(evt));
        setTimeout(() => resolve(true), 500);
    }

    function openDropdown(idSubstring) {
        let input = document.querySelector(`input[id*="${idSubstring}"]`);
        if (input) {
            input.focus();
            input.click();
            const container = input.closest('.custom-select') || input.parentElement;
            if (container) {
                const arrow = container.querySelector('.select-choice') || container.querySelector('.select-box-arrow');
                if (arrow) arrow.click();
            }
        }
    }

    function fillLogDescription() {
        const textarea = document.querySelector('textarea[id*="Case_LogDescription"]');
        if (textarea) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            if (nativeSetter) nativeSetter.call(textarea, "Transferred to relevant team");
            else textarea.value = "Transferred to relevant team";
            
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function executeLocalSaveAndClose() {
        const saveBtn = document.querySelector('button[data-action="save-and-close"]') || document.querySelector('[data-testid$="CaseSaveAndClose"]');
        if (saveBtn) {
            saveBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            saveBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            saveBtn.click();
            return true;
        }
        return false;
    }

    async function executeLocalPasteAndVerify(templateText, attempt = 1) {
        const editor = document.querySelector('.rich-text-editor') || document.querySelector('div[data-testid="editorInstance"]');
        if (!editor) {
            if (attempt <= 4) setTimeout(() => executeLocalPasteAndVerify(templateText, attempt + 1), 1000);
            return false;
        }

        executeLocalPaste(templateText);
        await new Promise(r => setTimeout(r, 500));

        const currentText = editor.innerText || editor.textContent || "";
        const cleanCurrent = currentText.replace(/[\s\u200B\xA0]+/g, '');
        const cleanTemplate = templateText.replace(/[\s\u200B\xA0]+/g, '');

        if (cleanCurrent.includes(cleanTemplate) || cleanCurrent === cleanTemplate) {
            executeLocalDismissOk();

            await new Promise(r => setTimeout(r, 800));
            let statusSet = await setAndVerifyDropdown('Case_Status', 'Transferred');

            await new Promise(r => setTimeout(r, 500));
            fillLogDescription();

            await new Promise(r => setTimeout(r, 500));
            openDropdown('Case_Queue');

            if (statusSet) {
                console.log("[Autologger] Status set, description filled, and Queue dropdown opened. Please select Queue and Save manually.");
            }
        } else {
            if (attempt <= 4) setTimeout(() => executeLocalPasteAndVerify(templateText, attempt + 1), 1000);
        }
    }

    GM_addValueChangeListener('macro_signal', function(name, old_value, new_value, remote) {
        if (!new_value) return;
        let data = typeof new_value === 'string' ? JSON.parse(new_value) : new_value;

        if (data.action === 'SUBMIT_PROCEDURE') executeLocalSubmit();
        else if (data.action === 'PASTE_TEXT') executeLocalPaste(data.text);
        else if (data.action === 'DISMISS_OK') executeLocalDismissOk();
        else if (data.action === 'SAVE_AND_CLOSE') executeLocalSaveAndClose();
        else if (data.action === 'PASTE_VERIFY_SAVE') executeLocalPasteAndVerify(data.text, 1);
    });

    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.code === 'KeyY') run8513Path(TEXT_1);
        else if (e.altKey && e.code === 'KeyH') run8513Path(TEXT_2);
        else if (e.altKey && e.code === 'KeyU') {
            const userInput = prompt('Enter Specialized Review Type:');
            let finalText = userInput ? TEXT_3.replace(/Specialized/g, userInput) : TEXT_3;
            run8513Path(finalText);
        }
    }, true);

    function run8513Path(template) {
        GM_setValue('macro_signal', JSON.stringify({ action: 'SUBMIT_PROCEDURE', timestamp: Date.now() }));
        GM_setClipboard(template, 'text');
        setTimeout(function() {
            GM_setValue('macro_signal', JSON.stringify({ action: 'PASTE_VERIFY_SAVE', text: template, timestamp: Date.now() }));
        }, 1300);
    }

})();