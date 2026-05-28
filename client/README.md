# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)















 Stage-by-stage mapping : lead chnages

  Stage: 1. Lead comes in
  Where it lives now: UTM auto-capture in AddLeadModal → stored on Lead 
  ────────────────────────────────────────
  Stage: 2. Lead captured
  Where it lives now: Lead.nextLeadCode() issues LD-XXXXXX;
  enquiry_types
    already drives the sub-form
  ────────────────────────────────────────
  Stage: 3. Auto-assign
  Where it lives now: pickAgent() round-robin + visa skill-match; POST  
    /api/leads/:id/auto-assign
  ────────────────────────────────────────
  Stage: 4. Qualify
  Where it lives now: POST /api/leads/:id/qualify sets status, scores   
    0–100, auto-creates SLA follow-up when Qualified
  ────────────────────────────────────────
  Stage: 5. Kanban
  Where it lives now: pipeline_stage enum + POST /api/leads/:id/pipeline
  ────────────────────────────────────────
  Stage: 6. Itinerary
  Where it lives now: existing Voyage ItineraryVersion model retained   
  (no
    change needed)
  ────────────────────────────────────────
  Stage: 7. Quote
  Where it lives now: POST /api/quotes — auto-routes to Pending Approval

    if discount > threshold; manager approve/reject/send; margin hidden 
    from juniors
  ────────────────────────────────────────
  Stage: 8. Customer review
  Where it lives now: POST /api/leads/:id/share-link issues 14-day      
  token;
    public GET/POST /api/public/share/:token[/respond] (approve /       
    request_changes loops back & bumps revision_cycles)
  ────────────────────────────────────────
  Stage: 9. Booking + Invoice
  Where it lives now: POST /api/invoices — issues GST-correct invoice   
    from quote, records deposit + balance, locks lead to Won/Booked     
  ────────────────────────────────────────
  Stage: 10. Travel documents
  Where it lives now: POST /api/invoices/:id/supplier-confirmation logs 
    per-segment refs (existing Document Vault retains files)
  ────────────────────────────────────────
  Stage: 11. Trip in progress
  Where it lives now: Activity log on lead is already there; no schema  
    change needed
  ────────────────────────────────────────
  Stage: 12. Trip closed
  Where it lives now: POST /api/leads/:id/close-trip — captures
    rating/comment, credits loyalty (1pt/₹100 paid), audit-logs the     
  close

  Notes & env

  - Discount threshold is DISCOUNT_THRESHOLD_PCT (default 10).
  - GST split uses HOME_STATE (default Gujarat).
  - Public share URL base reads from APP_URL (defaults to
  http://localhost:5005).
  - A separate Node server instance is already running on port 5000 —   
  restart it to pick up the new routes. Boot was verified on port 5099  
  against the live Atlas cluster.
