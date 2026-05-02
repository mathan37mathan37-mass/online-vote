 # Online Voting System

A complete responsive voting website using HTML, CSS, JavaScript, Firebase Firestore, Firebase Storage, and Firebase Authentication.

## Files

- `index.html` — student login and admin login page
- `vote.html` — voting page for authenticated students
- `dashboard.html` — live result dashboard with charts
- `admin.html` — admin panel to manage candidates and election settings
- `style.css` — shared UI styling and responsive layout
- `app.js` — application logic for authentication, voting, admin actions, and real-time UI updates
- `firebase.js` — Firebase initialization file

## Setup Instructions

1. Create a Firebase project at https://console.firebase.google.com.
2. Enable Firestore in test or production mode.
3. Enable Firebase Storage.
4. Enable Authentication -> Email/Password.
5. Copy your Firebase config values into `firebase.js`.

## Firestore Structure

### Collection: `users`
Document example:
```json
{
  "rollNumber": "2101CS001",
  "aadhar": "123456789012",
  "dob": "2002-04-01",
  "hasVoted": false,
  "votedCandidate": ""
}
```

### Collection: `candidates`
Document example:
```json
{
  "name": "Jane Doe",
  "party": "Progressive Party",
  "imageURL": "https://...",
  "votes": 0
}
```

### Collection: `settings`
Document ID: `config`
```json
{
  "votingEnabled": true,
  "resultVisible": false,
  "countdownEnd": null
}
```

## Admin Setup

1. In Firebase Authentication, add an admin user with email and password.
2. Use the admin email/password on the login page under the Admin Login tab.

## Usage

- Open `index.html` in the browser.
- Student users log in with Roll Number, Aadhaar, and DOB.
- Admin logs in using email/password.
- Students can vote once and see confirmation.
- Admin can add/update/delete candidates, reset votes, toggle voting, and show/hide results.
- Results update in real time for authenticated voters when enabled.

## Notes

- For full security and production deployment, add Firebase security rules to protect Firestore and Storage access.
- Use a local web server or deploy to Firebase Hosting for best results.
