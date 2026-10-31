// ==UserScript==
// @name         SPA ID Extractor & Cross-Portal Redirector
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Monitors SPA navigation, precisely extracts entity IDs ignoring query parameters, and forces a new window in a secondary internal portal.
// @author       Sanitized Portfolio Version
// @match        https://internal-backoffice.company.local/*
// @grant        window.close
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal productivity tool.
 * Demonstrates monitoring Single Page Application (SPA) routing via MutationObservers 
 * and using Regex to precisely extract entity IDs from complex URL structures 
 * to seamlessly bridge two separate internal web portals.
 */

(function() {
    'use strict';

    // --- CONFIGURATION ---
    const newBaseUrl = "https://internal-portal.company.local/#/profile/";
    // ---------------------

    // Track the ID instead of the full URL to prevent infinite redirect loops
    let lastProcessedId = "";

    function scanAndExecute() {
        const currentUrl = window.location.href;

        // Genericized internal backoffice route
        if (currentUrl.includes("/compliance/review/")) {

            // Regex Protocol:
            // ([^/?#]+) means "capture everything until you hit a slash, a question mark, or a hash"
            // This safely ignores tracking parameters and hash fragments.
            const match = currentUrl.match(/review\/([^/?#]+)/);

            if (match && match[1]) {
                const extractedId = match[1];

                // Only execute if this specific ID hasn't been processed yet
                if (extractedId !== lastProcessedId) {
                    lastProcessedId = extractedId;
                    const finalUrl = newBaseUrl + extractedId + "/overview";

                    // Open the secondary portal in a new window with specific dimensions
                    window.open(finalUrl, '_blank', 'width=1200,height=800,noopener,noreferrer');

                    // Close the current backoffice tab to keep the workspace clean
                    setTimeout(() => {
                        window.close();
                    }, 300);
                }
            }
        }
    }

    // Run immediately on page load
    scanAndExecute();

    // Observe DOM changes to catch SPA route changes that don't trigger full page reloads
    const observer = new MutationObserver(() => {
        scanAndExecute();
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();