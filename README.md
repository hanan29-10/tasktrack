# TaskTrack

TaskTrack is a full-stack To-Do List website created for an Internet Programming university project.

## Features
- User registration and login
- Add, edit, and delete tasks
- Mark tasks as completed
- Filter tasks by status
- About Project and Contact pages

## Technologies
- HTML
- CSS
- JavaScript
- Node.js
- Express
- SQLite

## How to Run
1. Install Node.js
2. Open the project folder in terminal
3. Run:
   npm install
4. Then run:
   npm start
5. Open:
   http://localhost:3000

## Main Tables
### users
- id
- name
- email
- password

### tasks
- id
- user_id
- title
- description
- due_date
- status
