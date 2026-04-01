// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const fetchButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');

// NASA APOD endpoint and key (DEMO_KEY is good for learning projects)
const APOD_URL = 'https://api.nasa.gov/planetary/apod';
const API_KEY = 'DEMO_KEY';

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Listen for button click and load APOD data for the chosen dates
fetchButton.addEventListener('click', () => {
	getApodImages(startInput.value, endInput.value);
});

async function getApodImages(startDate, endDate) {
	if (!startDate || !endDate) {
		gallery.innerHTML = '<p class="placeholder">Please choose both a start date and an end date.</p>';
		return;
	}

	if (startDate > endDate) {
		gallery.innerHTML = '<p class="placeholder">Start date must be before or equal to end date.</p>';
		return;
	}

	gallery.innerHTML = '<p class="placeholder">Loading NASA images...</p>';

	try {
		const url = `${APOD_URL}?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const apodData = await response.json();
		renderGallery(apodData);
	} catch (error) {
		gallery.innerHTML = `<p class="placeholder">Could not load APOD data. ${error.message}</p>`;
	}
}

function renderGallery(items) {
	// API can return one object or an array; we always display an array
	const imageList = Array.isArray(items) ? items : [items];

	// Show newest items first
	imageList.sort((a, b) => new Date(b.date) - new Date(a.date));

	const cards = imageList.map((item) => {
		const mediaElement = item.media_type === 'video'
			? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">Watch Video</a>`
			: `<img src="${item.url}" alt="${item.title}" />`;

		return `
			<article class="gallery-item">
				${mediaElement}
				<p><strong>${item.title}</strong> (${item.date})</p>
				<p>${item.explanation}</p>
			</article>
		`;
	});

	gallery.innerHTML = cards.join('');
}
