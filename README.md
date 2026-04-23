# L'Oréal Routine Builder

## What This Project Does

This project is a web app that helps users build a personalized beauty routine using products from L'Oréal's family of brands.

Users can:

- Browse products from a local product catalog
- Filter by category and search by keywords
- Select products and generate a routine with AI
- Ask follow-up questions in the same chat to refine recommendations

The app keeps selected products between page refreshes and sends chat requests through a Cloudflare Worker so API keys are not exposed in the browser.

## Technologies Used

- HTML5 for page structure
- CSS3 for styling and responsive layout
- Vanilla JavaScript (ES6+) for app logic and DOM updates
- JSON (`products.json`) as the product data source
- Browser `localStorage` to persist selected products
- Cloudflare Workers as a secure backend proxy
- OpenAI Chat Completions API (`messages` format) for routine generation and conversational follow-ups

## Challenges Solved

- Protected API credentials by moving OpenAI requests to a Cloudflare Worker instead of calling the API directly from client-side code
- Kept multi-turn chat context by storing conversation history in a `messages` array so follow-up questions stay relevant
- Generated routines from selected products only, preventing generic recommendations
- Improved search quality with accent-insensitive matching (for terms like "L'Oréal" vs "Loreal")
- Preserved user progress by saving and restoring selected product IDs with `localStorage`
- Added fault handling for network/API failures and product-loading issues, with clear fallback messages in the UI
