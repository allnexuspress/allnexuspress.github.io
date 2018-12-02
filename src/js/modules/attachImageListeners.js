import { $view, $lightbox } from '../constants';

let lightbox = false;
let x2 = false;
let viewClass;

const attachImageListeners = () => {
	const $images = Array.from(document.querySelectorAll('.article-image'));

	$images.forEach(img => {
		img.addEventListener('click', (evt) => {
			if (!lightbox) {
				$lightbox.classList.add('show-img');
				$view.src = img.src;
				lightbox = true;
			}
		});
	});

	$lightbox.addEventListener('click', (evt) => {
		if (evt.target === $view) return;
		$lightbox.classList.remove('show-img');
		lightbox = false;
	});

	$view.addEventListener('click', () => {
		if (!x2) {
			viewClass = $view.width < window.innerWidth ? 'view-x2--sm' : 'view-x2';
			$view.classList.add(viewClass);
			setTimeout(() => x2 = true, 300);
		} else {
			$view.classList.remove(viewClass);
			$lightbox.classList.remove('show-img');
			x2 = false;
			lightbox = false;
		}
	});
};

export default attachImageListeners;