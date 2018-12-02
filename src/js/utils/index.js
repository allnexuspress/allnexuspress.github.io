import { $loading, $nav, $parallax, $content, $title, $arrow, $modal, $lightbox, $view } from '../constants';

const debounce = (fn, time) => {
  let timeout;

  return function() {
    const functionCall = () => fn.apply(this, arguments);
    
    clearTimeout(timeout);
    timeout = setTimeout(functionCall, time);
  }
};

const hideLoading = () => {
	$loading.forEach(elem => elem.classList.add('ready'));
	$nav.classList.add('ready');
};

const scrollToTop = () => {
	let top = document.getElementById('anchor-target');
	top.scrollIntoView({behavior: "smooth", block: "start"});
};

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

export { debounce, hideLoading, scrollToTop, makeSlider };