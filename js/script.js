// This is the main file for the APOD page.
// Big picture:
// 1) read the dates the user picked
// 2) request APOD data
// 3) build the gallery cards
// 4) open a modal when a card is clicked

// Grab all the page elements we need so we can update them with JavaScript.
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

// Save the 6 cards currently shown in the gallery.
// Each card stores an index, so we use this array to find the full data later.
let currentGalleryItems = [];

// First choice: call our backend proxy (safer because key stays on server).
const APOD_PROXY_URL = '/api/apod';

// Backup choice: call NASA directly (mostly for local classroom testing).
const APOD_DIRECT_URL = 'https://api.nasa.gov/planetary/apod';

// Local key from js/config.js. If it is missing, use NASA DEMO_KEY.
const LOCAL_API_KEY = window.NASA_API_KEY || 'DEMO_KEY';

// Set up date input rules/defaults from dateRange.js.
setupDateInputs(startInput, endInput);

// Button click starts the APOD request using the selected date range.
fetchButton.addEventListener('click', () => {
	getApodImages(startInput.value, endInput.value);
});

// One click listener handles all cards, including cards added later.
// This works well because cards are generated dynamically.
gallery.addEventListener('click', (event) => {
	const card = event.target.closest('.gallery-item');

	if (!card) {
		return;
	}

	openModalFromCard(card);
});

// Keyboard support: Enter or Space opens the selected card in the modal.
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

// Close modal when the dark background is clicked.
apodModal.addEventListener('click', (event) => {
	if (event.target === apodModal) {
		closeModal();
	}
});

// Escape key closes the modal too.
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !apodModal.hidden) {
		closeModal();
	}
});

function openModalFromCard(card) {
	// Get the clicked card index and find the real APOD object.
	const itemIndex = Number(card.dataset.index);
	const selectedItem = currentGalleryItems[itemIndex];

	if (!selectedItem) {
		return;
	}

	// APOD entries can be image or video.
	// We show exactly one media type at a time in the modal.
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

	// Fill in the text fields under the media.
	modalTitle.textContent = selectedItem.title;
	modalDate.textContent = `${selectedItem.date} ${selectedItem.media_type === 'video' ? '• Video' : '• Image'}`;
	modalExplanation.textContent = selectedItem.explanation || 'No explanation text available.';

	// Show modal and stop background scrolling while it is open.
	apodModal.hidden = false;
	document.body.style.overflow = 'hidden';
}

function closeModal() {
	// Reset modal back to a clean state each time it closes.
	apodModal.hidden = true;
	modalImage.src = '';
	modalVideo.src = '';
	modalVideo.hidden = true;
	modalImage.hidden = false;
	document.body.style.overflow = '';
}

// Fetch helper:
// 1) try the proxy first
// 2) if proxy fails locally, fall back to direct NASA call
async function fetchApodData(startDate, endDate) {
	// Build query string for start/end dates.
	const params = new URLSearchParams({
		start_date: startDate,
		end_date: endDate
	});

	try {
		// Best path: backend proxy keeps key private.
		const proxyResponse = await fetch(`${APOD_PROXY_URL}?${params.toString()}`);

		if (!proxyResponse.ok) {
			throw new Error(`Proxy request failed with status ${proxyResponse.status}`);
		}

		return await proxyResponse.json();
	} catch (proxyError) {
		// Fallback for local/static runs.
		// Uses LOCAL_API_KEY from config.js (or DEMO_KEY).
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
	// Close old modal state before loading a fresh gallery.
	closeModal();
	currentGalleryItems = [];

	// Must have both dates selected.
	if (!startDate || !endDate) {
		gallery.innerHTML = '<p class="placeholder">Please choose both a start date and an end date.</p>';
		return;
	}

	// Start date cannot be after end date.
	if (startDate > endDate) {
		gallery.innerHTML = '<p class="placeholder">Start date must be before or equal to end date.</p>';
		return;
	}

	// Show loading message while waiting for API response.
	gallery.innerHTML = '<p class="loading-message">Loading space… please enjoy this scientifically accurate pause.</p>';

	try {
		const apodData = await fetchApodData(startDate, endDate);
		renderGallery(apodData);
	} catch (error) {
		gallery.innerHTML = `<p class="placeholder">Could not load APOD data. ${error.message}</p>`;
	}
}

function renderGallery(items) {
	// APOD can return one item or an array.
	// Convert everything to an array so rendering is simpler.
	const itemList = Array.isArray(items) ? items : [items];

	// Keep only media types our UI can display.
	const mediaList = itemList.filter((item) => item.media_type === 'image' || item.media_type === 'video');

	if (mediaList.length === 0) {
		gallery.innerHTML = '<p class="placeholder">No image or video entries were returned for that date range. Try different dates.</p>';
		return;
	}

	// Newest first so users see latest APOD at top.
	mediaList.sort((a, b) => new Date(b.date) - new Date(a.date));

	// Limit to 6 cards (2 rows x 3 columns on desktop layout).
	const visibleItems = mediaList.slice(0, 6);
	currentGalleryItems = visibleItems;

	const cards = visibleItems.map((item, index) => {
		// Build card media section:
		// - video card gets thumbnail (if available) + modal hint
		// - image card gets normal image element
		const isVideo = item.media_type === 'video';
		const imageUrl = item.url || item.hdurl;
		const cardMedia = isVideo
			? `
				<div class="video-preview">
					${item.thumbnail_url ? `<img src="${item.thumbnail_url}" alt="Video preview: ${item.title}" loading="lazy" />` : '<div class="video-fallback">🎬 Video entry</div>'}
					<p class="video-label">Click to open video in modal</p>
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
