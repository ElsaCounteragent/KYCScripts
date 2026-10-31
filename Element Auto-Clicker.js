// ==UserScript==
// @name         Dynamic SPA Element Auto-Clicker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Watches for dynamic UI elements injected by SPA frameworks and triggers actions based on framework-specific visibility classes.
// @author       Sanitized Portfolio Version
// @match        https://internal-portal.company.local/*
// @grant        none
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal productivity tool.
 * Demonstrates the use of MutationObservers to wait for asynchronously 
 * rendered elements in Single Page Applications (SPAs) and reading 
 * framework-specific CSS classes (like AngularJS's ng-hide) to determine 
 * actual element visibility before triggering actions.
 */

(function() {
    'use strict';

    let hasClicked = false;

    // A MutationObserver watches for elements being added to the page dynamically
    const observer = new MutationObserver(() => {
        // Ensure we are on the correct hash route
        if (!window.location.hash.startsWith('#/compliance/profile/')) {
            return;
        }

        // Stop checking if we already successfully clicked
        if (hasClicked) return;

        // Target the specific parent span using a partial match on its framework directive attribute
        const targetBtn = document.querySelector('span[ng-if*="workflowLinks.length == 1"]');

        if (targetBtn) {
            // Find the action span inside to check its visibility
            const actionSpan = targetBtn.querySelector('span[ng-show*="!ctrl.workflowObj.openAction"]');

            // Frameworks often add a specific 'hide' class when an ng-show condition is false.
            // If actionSpan exists and doesn't have the hide class, it is currently displaying the action.
            if (actionSpan && !actionSpan.classList.contains('ng-hide')) {
                targetBtn.click();
                hasClicked = true;

                // Disconnect the observer to save memory since our job here is done
                observer.disconnect();
            }
        }
    });

    // Start watching the document body for injected elements
    observer.observe(document.body, { childList: true, subtree: true });
})();