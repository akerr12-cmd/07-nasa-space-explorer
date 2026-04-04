// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const fetchButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');
const apodModal = document.getElementById('apodModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalImage = document.getElementById('modalImage');
const modalVideo = document.getElementById('modalVideo');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

// We keep currently displayed items so we can open the correct one in the modal.
let currentGalleryItems = [];

// We call our own backend endpoint first. The backend keeps the real API key private.
const APOD_PROXY_URL = '/api/apod';

// This direct URL is only a fallback for local classroom testing.
const APOD_DIRECT_URL = 'https://api.nasa.gov/planetary/apod';

// If the backend is unavailable locally, we can still test with a local key file.
const LOCAL_API_KEY = window.NASA_API_KEY || 'DEMO_KEY';

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Listen for button click and load APOD data for the chosen dates
fetchButton.addEventListener('click', () => {
	getApodImages(startInput.value, endInput.value);
});

// Event delegation: one listener handles clicks for all gallery cards.
gallery.addEventListener('click', (event) => {
	if (event.target.closest('.video-link')) {
		return;
	}

	const card = event.target.closest('.gallery-item');

	if (!card) {
		return;
	}

	openModalFromCard(card);
});

// Keyboard support: Enter or Space opens the focused card.
gallery.addEventListener('keydown', (event) => {
	if (event.key !== 'Enter' && event.key !== ' ') {
		return;
	}

	const card = event.target.closest('.gallery-item');

	if (!card) {
		return;
	}

	event.preventDefault();
	openModalFromCard(card);
});

modalCloseBtn.addEventListener('click', closeModal);

// Close when clicking the dark background outside the modal box.
apodModal.addEventListener('click', (event) => {
	if (event.target === apodModal) {
		closeModal();
	}
});

// Escape key closes modal for easier usability.
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !apodModal.hidden) {
		closeModal();
	}
});

function openModalFromCard(card) {
	const itemIndex = Number(card.dataset.index);
	const selectedItem = currentGalleryItems[itemIndex];

	if (!selectedItem) {
		return;
	}

	if (selectedItem.media_type === 'video') {
		modalImage.hidden = true;
		modalVideo.hidden = false;
		modalVideo.src = selectedItem.url;
		modalVideo.title = selectedItem.title;
	} else {
		const largeImageUrl = selectedItem.hdurl || selectedItem.url;
		modalVideo.hidden = true;
		modalImage.hidden = false;
		modalImage.src = largeImageUrl;
		modalImage.alt = selectedItem.title;
	}

	modalTitle.textContent = selectedItem.title;
	modalDate.textContent = `${selectedItem.date} ${selectedItem.media_type === 'video' ? '• Video' : '• Image'}`;
	modalExplanation.textContent = selectedItem.explanation || 'No explanation text available.';

	apodModal.hidden = false;
	document.body.style.overflow = 'hidden';
}

function closeModal() {
	apodModal.hidden = true;
	modalImage.src = '';
	modalVideo.src = '';
	modalVideo.hidden = true;
	modalImage.hidden = false;
	document.body.style.overflow = '';
}

// This helper gets APOD data in two steps:
// 1) Try the secure backend proxy (best option)
// 2) If proxy is unavailable in local development, use direct NASA call as fallback
async function fetchApodData(startDate, endDate) {
	const params = new URLSearchParams({
		start_date: startDate,
		end_date: endDate
	});

	try {
		const proxyResponse = await fetch(`${APOD_PROXY_URL}?${params.toString()}`);

		if (!proxyResponse.ok) {
			throw new Error(`Proxy request failed with status ${proxyResponse.status}`);
		}

		return await proxyResponse.json();
	} catch (proxyError) {
		// Fallback keeps classwork running on a local static server.
		console.warn('Proxy unavailable, using direct NASA fallback.', proxyError);

		const directParams = new URLSearchParams({
			api_key: LOCAL_API_KEY,
			start_date: startDate,
			end_date: endDate,
			thumbs: 'true'
		});

		const directResponse = await fetch(`${APOD_DIRECT_URL}?${directParams.toString()}`);

		if (!directResponse.ok) {
			throw new Error(`NASA request failed with status ${directResponse.status}`);
		}

		return await directResponse.json();
	}
}

async function getApodImages(startDate, endDate) {
	// If modal was open from a previous gallery, close it before new results load.
	closeModal();
	currentGalleryItems = [];

	if (!startDate || !endDate) {
		gallery.innerHTML = '<p class="placeholder">Please choose both a start date and an end date.</p>';
		return;
	}

	if (startDate > endDate) {
		gallery.innerHTML = '<p class="placeholder">Start date must be before or equal to end date.</p>';
		return;
	}

	gallery.innerHTML = '<p class="loading-message">Loading space… please enjoy this scientifically accurate pause.</p>';

	try {
		const apodData = await fetchApodData(startDate, endDate);
		renderGallery(apodData);
	} catch (error) {
		gallery.innerHTML = `<p class="placeholder">Could not load APOD data. ${error.message}</p>`;
	}
}

function renderGallery(items) {
	// API can return one object or an array; we always display an array
	const itemList = Array.isArray(items) ? items : [items];

	// Keep entries users can open: image and video APOD items.
	const mediaList = itemList.filter((item) => item.media_type === 'image' || item.media_type === 'video');

	if (mediaList.length === 0) {
		gallery.innerHTML = '<p class="placeholder">No image or video entries were returned for that date range. Try different dates.</p>';
		return;
	}

	// Show newest items first
	mediaList.sort((a, b) => new Date(b.date) - new Date(a.date));

	// Only display 6 cards so the layout stays at 2 rows x 3 columns.
	const visibleItems = mediaList.slice(0, 6);
	currentGalleryItems = visibleItems;

	const cards = visibleItems.map((item, index) => {
		const isVideo = item.media_type === 'video';
		const imageUrl = item.url || item.hdurl;
		const cardMedia = isVideo
			? `
				<div class="video-preview">
					${item.thumbnail_url ? `<img src="${item.thumbnail_url}" alt="Video preview: ${item.title}" loading="lazy" />` : '<div class="video-fallback">🎬 Video entry</div>'}
					<a class="video-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Watch video</a>
				</div>
			`
			: `<img src="${imageUrl}" alt="${item.title}" loading="lazy" />`;

		return `
			<article class="gallery-item" data-index="${index}" tabindex="0" aria-label="Open details for ${item.title}">
				${cardMedia}
				<h2>${item.title}</h2>
				<p class="gallery-date">${item.date} ${isVideo ? '• Video' : '• Image'}</p>
			</article>
		`;
	});

	gallery.innerHTML = cards.join('');
}
