# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: lenders**, including banks, credit unions and public loan programs, underwriting Arenthe Holdings as a sponsor. They want to see who the borrower is, what has been done before, what is being built now, and whether documentation will be organized. (Confirmed 2026-11-20.)

Secondary audiences the site already addresses: prospective tenants and brokers for projects in development, and certification, grant and community partners.

## Product Purpose

arenthe.com presents Arenthe Holdings, a Midwest real estate development company, to the people who decide whether to finance it. It covers what the company does, how it works, the sponsor's track record, current projects, and a dedicated Lender Information page.

Success is a lender finishing the site prepared for a serious first conversation, with the sponsor's history and the project understood.

## Positioning

An owner-operator turned developer: a sponsor who acquired and held a residential portfolio first, worked on the lender's side of credit, and now develops ground-up projects with underwriting-ready documentation.

## Operating Context

- Pages: home, about (founder profile), projects, lenders, contact, privacy, thanks.
- Current featured project: Marque Center on North Dixie Drive, Harrison Township, Dayton, Ohio, shown with a conceptual rendering and available for pre-leasing.
- The Lender Information page sets out sponsor experience, the four groups of underwriting materials, and the kinds of financing conversations that fit.
- The contact form is a Netlify Form that posts to `thanks.html`.

## Capabilities and Constraints

- Static HTML, CSS and JavaScript with no build step. Netlify build command and publish directory stay empty.
- Animation runs on vendored GSAP and ScrollTrigger. File names are case-sensitive in production.
- The contact form must keep working as a Netlify Form through any change.
- Fonts are self-hosted (Fraunces and Inter).
- **Content rules**: figures are counts, years, square feet and similar physical facts. Renderings are labeled conceptual. MBE certification is described as pending or in process until granted.
- **Undecided**: confirm that brand names used on the Projects page are cleared for publication. Confirm the project's public spelling ("Marque Center").

## Brand Commitments

- Name: Arenthe Holdings, pronounced uh-REN-thee, from the Greek *arete*. Lines in use: "Guardian of Virtue" and "Excellence in action."
- The company began as Mills & Co. Real Estate in 2017 and was renamed in 2026.
- An illustrated founder figure appears on the home and about pages as animated frame sequences; it trades a basketball for a house.
- The founder profile is written in a plain, factual, third-person voice.

## Evidence on Hand

- Track record as published: company established 2017; first rental bought the following May; more than seventy-five units acquired inside two years, concentrated in Ohio with holdings in Texas.
- Founder history as published on `about.html`, including the basketball years and time as a relationship banker.
- Marque Center facts as published: 16,000 square feet, 10 retail suites, a 1,545 square foot drive-through building, 8 EV charging stalls, and a conceptual rendering.
- Character frame sequences in `assets/char-v5`.
- **Absent, do not fabricate**: financial statements or figures, lender or partner logos, testimonials, completed-development case studies, a granted MBE certification.

## Product Principles

1. **Write for the underwriter.** Every page should answer a question a credit reviewer would actually ask.
2. **Facts over adjectives.** Dates, counts and documents carry the case.
3. **Label what is not final.** Renderings, pending certifications and projects in development are marked as such.
4. **Prepared, not promotional.** The tone is of a borrower who has done this before and has the file ready.
