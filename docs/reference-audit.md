# Aventura Dental Arts reference audit

Reference checked on November 16, 2026. The public frontend runs on Nuxt and includes server-rendered HTML, responsive desktop and mobile markup, and an animated client layer. Route discovery combined browser navigation and snapshots, rendered links, the public route table, page data, and direct HTTP checks. A Chromium browser opened and scrolled through the ten main pages and a sample from each detail template at 1440 × 900. The matrix in the visual QA report tracks the broader screenshot run.

## Public HTML inventory

All 33 URLs in this inventory returned HTTP 200. The site navigation, footer, service cards, and technology controls account for the public routes. The reference has no public sitemap at `/sitemap.xml` or `/sitemap_index.xml`. `robots.txt` allows all paths. The two indexed legacy WordPress PDFs tested now return HTTP 404.

| Route | Page sequence |
| --- | --- |
| `/` | Location and contact navigation, typographic and photographic hero, Our Goal introduction, Our Solutions selector, photographic interlude, Technology-Driven Dentistry showcase, Team of Experts, Testimonials, smile imagery, consultation form, location and legal footer |
| `/about` | About hero and introduction, founders and partners, specialist profiles, staff selector, history timeline, mission, social imagery, consultation form, footer |
| `/service/esthetic-dentistry` | Service hero, introduction and key indicators, four ADA Solutions, appointment form, patient transformation gallery, footer |
| `/service/restorative-dentistry` | Service hero, introduction and key indicators, four ADA Solutions, appointment form, patient transformation gallery, footer |
| `/service/preventive-care` | Service hero, introduction and key indicators, five ADA Solutions, appointment form, patient transformation gallery, footer |
| `/service/beyond-the-smile` | Service hero, introduction and key indicators, four ADA Solutions, appointment form, patient transformation gallery, footer |
| `/technology` | Technology hero and introduction, six technology cards, ADA x VM Labs feature, consultation CTA, footer |
| `/contact` | Our Locations, three clinic location cards with photos and contact details, Let's Connect booking form, footer |
| `/laboratory` | ADA x VM Labs hero, description and benefits, laboratory technology, collaboration and ceramics story, media/gallery, short FAQ linking to full FAQ, consultation CTA, footer |
| `/faq` | Frequently asked questions and expandable answers about appointments, treatment, payments, and aftercare, followed by a light consultation section and compact footer |

### Treatment detail pages

The category prefix in a detail URL is the category slug. A treatment opens from a solution card on its category page. The Smile Makeovers sample displayed a hero, before/after images, common concerns and benefits, team cards, testimonials, FAQ, other solutions, appointment form, and compact footer. Some subsections depend on the treatment content.

| Category prefix | Detail slugs |
| --- | --- |
| `/esthetic-dentistry/` | `smile-makeovers`, `esthetic-bonding-and-contouring`, `teeth-whitening`, `porcelain-veneers` |
| `/restorative-dentistry/` | `implant-restoration`, `crowns-and-bridges`, `full-mouth-rehabilitation`, `tooth-colored-fillings` |
| `/preventive-care/` | `oral-cancer-screenings`, `comprehensive-exams`, `deep-cleanings`, `fluoride-treatments`, `prophies` |
| `/beyond-the-smile/` | `botox-aesthetic-and-tmj-relief`, `dermal-fillers`, `custom-nightguards`, `oral-appliance-therapy-for-sleep-apnea` |

### Technology detail pages

Technology cards open the corresponding `/technology/<slug>` detail page. The Solea Laser sample displayed a device hero, highlights, explanation and usage, media slider, FAQ, light consultation form, and compact footer. Gallery and feature imagery are drawn from each device's data.

| Technology | Slug |
| --- | --- |
| iTero Digital Impressions | `i-tero-digital-impressions` |
| Solea Laser | `solea-laser` |
| Intra Oral Camera | `intra-oral-camera` |
| Digital Imaging | `digital-imaging` |
| CAD/CAM Restorations | `cad-cam-restorations` |
| 3D CAT Scan | `3d-cat-scan` |

## Browser observations

- The desktop header measured 72 CSS pixels high. Chromium loaded Instrument Serif normal and italic at weight 400, and Inter Tight at weights 400, 500, 600, and 700. The headings and Menu and Services labels use Instrument Serif. The treatment list, location labels, and booking label use Inter Tight. The six original TTF files are declared in inline page CSS.
- The homepage opens into a 2,520px hero scroll region at 1440 × 900. About uses longer pinned sections to stage the specialists and timeline. The browser measured a 900px introductory region for Contact, Laboratory, and the two detail samples.
- Document titles on several live responses reuse another page's metadata. The body headings for Restorative Dentistry, Preventive Care, Beyond the Smile, Smile Makeovers, and Solea Laser identify the correct content.
- The Esthetic, Restorative, and Preventive categories reported a 1,540px document width immediately after navigation at a 1,440px viewport. The other desktop samples reported the same width as their viewport. The early measurement precedes completion of the animated page state.

## Locations

| Location | Address | Phone | Hours |
| --- | --- | --- | --- |
| Aventura | 18851 NE 29th Avenue Suite 301, Aventura, FL 33180 | (305) 682-1414 | Monday–Thursday 8:30 am–5:00 pm, Friday 8:30 am–2:00 pm |
| Bay Harbor | 1031 Kane Concourse, Bay Harbor Islands, FL 33154 | (305) 864-1656 | Monday–Thursday 8:00 am–4:00 pm |
| Coral Gables | 6705 S Red Rd Suite 614, Coral Gables, FL 33143 | (305) 668-1811 | Monday–Friday 8:30 am–5:00 pm |

## Linked documents and services

The footer's Privacy Policy and Terms & Conditions point to the same clinic-hosted HIPAA notice. Accessibility Statement points to a second PDF. The main header links to a patient intake form hosted by MySecurePractice. Maps, social profiles, and the developer credit are hosted separately.

| Destination | Reference |
| --- | --- |
| Privacy Policy and Terms & Conditions | [HIPAA notice PDF](https://api.aventuradentalarts.com/uploads/Hipaa_Notices_of_Privacy_Practices_docx_1_9be446a7d0.pdf) |
| Accessibility Statement | [Accessibility Statement PDF](https://api.aventuradentalarts.com/uploads/ADA_Accessibility_Statement_35e72f9f4a.pdf) |
| Patient form | [MySecurePractice](https://mysecurepractice.com/Truform/d645c1d1-2597-4aea-a274-eb777e61f7a1/Submission/Create) |
| Aventura map | [Google Maps](https://maps.app.goo.gl/oFQPrr2sgsdXtbdv8) |
| Bay Harbor map | [Google Maps](https://maps.app.goo.gl/LpQBJqAyJvEd88Dx9) |
| Coral Gables map | [Google Maps](https://maps.app.goo.gl/pEFbhnNfZaex1aEZ7) |
| Social media | [Instagram](https://www.instagram.com/aventuradentalarts/), [LinkedIn](https://www.linkedin.com/company/aventura-dental-arts-llc/) |
| Design studio | [The First The Last](https://thefirstthelast.agency/?utm_source=aveturadentalarts&utm_medium=article&utm_campaign=promo) |
