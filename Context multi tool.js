// ==UserScript==
// @name         Context-Aware Compliance Multi-Tool
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Automatically handles various compliance reviews (Identity Mismatches, Proof of Residence, Biometrics) by reading DOM state and triggering framework-specific model updates.
// @author       Sanitized Portfolio Version
// @match        *://internal-crm.company.local/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal compliance automation tool.
 * Highlights context-aware decision trees based on DOM text extraction, 
 * and techniques for forcing legacy framework (AngularJS) digest cycles 
 * via synthetic event dispatching and triggerHandler calls.
 */

(function() {
    'use strict';

    const DELAY = 500;
    let isProcessing = false;

    function waitForElement(selector, maxAttempts = 20, interval = 500) {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                const el = document.querySelector(selector);
                if (el) {
                    resolve(el);
                } else if (attempts >= maxAttempts) {
                    resolve(null);
                } else {
                    attempts++;
                    setTimeout(check, interval);
                }
            };
            check();
        });
    }

    /**
     * Legacy Framework Event Bridge:
     * Simply changing `.value` doesn't update AngularJS models. 
     * We dispatch standard DOM events and use the framework's internal 
     * `triggerHandler` to force the model to update and enable submit buttons.
     */
    function triggerChangeEvent(element) {
        if (!element) return;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));

        if (window.angular && window.angular.element) {
            try {
                window.angular.element(element).triggerHandler('change');
            } catch (e) {
                console.warn('Framework trigger failed', e);
            }
        }
    }

    // ==========================================
    // QUESTIONNAIRE CASE (Identity / Data Mismatch)
    // ==========================================
    async function processMismatchQuestionnaire() {
        try {
            // 1. READ THE ANSWER FIRST (before entering edit mode)
            const answerSpan = document.querySelector('.questionnaire-row .answer span[ng-else], .questionnaire-row .answer span');
            let answerText = "";

            if (answerSpan) {
                answerText = answerSpan.textContent.trim();
                console.log('[Auto-Fill] Found answer:', answerText);
            } else {
                console.warn('[Auto-Fill] Answer span not found. Ensure the questionnaire is CLOSED before running.');
                return;
            }

            // 2. CLICK EDIT BUTTON
            const openQBtn = document.getElementById('edit-status-btn');
            if (openQBtn) {
                openQBtn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.warn('[Auto-Fill] Could not find "Edit Status" button.');
            }

            // 3. FIND FORM ELEMENTS
            const statusSelect = await waitForElement('select[ng-model="newQStatus"]');
            const okButton = await waitForElement('#save-state-btn');

            if (!statusSelect || !okButton) {
                console.warn('[Auto-Fill] Could not find the status dropdown or OK button.');
                return;
            }

            // 4. LOGIC (Decision tree based on extracted text)
            if (answerText.includes("mistake") || answerText.includes("typo")) {
                console.log('[Auto-Fill] Scenario 1: Mistake/Typo - Selecting Approved');
                statusSelect.value = "number:3"; // Framework specific value mapping
                triggerChangeEvent(statusSelect);

                await new Promise(resolve => setTimeout(resolve, DELAY));
                if (okButton.hasAttribute('disabled') || okButton.disabled) await new Promise(resolve => setTimeout(resolve, 1000));
                okButton.click();

            }
            else if (answerText.includes("new ID") || answerText.includes("different number")) {
                console.log('[Auto-Fill] Scenario 2: New Document - Doing nothing as requested.');

            }
            else if (answerText.includes("didn't make a mistake") || answerText.includes("can't remember")) {
                console.log('[Auto-Fill] Scenario 3: No mistake - Selecting NotRelevant + Invalid answer');
                statusSelect.value = "number:9";
                triggerChangeEvent(statusSelect);

                await new Promise(resolve => setTimeout(resolve, DELAY));

                const subReasonSelect = await waitForElement('#sub-reason-select');
                if (subReasonSelect) {
                    subReasonSelect.value = "number:112";
                    triggerChangeEvent(subReasonSelect);

                    await new Promise(resolve => setTimeout(resolve, DELAY));
                    if (okButton.hasAttribute('disabled') || okButton.disabled) await new Promise(resolve => setTimeout(resolve, 1000));
                    okButton.click();
                }
            }
            else {
                console.log('[Auto-Fill] Unknown answer, taking no action:', answerText);
            }

        } catch (error) {
            console.error('[Auto-Fill] Error processing questionnaire:', error);
        } finally {
            setTimeout(() => { isProcessing = false; }, 500);
        }
    }

    // ==========================================
    // SHARED "ADD NEW REVIEW → APPROVED → OK"
    // Used by: POR, Biometrics, Government Issued Photo ID
    // ==========================================
    async function processAddReviewApproved(caseName) {
        try {
            // 1. Click "Add New Review"
            const addReviewBtn = document.getElementById('doc-add-review-btn');
            if (!addReviewBtn) {
                console.warn(`[Auto-Fill] "Add New Review" button not found for: ${caseName}`);
                return;
            }

            addReviewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 2. Find the dropdown
            const statusSelect = await waitForElement('#review-status-select');
            if (!statusSelect) {
                console.warn(`[Auto-Fill] Could not find review status dropdown for: ${caseName}`);
                return;
            }

            // 3. Set to Approved
            statusSelect.value = "number:3";
            triggerChangeEvent(statusSelect);

            // 4. VERIFY the dropdown actually shows Approved (Framework state check)
            await new Promise(resolve => setTimeout(resolve, 300));
            if (statusSelect.value !== "number:3") {
                console.warn(`[Auto-Fill] Verification failed, retrying dropdown set for: ${caseName}`);
                statusSelect.value = "number:3";
                triggerChangeEvent(statusSelect);
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            if (statusSelect.value !== "number:3") {
                console.error(`[Auto-Fill] Could not set dropdown to Approved for: ${caseName}`);
                return;
            }

            console.log(`[Auto-Fill] Dropdown verified as Approved for: ${caseName}`);

            // 5. Wait for OK button to become enabled, then click
            await new Promise(resolve => setTimeout(resolve, DELAY));

            let okButton = null;
            let retries = 0;

            while (retries < 20) {
                okButton = document.getElementById('review-submit-btn');
                if (okButton && !okButton.hasAttribute('disabled') && !okButton.disabled) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 250));
                retries++;
            }

            if (okButton && !okButton.hasAttribute('disabled') && !okButton.disabled) {
                okButton.click();
                console.log(`[Auto-Fill] Successfully clicked OK for: ${caseName}`);
            } else {
                console.warn(`[Auto-Fill] OK button did not become enabled for: ${caseName}`);
            }

        } catch (error) {
            console.error(`[Auto-Fill] Error processing ${caseName}:`, error);
        } finally {
            setTimeout(() => { isProcessing = false; }, 500);
        }
    }

    // ==========================================
    // MAIN KEYBOARD LISTENER
    // ==========================================
    document.addEventListener('keydown', function(e) {
        if (isProcessing) return;

        if (e.ctrlKey && e.key.toLowerCase() === 'q') {
            e.preventDefault();
            e.stopPropagation();
            isProcessing = true;
            console.log('[Auto-Fill] Ctrl+Q detected.');

            const selectedReq = document.querySelector('.selected-requirement');
            const highlightRequirement = () => {
                 selectedReq.style.transition = 'background-color 0.3s';
                 selectedReq.style.backgroundColor = '#d4edda';
                setTimeout(() => { selectedReq.style.backgroundColor = ''; }, 600);
            };
            
            const mismatchKeywords = ["Reason for ID number mismatch", "Reason for name mismatch"];
            
            // Sanitized generic compliance requirements
            const standardRequirements = [
                "Address Verification (POR)",
                "Biometric Verification (Selfie)",
                "Government Issued Photo ID",
                "Financial Account Verification",
                "Account Owner's Gov. Photo ID",
                "Proof of Name Change",
                "Corporate Address Verification",
                "Company Structure Documentation"
            ];

            if (selectedReq) {
                const reqText = selectedReq.textContent.trim();

                // 1. Check for Mismatch
                if (mismatchKeywords.some(keyword => reqText.includes(keyword))) {
                    console.log('[Auto-Fill] Mismatch questionnaire selected.');
                    highlightRequirement();
                    processMismatchQuestionnaire();
                }
                // 2. Otherwise, check against standard requirements
                else {
                    const matchedReq = standardRequirements.find(req => reqText.includes(req));

                    if (matchedReq) {
                        console.log(`[Auto-Fill] ${matchedReq} selected.`);
                        highlightRequirement();
                        processAddReviewApproved(matchedReq);
                    }
                }
            } else {
                console.log('[Auto-Fill] No requirement selected.');
                isProcessing = false;
            }
        }
    }, true);

})();