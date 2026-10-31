// ==UserScript==
// @name         AngularJS Scope Bridge & Auto-Paste
// @namespace    http://tampermonkey.net/
// @version      8.3
// @description  Bridges Tampermonkey with legacy AngularJS SPAs to safely update scope models and auto-paste into description boxes.
// @match        https://internal-portal.company.local/*
// @grant        GM_setClipboard
// @grant        unsafeWindow
// ==/UserScript==

/*
 * DISCLAIMER:
 * This is a sanitized, anonymized version of an internal productivity tool.
 * It demonstrates advanced techniques for interacting with legacy AngularJS (1.x) 
 * applications from external Userscripts, including scope manipulation and digest cycle triggering.
 * All proprietary business logic and company identifiers have been redacted.
 */

(function() {
    'use strict';

    const delay = function(ms) {
        return new Promise(function(res) {
            setTimeout(res, ms);
        });
    };

    /**
     * Bridges Tampermonkey with the internal AngularJS SPA.
     * Safely evaluates scope models and triggers digest cycles 
     * to update dropdowns without causing infinite loops.
     */
    async function masterKey(targetLabel) {
        const targetLower = targetLabel.toLowerCase();

        for (let i = 0; i < 40; i++) {
            const allSelects = document.querySelectorAll('select');
            let foundAndSet = false;

            for (let s = 0; s < allSelects.length; s++) {
                const selectEl = allSelects[s];

                const ngModelAttr = selectEl.getAttribute('ng-model');
                if (!ngModelAttr) continue;

                const options = Array.from(selectEl.options);
                const targetOpt = options.find(function(opt) {
                    return (opt.label && opt.label.trim().toLowerCase() === targetLower) ||
                           (opt.text && opt.text.trim().toLowerCase() === targetLower);
                });

                if (targetOpt) {

                    let rawVal = targetOpt.value;
                    let cleanVal = rawVal;

                    if (rawVal.indexOf('number:') !== -1) {
                        cleanVal = Number(rawVal.split('number:')[1].trim());
                    } else if (rawVal.indexOf('string:') !== -1) {
                        cleanVal = rawVal.split('string:')[1].trim();
                    } else if (!isNaN(rawVal) && rawVal.trim() !== "") {
                        cleanVal = Number(rawVal);
                    }

                    try {
                        // Accessing the page's AngularJS context via unsafeWindow
                        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.angular) {
                            const angular = unsafeWindow.angular;
                            const ngEl = angular.element(selectEl);
                            const scope = ngEl.scope();

                            if (scope) {
                                scope.$eval(ngModelAttr + " = " + JSON.stringify(cleanVal));

                                const ngChangeAttr = selectEl.getAttribute('ng-change');
                                const ngOptionsAttr = selectEl.getAttribute('ng-options');

                                if (ngChangeAttr) {
                                    let locals = {};
                                    if (ngOptionsAttr) {
                                        const inMatch = ngOptionsAttr.match(/\s+in\s+([a-zA-Z0-9\.\_]+)/);
                                        const asMatch = ngOptionsAttr.match(/^\s*([a-zA-Z0-9\.\_]+)\s+as/);
                                        const itemMatch = ngOptionsAttr.match(/^\s*([a-zA-Z0-9\_]+)/);

                                        if (inMatch && asMatch && itemMatch) {
                                            const arrayName = inMatch[1];
                                            const valuePath = asMatch[1];
                                            const itemName = itemMatch[1];
                                            const propName = valuePath.substring(itemName.length + 1);

                                            try {
                                                const arr = scope.$eval(arrayName);
                                                if (Array.isArray(arr)) {
                                                    const matchedObj = arr.find(function(item) {
                                                        return propName ? item[propName] === cleanVal : item === cleanVal;
                                                    });
                                                    if (matchedObj) {
                                                        locals[itemName] = matchedObj;
                                                    }
                                                }
                                            } catch(e) {}
                                        }
                                    }
                                    scope.$eval(ngChangeAttr, locals);
                                }

                                // Trigger digest cycle safely
                                if (!scope.$$phase && !scope.$root.$$phase) {
                                    scope.$apply();
                                }

                                selectEl.value = targetOpt.value;
                                foundAndSet = true;
                            }
                        }
                    } catch (err) {
                        console.error("[Scope Bridge] Error: ", err);
                    }
                }
            }

            if (foundAndSet) {
                return true;
            }

            await delay(100);
        }
        return false;
    }

    async function runAutomation(actionsTaken, uid) {
        let userId = "[USER_ID_NOT_FOUND]";
        // Genericized URL parsing for user profiles
        const urlMatch = window.location.href.match(/profile\/(\d+)/i);
        if (urlMatch && urlMatch[1]) {
            userId = urlMatch[1];
        }

        // Sanitized generic template
        const template = userId + "\n\n" +
            "Review context: < STANDARD ACCOUNT REVIEW >\n\n" +
            "Review Touch: < 2nd >\n\n" +
            "Issues Found: None\n\n" +
            "Actions Taken: " + actionsTaken + " (Ref: " + uid + ").\n" +
            "Data Comparison validated.\n" +
            "Review outcome: Approved.";

        GM_setClipboard(template, 'text');

        // Genericized dropdown sequence
        await masterKey('Internal Dept');
        await delay(300);

        await masterKey('Compliance');
        await delay(300);

        await masterKey('Documents');
        await delay(300);

        await masterKey('Approved');
        await delay(300);

        // Update Subject Box via Angular Scope
        const subjectBox = document.getElementById('subject-field');
        if (subjectBox) {
            try {
                if (typeof unsafeWindow !== 'undefined' && unsafeWindow.angular) {
                    const angular = unsafeWindow.angular;
                    const ngEl = angular.element(subjectBox);
                    const scope = ngEl.scope();
                    const ngModel = ngEl.controller('ngModel');

                    if (ngModel) {
                        ngModel.$setViewValue("Third-Party Vendor Verified");
                        ngModel.$render();
                    }
                    if (scope && !scope.$$phase && !scope.$root.$$phase) {
                        scope.$apply();
                    }
                }
            } catch(e) {}

            subjectBox.value = "Third-Party Vendor Verified";
            subjectBox.dispatchEvent(new Event('input', { bubbles: true }));
            subjectBox.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Smart-Poll the Exact Description Box
        let textFound = false;
        for (let i = 0; i < 40; i++) {
            const mainTextBox = document.getElementById('description-field');

            if (mainTextBox && (mainTextBox.offsetWidth > 0 || mainTextBox.offsetHeight > 0)) {
                try {
                    if (typeof unsafeWindow !== 'undefined' && unsafeWindow.angular) {
                        const angular = unsafeWindow.angular;
                        const ngEl = angular.element(mainTextBox);
                        const scope = ngEl.scope();
                        const ngModel = ngEl.controller('ngModel');

                        if (ngModel) {
                            ngModel.$setViewValue(template);
                            ngModel.$render();
                        }
                        if (scope && !scope.$$phase && !scope.$root.$$phase) {
                            scope.$apply();
                        }
                    }
                } catch(e) {}

                mainTextBox.value = template;
                mainTextBox.dispatchEvent(new Event('input', { bubbles: true }));
                mainTextBox.dispatchEvent(new Event('change', { bubbles: true }));
                textFound = true;
                console.log("[Scope Bridge] Template pasted successfully into Description box.");
                break;
            }
            await delay(100);
        }

        if (!textFound) {
            console.warn("[Scope Bridge] Could not locate the Description text box.");
        }
    }

    document.addEventListener('keydown', async function(e) {

        // --- Original Alt + W Sequence ---
        if (e.altKey && e.key.toLowerCase() === 'w') {
            e.preventDefault();
            e.stopPropagation();

            const inputString = prompt("string:", "");
            if (!inputString) return;

            const parts = inputString.split('>>>');
            const actionsTaken = parts.length > 1 ? parts[1].trim() : "approved documents";

            const uid = prompt("Reference ID:", "");
            if (!uid) return;

            await runAutomation(actionsTaken, uid);
        }

        // --- New Alt + S Sequence ---
        else if (e.altKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            e.stopPropagation();

            const uid = prompt("Reference ID:", "");
            if (!uid) return;

            await runAutomation("approved documents", uid);
        }

    }, true);
})();