// ==UserScript==
// @name         Auto-Open Compliance Reviews (SPA Navigation Aware)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Automatically opens specific compliance review items on profile overview pages. Uses SessionStorage to prevent duplicate clicks during SPA navigation.
// @author       Sanitized Portfolio Version
// @match        *://internal-crm.company.local/*
// @grant        none
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal CRM automation tool.
 * Highlights techniques for automating Single Page Applications (SPAs), 
 * including MutationObservers for dynamic rendering and SessionStorage 
 * state management to prevent infinite loops during hash-based routing.
 */

(function() {
    'use strict';

    // Helper to extract the exact user ID from the URL hash
    function getUserId() {
        const match = window.location.hash.match(/#\/profile\/(\d+)\/overview/);
        return match ? match[1] : null; 
    }

    function checkForReviewItem(observer) {
        const userId = getUserId();
        
        // Sanitized generic compliance review contexts
        const autoopenContexts = [
            'Standard Compliance Review',
            'Enhanced Due Diligence (EDD)',
            'Regional License Verification',
            'Account Verification (Third-Party)',
            'Unified Payment Service CDD',
            'Payment Service Opt-In Verification'
        ];

        if (!userId) return;

        // Define a unique session key for this specific user ID to prevent duplicate clicks
        const storageKey = `auto_review_opened_${userId}`;

        // If this exact user ID is already logged in our session storage, halt execution
        if (sessionStorage.getItem(storageKey)) return;

        // Find all the item headers
        const headers = document.querySelectorAll('h3.section-header');

        for (const header of headers) {
            const text = header.textContent.trim();

            if (autoopenContexts.some(ctx => text.includes(ctx))) {
                // Navigate up to the details wrapper to find the specific link
                const detailsDiv = header.closest('.details');
                if (detailsDiv) {
                    const reviewLink = detailsDiv.querySelector('a[ng-click*="openReview"]');

                    if (reviewLink) {
                        reviewLink.click();

                        // [FIX] Click the Payment Methods menu item instead of forcing the URL for specific reviews
                        if (text.includes('Payment Service Opt-In')) {
                            setTimeout(() => {
                                const pmMenu = document.getElementById('menuPaymentMethods');
                                if (pmMenu) {
                                    // Trigger a realistic click event so Angular's ng-click catches it
                                    const event = new MouseEvent('click', {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true
                                    });
                                    pmMenu.dispatchEvent(event);
                                } else {
                                    console.log('[Auto Open Review] Payment Methods menu not found.');
                                }
                            }, 1000); // Wait 1 second to ensure the review opens first
                        }

                        // Record the action in the browser's session storage
                        sessionStorage.setItem(storageKey, 'true');

                        // Disconnect the observer to save computing resources
                        if (observer) {
                            observer.disconnect();
                        }
                        break;
                    }
                }
            }
        }
    }

    // Set up a MutationObserver to watch for dynamic Angular rendering
    const observer = new MutationObserver((mutations, obs) => {
        checkForReviewItem(obs);
    });

    // Start watching the document body for newly injected nodes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Handle single-page application navigation (re-trigger when the URL hash changes)
    window.addEventListener('hashchange', () => {
        if (getUserId()) {
            // Re-attach observer for the new page.
            // The storageKey logic will handle whether or not it should click.
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });

})();