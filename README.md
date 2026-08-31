# Steel Selector Pro

Build a modern web app called “Stainless Steel Grade Selector” for recommending the best stainless steel grade based on user requirements.

DESIGN / THEME

Use a red + white theme with a modern + classic industrial/engineering look.

The UI should feel:

Professional and trustworthy

Clean and premium

Engineering-focused

Modern but not overly futuristic

Use white backgrounds, deep red accents, dark charcoal text, light gray borders, subtle shadows and moderate rounded corners.

Make it fully responsive for desktop and mobile.

INPUT PAGE

Header:

Stainless Steel Grade Selector

Subtitle:
Find the right stainless steel grade for your application.

Create a clean multi-section form.

APPLICATION — REQUIRED

Dropdown:

Construction

Machine Parts

Shipbuilding

Other

Show “Required” beside the field.

This is the only mandatory input.

PERFORMANCE REQUIREMENTS — OPTIONAL

Strength:

Label: Minimum UTS

Numeric input

Unit: MPa

Example placeholder: 550

Corrosion Resistance:

Dropdown:

Low

Medium

High

Very High

Impact Toughness:

Numeric input

Unit: J

Operating Temperature:

Minimum Temperature

Maximum Temperature

Unit: °C

Allow negative values.

All these fields are optional.

ADDITIONAL PARAMETERS — OPTIONAL

Ask:

Which additional factors should we consider?

Provide selectable checkboxes/cards:

☐ Weldability
☐ Formability
☐ Cost

Add short descriptions:

Weldability — Ease and reliability of welding

Formability — Suitability for forming and fabrication

Cost — Material cost/value

The user can select any combination, including none.

MAIN BUTTON

Large red CTA:

Find Recommended Grades →

When clicked:

Validate that Application is selected.

If not, show: “Please select an application to continue.”

If valid, show a short loading animation:
Analyzing your requirements...

Then show dummy recommendation results.

Do NOT implement the actual recommendation algorithm yet.

RESULTS PAGE

Title:

Recommended Stainless Steel Grades

Subtitle:
“Based on your selected requirements, these grades offer the best overall fit.”

Show a compact summary of the user's inputs.

Only display fields that the user actually entered.

Add:
Edit Requirements

This should return to the form while preserving the entered values.

RECOMMENDATION CARDS

Show 3 dummy grades, for example:

SS 304

SS 316L

SS 410

These are placeholder recommendations only.

Each card should show:

Grade name

Overall Score: 92 / 100

Individual scores:

Strength

Corrosion Resistance

Impact Toughness

Temperature Suitability

If the user selected Weldability, Formability or Cost, show those scores too.

For example, if the user selected only Weldability and Cost, show:

Weldability

Cost

Do not show unselected additional parameters as if they were considered.

Use attractive score bars/circular indicators.

Highlight the highest-ranked grade with:

BEST MATCH

WHY THIS GRADE?

Every recommendation should include a short explanation.

Example:

“Strong overall fit for construction applications with excellent corrosion resistance and good formability.”

Also show:

Key Trade-offs

✓ Excellent corrosion resistance
✓ Good formability
⚠ Higher cost than SS 410

The trade-offs should explain why a grade may be better in one area but weaker in another.

COMPARISON TABLE

Add a comparison section below the cards.

Columns:
Parameter | SS 304 | SS 316L | SS 410

Rows:

Overall Score

Strength

Corrosion Resistance

Impact Toughness

Temperature Suitability

Weldability

Formability

Cost

If an additional parameter was not selected, display Not considered or visually de-emphasize it.

GRADE DETAILS

Each recommendation should have a View Grade Details button.

Open a modal/drawer containing:

Grade

Stainless steel family

Typical applications

Key properties

Why recommended

Main trade-offs

Use dummy information for now.

MOCK DATA / BACKEND READY

Keep recommendation data separate from UI components.

Create a mock recommendation structure containing:

grade

family

overallScore

individual scores

whyRecommended

tradeoffs

applications

properties

Create a function such as:

getRecommendations(userRequirements)

For now, it returns mock data.

Later this function will be replaced by a backend API, so do not tightly couple the UI to the dummy data.

User input should have a structure similar to:

application
minimumUTS
corrosionResistance
impactToughness
operatingTemperatureMin
operatingTemperatureMax
considerWeldability
considerFormability
considerCost

Blank optional fields should remain null/empty.

UX

Add a note near the button:

Only Application is required. Add more requirements to improve recommendation accuracy.

Keep the interface simple and intuitive. The user should immediately understand:

What information they need to provide

Which fields are optional

Which grade is the best match

Why it was recommended

What trade-offs exist

FOOTER

Minimal footer:

Stainless Steel Grade Selector

“Engineering material selection made simpler.”

Add placeholder links:
About | Methodology | Contact

IMPORTANT

This is currently a frontend prototype.

Do not build the backend or actual steel-grade recommendation algorithm yet.

Focus on creating a polished, professional frontend with clean component architecture so the backend recommendation engine can be connected later.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9c6a0299-615d-418c-ac9b-fd294cde6a75).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
