# CGPA Calculator Web App

A simple and useful CGPA Calculator for students. It helps calculate CGPA semester by semester, plan a target CGPA, save progress in the browser, and download a personalized report.

Made by **Aditya B**.

## Features

- Calculate CGPA using SGPA and credits
- Supports 2-year, 3-year, 4-year, and custom course lengths
- Add student name and custom report name
- Predict required SGPA to reach a target CGPA
- View a semester-wise target plan
- See SGPA and CGPA progress on a chart
- Save data automatically in the browser
- Download a personalized CGPA report
- Responsive layout for desktop and mobile

## How It Works

The app calculates CGPA using a credit-weighted formula:

```text
CGPA = Total(SGPA x Credits) / Total Credits
```

For target prediction, it compares your current earned grade points with the grade points needed for your target CGPA. Then it calculates the average SGPA required in the remaining credits.

## How To Use

1. Open `index.html` in a browser.
2. Enter the student name and report name.
3. Select course type or enter a custom number of semesters.
4. Add SGPA and credits for completed semesters.
5. Enter a target CGPA to see the required SGPA plan.
6. Use **Download Report** to save a personalized report.

## Tech Stack

- HTML
- CSS
- JavaScript
- Browser `localStorage`
- Canvas chart

## Project Structure

```text
CGPA CALCULATOR/
|-- index.html
|-- styles.css
|-- script.js
`-- README.md
```

## Future Improvements

- Subject-wise SGPA calculator
- Dark mode
- PDF export
- Grade remarks based on CGPA
- Import/export saved data

## Author

**Aditya B**
