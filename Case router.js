// ==UserScript==
// @name         Automated Case Router & Auto-Navigator
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Continuously monitors the CRM queue for new cases and automatically routes to the profile view while preventing duplicate clicks.
// @author       Sanitized Portfolio Version
// @match        https://internal-crm.company.local/*
// @grant        none
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal CRM automation tool.
 * Demonstrates state-tracking on dynamically injected DOM nodes using 
 * custom data attributes to prevent infinite routing loops in single-page applications.
 */

(function() {
    'use strict';

    // Polling interval to check for newly injected queue items
    setInterval(() => {
        // Find every hyperlink currently visible in the DOM
        const links = Array.from(document.querySelectorAll('a'));

        // Look for our specific routing link AND check that we haven't clicked it yet
        const targetLink = links.find(link =>
            link.textContent.trim().toLowerCase() === 'open profile' &&
            !link.dataset.automationClicked
        );

        // If we found a fresh, unclicked link...
        if (targetLink) {
            // Scroll to the center of the viewport for visual feedback
            targetLink.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Trigger the navigation
            targetLink.click();

            // Tag this specific link as "clicked" using a custom data attribute.
            // This ensures the script ignores it on the next interval tick, 
            // preventing an infinite click loop while waiting for the SPA to route.
            targetLink.dataset.automationClicked = "true";
        }

    }, 1000);
})();