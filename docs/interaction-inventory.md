# Reference interaction inventory

## Common interactions

| Control | Reference behavior |
| --- | --- |
| Logo | Opens `/`. |
| Menu | Reveals the main navigation with all four services, About Us, Laboratory, Technology, Contact, Patient form, FAQ, and social links. |
| Services | Displays the four service categories with preview imagery and service links. |
| Book A Call | Opens a slide-up form panel with location selection, Name, Phone number, Message, Submit form, and Close. The same panel is reachable from route-specific booking CTAs. |
| Phone chooser | Uses the same three location-specific `tel:` links displayed in the footer and contact page. |
| Footer | Links to the four service pages, Home, About us, Technology, Contact, three maps, three phone destinations, social profiles, and two legal PDFs. |

The four category links in the reference's expanded main menu use relative hrefs. Its normal click handler supplies the `/service/` prefix. Opening a bare category path directly returns 404.

## Page interactions

| Route or family | Reference controls |
| --- | --- |
| Home | Four service selector states with treatment links and an active category CTA, six technology slides with counters and separate Learn More actions, team carousel and About link, four selectable testimonials, booking form, location links. |
| About | Partner and specialist detail controls, staff portraits and location labels, year-based history timeline with Skip, social links, booking form. |
| Service categories | Learn More controls on each treatment card lead to the named detail routes. The appointment form and patient transformation gallery follow the treatments. |
| Treatment details | Care overview, details and steps, expandable treatment FAQs, appointment CTA and form, and related media vary by treatment. |
| Technology | Six device cards open the matching detail pages. The ceramics feature leads to `/laboratory`. |
| Technology details | Device-specific details and supporting media, booking CTA and form. |
| Laboratory | Media and process sections, accordion-style FAQs, and link to the full `/faq` page. |
| FAQ | Accordion-style questions and answers, plus access to booking and contact. |
| Contact | Each location card offers a phone link and a map link. The booking section lets the user choose any of the three locations and enter contact information. |

## Form behavior

- The same basic form appears in page content and in the Book A Call panel.
- The Book A Call panel initializes the first listed clinic as the selected location. The site uses radio choices for Aventura, Bay Harbor, and Coral Gables.
- The reference validates a minimum of two characters for Name and a minimum of nine digits for Phone number. The phone input removes non-digit characters and caps the value at ten digits. Message is optional.
- The message area allows up to 500 characters. Native form submission events trigger the Vue action. The booking overlay and full footer use a submit button labelled `Submit form`, while the other page forms use `Button submit form`.
- The reference uses validation messages beside invalid fields. Pending submission suppresses another submit.
- The client sends a POST to `/api/form/footer`. Its payload includes the selected clinic, name, phone, and message. The deployed reference's successful response transitions the booking panel to a received confirmation. No real submission was made during the audit.

The exact route and external destination inventory is available in [the reference audit](reference-audit.md).
