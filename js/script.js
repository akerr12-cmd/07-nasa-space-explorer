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
const modalVideoPlayer = document.getElementById('modalVideoPlayer');
const modalVideoFallback = document.getElementById('modalVideoFallback');
const modalVideoLink = document.getElementById('modalVideoLink');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');
const randomSpaceFactText = document.getElementById('randomSpaceFact');

// A small fact bank for the "Did You Know?" section.
// We pick one fact at random when the page loads.
const spaceFacts = [
	'The footprints left on the Moon can last for millions of years because there is no wind or rain there.',
	'A day on Venus is longer than a year on Venus. It spins very slowly but orbits the Sun faster.',
	'Neutron stars are so dense that one teaspoon of their material would weigh about a billion tons on Earth.',
	'Jupiter is so large that more than 1,300 Earths could fit inside it.',
	'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
	'The International Space Station travels around Earth at about 17,500 miles per hour.'
];

// Save the cards currently shown in the gallery (up to 9).
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

// Show one random fact each time the page is refreshed.
showRandomSpaceFact();

// Function: showRandomSpaceFact
// What it does:
// - Picks one fact from the spaceFacts array.
// - Writes that fact into the "Did You Know?" paragraph.
// Why we check first:
// - If the paragraph is missing from HTML, we exit early to avoid errors.
function showRandomSpaceFact() {
	if (!randomSpaceFactText) {
		return;
	}

	// Math.random() gives a number from 0 up to (but not including) 1.
	// Multiplying by array length and flooring gives a valid random index.
	const randomIndex = Math.floor(Math.random() * spaceFacts.length);
	randomSpaceFactText.textContent = spaceFacts[randomIndex];
}

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

// Function: openModalFromCard
// Input:
// - card: the gallery card element the user clicked.
// What it does:
// - Reads the card's data-index to find the matching APOD item in currentGalleryItems.
// - Shows image mode or video mode in the modal.
// - Fills in title, date, and explanation text.
// - Opens the modal and prevents page scrolling.
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
		const videoSource = getModalVideoSource(selectedItem.url);

		modalImage.hidden = true;
		modalVideo.hidden = true;
		modalVideoPlayer.hidden = true;
		modalVideoFallback.hidden = true;

		if (videoSource.type === 'embed') {
			modalVideo.hidden = false;
			modalVideo.src = videoSource.url;
			modalVideo.title = selectedItem.title;
		} else if (videoSource.type === 'file') {
			modalVideoPlayer.hidden = false;
			modalVideoPlayer.src = videoSource.url;
		} else {
			modalVideoFallback.hidden = false;
			modalVideoLink.href = selectedItem.url || '#';
		}
	} else {
		const largeImageUrl = selectedItem.hdurl || selectedItem.url;
		modalVideo.hidden = true;
		modalVideoPlayer.hidden = true;
		modalVideoFallback.hidden = true;
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

// Function: closeModal
// What it does:
// - Hides the modal window.
// - Clears image/video sources so old media is not kept in memory.
// - Resets modal elements to their default hidden/visible state.
// - Re-enables page scrolling.
function closeModal() {
	// Reset modal back to a clean state each time it closes.
	apodModal.hidden = true;
	modalImage.src = '';
	modalVideo.src = '';
	modalVideoPlayer.src = '';
	modalVideoLink.href = '#';
	modalVideo.hidden = true;
	modalVideoPlayer.hidden = true;
	modalVideoFallback.hidden = true;
	modalImage.hidden = false;
	document.body.style.overflow = '';
}

// Function: getModalVideoSource
// Input:
// - rawUrl: video URL from the APOD response.
// Output:
// - Object with { type, url } where type is:
//   - 'embed' for iframe-friendly links (YouTube/Vimeo)
//   - 'file' for direct video files like .mp4
//   - 'unsupported' when we cannot safely embed/play inline
// Why this exists:
// - APOD video links come in different formats, so we normalize them first.
function getModalVideoSource(rawUrl) {
	if (!rawUrl) {
		return { type: 'unsupported', url: '' };
	}

	const url = rawUrl.trim();

	// Direct video files should use the HTML5 <video> element.
	if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) {
		return { type: 'file', url };
	}

	// YouTube URL support.
	const youtubeEmbedMatch = url.match(/youtube\.com\/embed\/([^?&/]+)/i);
	if (youtubeEmbedMatch && youtubeEmbedMatch[1]) {
		return { type: 'embed', url: `https://www.youtube.com/embed/${youtubeEmbedMatch[1]}?rel=0` };
	}

	const youtubeWatchMatch = url.match(/youtube\.com\/watch\?v=([^?&/]+)/i);
	if (youtubeWatchMatch && youtubeWatchMatch[1]) {
		return { type: 'embed', url: `https://www.youtube.com/embed/${youtubeWatchMatch[1]}?rel=0` };
	}

	const youtubeShortMatch = url.match(/youtu\.be\/([^?&/]+)/i);
	if (youtubeShortMatch && youtubeShortMatch[1]) {
		return { type: 'embed', url: `https://www.youtube.com/embed/${youtubeShortMatch[1]}?rel=0` };
	}

	// Vimeo URL support.
	const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
	if (vimeoMatch && vimeoMatch[1]) {
		return { type: 'embed', url: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
	}

	return { type: 'unsupported', url };
}

// Fetch helper:
// 1) try the proxy first
// 2) if proxy fails locally, fall back to direct NASA call
// Function: fetchApodData
// Input:
// - startDate and endDate (YYYY-MM-DD strings from date inputs)
// Output:
// - APOD JSON data (array or single object depending on API response)
// What it does:
// - Builds query parameters.
// - Tries the backend proxy first (safer API key handling).
// - If proxy is unavailable, uses direct NASA call as fallback.
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

// Function: getApodImages
// Input:
// - startDate and endDate from the user.
// What it does:
// - Resets modal/gallery state for a fresh load.
// - Validates date input.
// - Shows a loading message.
// - Requests APOD data and passes it to renderGallery.
// - Shows a readable error message if something fails.
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

// Function: getVideoPreviewUrl
// Input:
// - item: one APOD object.
// Output:
// - A thumbnail image URL string, or '' if none is available.
// What it does:
// - Uses NASA thumbnail_url first when present.
// - If missing, tries to build a YouTube thumbnail URL from known formats.
function getVideoPreviewUrl(item) {
	// First choice: use NASA-provided thumbnail when available.
	if (item.thumbnail_url) {
		return item.thumbnail_url;
	}

	if (!item.url) {
		return '';
	}

	// Backup for common YouTube formats when thumbnail_url is missing.
	const youtubePatterns = [
		/youtube\.com\/embed\/([^?&/]+)/i,
		/youtube\.com\/watch\?v=([^?&/]+)/i,
		/youtu\.be\/([^?&/]+)/i
	];

	for (const pattern of youtubePatterns) {
		const match = item.url.match(pattern);

		if (match && match[1]) {
			return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
		}
	}

	return '';
}

// Function: isDirectVideoFileUrl
// Input:
// - url: any URL string.
// Output:
// - true if the URL looks like a direct video file (.mp4/.webm/.ogg), else false.
// Why this helps:
// - Direct video files can be previewed with <video> instead of needing a thumbnail image.
function isDirectVideoFileUrl(url) {
	if (!url) {
		return false;
	}

	return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
}

// Function: renderGallery
// Input:
// - items: APOD response (array or single object).
// What it does:
// - Normalizes data into an array.
// - Keeps only media types our UI supports (image/video).
// - Sorts newest to oldest and limits to 9 cards.
// - Builds the HTML for each card (image preview or video preview/fallback).
// - Stores visible items in currentGalleryItems so modal clicks can find full data.
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

	// Limit to 9 cards to match the project rubric requirement.
	const visibleItems = mediaList.slice(0, 9);
	currentGalleryItems = visibleItems;

	const cards = visibleItems.map((item, index) => {
		// Build card media section:
		// - video card gets thumbnail (if available) + modal hint
		// - image card gets normal image element
		const isVideo = item.media_type === 'video';
		const imageUrl = item.url || item.hdurl;
		const videoPreviewUrl = isVideo ? getVideoPreviewUrl(item) : '';
		const canUseInlineVideoPreview = isVideo && !videoPreviewUrl && isDirectVideoFileUrl(item.url);
		const cardMedia = isVideo
			? `
				<div class="video-preview">
					${videoPreviewUrl
						? `<img src="${videoPreviewUrl}" alt="Video preview: ${item.title}" loading="lazy" />`
						: canUseInlineVideoPreview
							? `<video src="${item.url}" preload="metadata" autoplay muted playsinline loop aria-label="Video preview: ${item.title}"></video>`
							: '<div class="video-fallback">Video preview unavailable</div>'}
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
