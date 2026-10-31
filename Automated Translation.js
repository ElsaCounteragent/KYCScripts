// ==UserScript==
// @name         Automated Translation Entry (Alt+U / Alt+J)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Automates adding Native Speaker translations via keyboard shortcuts for specific language queues.
// @author       Sanitized Portfolio Version
// @match        *://internal-portal.company.local/*
// @grant        none
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal productivity tool.
 * Demonstrates interaction with legacy AngularJS forms, including 
 * triggering digest cycles via synthetic events and verifying model updates.
 */

(function() {
    'use strict';

    function runAutomation(targetLangId) {
        // Ensure we are on the correct part of the application before running
        if (!window.location.hash.includes('/compliance/profile/')) {
            console.log('Skipping automation: Not on the target profile page.');
            return;
        }

        // 1. Click "Add New Translation"
        const addBtn = document.getElementById('doc-add-translation');
        if (addBtn) {
            addBtn.click();
        } else {
            console.warn('Automation: Could not find the "Add New Translation" button.');
            return;
        }

        // 2. Wait briefly for the Angular form/modal to render before filling it out
        setTimeout(() => {
            // Select "Native Speaker" (value = "3")
            const sourceSelect = document.getElementById('review-status');
            if (sourceSelect) {
                sourceSelect.value = "3";
                sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Select the target language based on the shortcut pressed
            const langSelect = document.querySelector('select[ng-model="ctrl.selectedLanguageId"]');
            if (langSelect) {
                langSelect.value = targetLangId;
                langSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Fill in the Textarea
            const textarea = document.getElementById('translation-text');
            const targetText = "Reviewed and confirmed by a native speaker";

            if (textarea) {
                textarea.value = targetText;
                // AngularJS requires both input and change events to register the model update
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.dispatchEvent(new Event('change', { bubbles: true }));

                // Verify the text was successfully pasted
                if (textarea.value === targetText) {
                    // Give Angular a brief moment to process the model changes and enable the button
                    setTimeout(() => {
                        const submitBtn = document.getElementById('review-submit-btn');
                        if (submitBtn) {
                            submitBtn.click();
                            console.log('Automation: Translation successfully added and submitted.');
                        } else {
                            console.warn('Automation: Could not find the submit button.');
                        }
                    }, 100); // 100ms delay for Angular digest cycle
                } else {
                    console.error('Automation: Textarea value verification failed.');
                }
            }

        }, 1000); // 1000ms delay for DOM rendering
    }

    // Listen for keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Trigger if 'Alt' is held down and the 'u' key is pressed (Language A)
        if (event.altKey && event.key.toLowerCase() === 'u') {
            event.preventDefault(); 
            runAutomation("98"); // Internal ID for Language A
        }

        // Trigger if 'Alt' is held down and the 'j' key is pressed (Language B)
        if (event.altKey && event.key.toLowerCase() === 'j') {
            event.preventDefault(); 
            runAutomation("77"); // Internal ID for Language B
        }
    });

})();