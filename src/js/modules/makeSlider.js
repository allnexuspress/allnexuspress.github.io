const makeSlider = ($slider) => {
	const $arrowNext = $slider.parentElement.querySelector('.arrow-next');
	const $arrowPrev = $slider.parentElement.querySelector('.arrow-prev');

	let current = $slider.firstElementChild;
	$arrowNext.addEventListener('click', () => {
		const next = current.nextElementSibling;
		if (next) {
			next.scrollIntoView({behavior: "smooth", block: "nearest", inline: "center"});
			current = next;
		}
	});

	$arrowPrev.addEventListener('click', () => {
		const prev = current.previousElementSibling;
		if (prev) {
			prev.scrollIntoView({behavior: "smooth", block: "nearest", inline: "center"});
			current = prev;
		}
	})
};

export default makeSlider;