# KYC & Compliance Workflow Userscripts

This repository contains a collection of sanitized Tampermonkey userscripts built to assist with repetitive tasks in KYC, AML, and compliance review queues. These tools handle structured note preparation, basic form filling, and UI highlighting to help human reviewers move through complex, iframe-heavy CRM interfaces more efficiently.

## Disclaimer & Security Posture

* **Human-in-the-loop:** These scripts do not make compliance decisions, approve accounts, or bypass security controls. They are strictly assistive tools designed to reduce manual clicking and copy-pasting.
* **Sanitized code:** All proprietary employer URLs, internal DOM selectors, client data, and confidential workflow logic have been removed or replaced with generic placeholders.
* **Local execution:** The scripts run entirely in the browser. They do not store information externally, exfiltrate data, or communicate with unauthorized third-party servers.

## Installation

These scripts are intended for use with a userscript manager like Tampermonkey or Violentmonkey.
1. Install the Tampermonkey browser extension.
2. Open the extension dashboard and create a new script.
3. Copy the contents of the desired `.js` or `.user.js` file from this repository into the editor.
4. Save the script and ensure it is enabled when visiting your target (local/sandbox) CRM environment.

## Repository Structure

### Form & Workflow Automation
* **AngularJS Scope Bridge.js:** Updates dropdown values in older web applications by triggering the necessary background framework events so the form registers the change.
* **Automated CRM Workflow (Macro 01).js:** Fills out standard review templates and clicks through repetitive save dialogs in the CRM.
* **Automated Translation.js:** Selects the correct language options and inserts standard confirmation text for translation reviews.
* **Compliance Tag Automation.js:** Waits for background page loading to finish before clicking through the steps to add a compliance tag.
* **Compliance level updater.js:** Changes a customer's compliance tier and automatically closes the tab once the save is confirmed.
* **Context multi tool.js:** Reads the selected requirement type and routes the workflow to the correct approval or rejection steps.
* **Cross-Frame Macro.js:** Coordinates button clicks and text pasting across different embedded frames within the CRM.
* **Element Auto-Clicker.js:** Watches for specific buttons to appear on the screen and clicks them once they become active.
* **Queue Transfer.js:** Sets the case status to transferred and opens the correct queue dropdown for manual selection.
* **Sanctions Autofill.js:** Reads text from the clipboard, extracts key details, and fills out the sanctions review description box.

### Navigation & Routing
* **Auto-Open Compliance Reviews.js:** Uses session storage to remember which cases have been opened, preventing duplicate clicks during page navigation.
* **Case router.js:** Monitors the queue for new cases and automatically clicks the link to open the customer profile.
* **ID extract and redirect.js:** Pulls the customer ID from the current URL and opens their profile in a new, correctly formatted tab.

### Text Processing & Data Extraction
* **Automated Account Restriction.js:** Fills out the multi-step restriction form when a suspicious document is identified.
* **Compliance Note.js:** Provides a simple pop-up interface to parse raw notes and format them into a standard compliance template.
* **Context-Aware Sanctions Extraction & Template Generator.js:** Searches pasted text for specific regions and document types to build a standardized review note.
* **Important text highlighter.js:** Scans the page for specific risk keywords and highlights them in bright colors so they are not missed during review.
* **Transliterator.user.js:** Converts international characters with special accents into standard ASCII letters for legacy system compatibility.

## Tech Stack

* JavaScript (ES6+)
* Tampermonkey / Violentmonkey
* DOM APIs: MutationObserver, TreeWalker, SessionStorage, Async Clipboard API

## About Me

I am a Compliance Operations Analyst currently based in Bucharest, Romania, focusing on KYC, AML, and Fraud workflows. As an Austrian citizen, I am actively seeking opportunities to relocate to Austria and join a local compliance or technical operations team. 

I bridge the gap between daily operational requirements and technical automation by writing practical scripts that reduce manual friction in review queues, and I am always looking to improve how compliance teams interact with their tools.

LinkedIn: https://www.linkedin.com/in/maxim-kolosov-92b526406/
